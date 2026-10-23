// @ts-check
/**
 * Build small Anki decks (.apkg) for tests. Real decks from ankiweb.net are other people's work
 * and stay out of this public repository – see fixtures/local/ for the ones tested locally.
 *
 * The database is written with sql.js in Anki's layout, with only the tables and columns
 * Vokabulator reads: schema 11 (collection.anki2 / .anki21) or schema 18 (collection.anki21b,
 * zstd-compressed, names with Anki's own "COLLATE unicase"). Node only (node:zlib).
 */
import { constants, zstdCompressSync } from 'node:zlib';
import initSqlJs from 'sql.js';
import { makeZip } from './make-zip.js';

/**
 * @typedef {object} DeckSpec
 * @property {{ id: number, name: string, fields: string[] }[]} noteTypes
 * @property {{ id: number, path: string[] }[]} decks
 * @property {{ noteType: number, fields: string[], deck: number, homeDeck?: number }[]} notes
 *   deck: where the note's card is; homeDeck: the card's own deck while it sits in a filtered deck
 */

/** What Anki ≥ 2.1.50 puts next to the real database, for older versions to show. */
const PLACEHOLDER = /** @type {DeckSpec} */ ({
	noteTypes: [{ id: 1, name: 'Basic', fields: ['Front', 'Back'] }],
	decks: [{ id: 1, path: ['Default'] }],
	notes: [
		{
			noteType: 1,
			fields: ['Please update to the latest Anki version, then import the .apkg file again.', ''],
			deck: 1
		}
	]
});

/** @type {Promise<import('sql.js').SqlJsStatic> | undefined} */
let sqlJs;

/**
 * The SQLite database of a deck.
 * @param {DeckSpec} spec
 * @param {11 | 18} schema
 * @returns {Promise<Uint8Array<ArrayBuffer>>}
 */
export async function makeDatabase({ noteTypes, decks, notes }, schema) {
	const SQL = await (sqlJs ??= initSqlJs());
	const db = new SQL.Database();
	db.run(`
		CREATE TABLE col (id integer PRIMARY KEY, ver integer NOT NULL, models text NOT NULL, decks text NOT NULL);
		CREATE TABLE notes (id integer PRIMARY KEY, mid integer NOT NULL, flds text NOT NULL);
		CREATE TABLE cards (id integer PRIMARY KEY, nid integer NOT NULL, did integer NOT NULL,
			ord integer NOT NULL, odid integer NOT NULL);`);

	if (schema === 11) {
		const models = Object.fromEntries(
			noteTypes.map(({ id, name, fields }) => [
				id,
				// listed last field first: the order is in "ord"
				{ id, name, type: 0, flds: fields.map((field, ord) => ({ name: field, ord })).reverse() }
			])
		);
		const deckJson = Object.fromEntries(
			decks.map(({ id, path }) => [id, { id, name: path.join('::') }])
		);
		db.run('INSERT INTO col VALUES (1, 11, ?, ?)', [
			JSON.stringify(models),
			JSON.stringify(deckJson)
		]);
	} else {
		// Anki's schema with "COLLATE unicase" – SQLite would not even create that, so the tables
		// are made with NOCASE and the definitions changed afterwards (as in Anki's files)
		db.run(`
			INSERT INTO col VALUES (1, 18, '', '');
			CREATE TABLE notetypes (id integer NOT NULL PRIMARY KEY, name text NOT NULL COLLATE NOCASE,
				config blob NOT NULL);
			CREATE UNIQUE INDEX idx_notetypes_name ON notetypes (name);
			CREATE TABLE fields (ntid integer NOT NULL, ord integer NOT NULL,
				name text NOT NULL COLLATE NOCASE, config blob NOT NULL, PRIMARY KEY (ntid, ord)) WITHOUT ROWID;
			CREATE UNIQUE INDEX idx_fields_name_ntid ON fields (name, ntid);
			CREATE TABLE decks (id integer PRIMARY KEY NOT NULL, name text NOT NULL COLLATE NOCASE,
				common blob NOT NULL, kind blob NOT NULL);
			CREATE UNIQUE INDEX idx_decks_name ON decks (name);`);
		for (const { id, name, fields } of noteTypes) {
			db.run("INSERT INTO notetypes VALUES (?, ?, x'')", [id, name]);
			fields.forEach((field, ord) =>
				db.run("INSERT INTO fields VALUES (?, ?, ?, x'')", [id, ord, field])
			);
		}
		for (const { id, path } of decks) {
			db.run("INSERT INTO decks VALUES (?, ?, x'', x'')", [id, path.join('\x1f')]);
		}
		db.run(`
			PRAGMA writable_schema = ON;
			UPDATE sqlite_master SET sql = replace(sql, 'COLLATE NOCASE', 'COLLATE unicase');
			PRAGMA writable_schema = RESET;`);
	}

	notes.forEach(({ noteType, fields, deck, homeDeck = 0 }, i) => {
		db.run('INSERT INTO notes VALUES (?, ?, ?)', [1000 + i, noteType, fields.join('\x1f')]);
		db.run('INSERT INTO cards VALUES (?, ?, ?, 0, ?)', [2000 + i, 1000 + i, deck, homeDeck]);
	});

	const data = db.export();
	db.close();
	return /** @type {Uint8Array<ArrayBuffer>} */ (data);
}

/**
 * A whole .apkg in the layout of one Anki version, named after its database file:
 *   anki2    old decks: only collection.anki2
 *   anki21   "support older Anki versions" (and AnkiWeb): deflated collection.anki21 + a placeholder
 *   anki21b  newest: zstd-compressed collection.anki21b + a placeholder, everything stored
 * @param {DeckSpec} spec
 * @param {'anki2' | 'anki21' | 'anki21b'} format
 * @returns {Promise<Blob>}
 */
export async function makeApkg(spec, format) {
	const text = (/** @type {string} */ value) => new TextEncoder().encode(value);
	if (format === 'anki2') {
		return makeZip([
			{ name: 'collection.anki2', data: await makeDatabase(spec, 11), deflate: true },
			{ name: 'media', data: text('{}'), deflate: true }
		]);
	}
	const placeholder = await makeDatabase(PLACEHOLDER, 11);
	if (format === 'anki21') {
		return makeZip([
			{ name: 'meta', data: new Uint8Array([0x08, 0x02]) },
			{ name: 'collection.anki21', data: await makeDatabase(spec, 11), deflate: true },
			{ name: 'collection.anki2', data: placeholder },
			{ name: 'media', data: text('{}') }
		]);
	}
	return makeZip([
		{ name: 'meta', data: new Uint8Array([0x08, 0x03]) },
		{ name: 'collection.anki21b', data: zstd(await makeDatabase(spec, 18)) },
		{ name: 'collection.anki2', data: placeholder },
		{ name: 'media', data: zstd(new Uint8Array()) }
	]);
}

/**
 * Compress like Anki: without the unpacked size in the frame header.
 * @param {Uint8Array<ArrayBuffer>} data
 */
function zstd(data) {
	return new Uint8Array(
		zstdCompressSync(data, { params: { [constants.ZSTD_c_contentSizeFlag]: 0 } })
	);
}
