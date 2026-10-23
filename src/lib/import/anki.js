// @ts-check
/**
 * Import an Anki deck (.apkg): the free, ready-made decks from ankiweb.net and whatever
 * people export from Anki or AnkiDroid.
 *
 * An .apkg is a ZIP (zip.js) with the deck as an SQLite database inside, read with sql.js
 * (SQLite as WebAssembly, loaded only for this). Which database depends on the Anki version
 * that wrote the file:
 *
 *   collection.anki21b   newest format: zstd-compressed (fzstd unpacks it), schema 18
 *   collection.anki21    schema 11 ("support older Anki versions"; also what AnkiWeb hands out)
 *   collection.anki2     schema 11, old decks – next to one of the above only a placeholder
 *
 * Anki stores "notes" (one word with its fields, e.g. Vorderseite / Rückseite) and makes
 * "cards" out of them (e.g. both directions). We read the notes: each one becomes a row of an
 * ImportTable (table.js), its fields the cells, its deck below the common root the group path.
 * There is one table per note type, because every note type has its own fields.
 *
 *   .apkg → zip.js → (fzstd) → sql.js → note types, decks, notes → TableImport
 */

import { slugify } from '../model.js';
import { ImportError } from './import-error.js';
import { listZip, readZipEntry } from './zip.js';

/** @typedef {import('./table.js').ImportTable} ImportTable */
/** @typedef {import('./table.js').TableImport} TableImport */
/** @typedef {import('sql.js').SqlJsStatic} SqlJsStatic */
/** @typedef {import('sql.js').Database} Database */

/**
 * What we need from a deck's database.
 * @typedef {object} Collection
 * @property {Map<number, { name: string, fields: string[] }>} noteTypes  by id
 * @property {Map<number, string[]>} decks  id → path, e.g. ["Latein Campus A", "Lektion 1"]
 * @property {{ noteType: number, fields: string[], deck: number }[]} notes  oldest first
 */

/** The database files, best first (see above). */
const DATABASES = ['collection.anki21b', 'collection.anki21', 'collection.anki2'];

/** A bigger database would not fit into a phone's memory (the 5000 French words: 33 MB). */
const MAX_SIZE = 200 * 1024 * 1024;

/** Cloze ("Lückentext") and image occlusion notes have no word with a meaning. */
const CLOZE = /\{\{c\d+::/;

/** Anki's "Default" deck – a name nobody chose, so the file name is the better title. */
const DEFAULT_DECK = 1;

const NOT_ANKI = 'Das ist kein Anki-Deck. 🤔';
const UNREADABLE = 'Dieses Anki-Deck konnte ich nicht lesen. 😕';
const OFFLINE = 'Zum Lesen von Anki-Decks brauchst du kurz Internet. 📡';
const TOO_BIG = 'Dieses Anki-Deck ist zu groß für Vokabulator. 😕';

/** @type {Promise<SqlJsStatic> | undefined} */
let sqlJs;

/**
 * Load sql.js in the browser, once. The .wasm comes from our own server, and we fetch it
 * ourselves: sql.js would remember a failed start (e.g. offline) until the page is reloaded,
 * here the next import simply tries again. Tests use sql.js for Node instead.
 * @returns {Promise<SqlJsStatic>}
 */
export function loadSqlJs() {
	sqlJs ??= startSqlJs().catch((error) => {
		sqlJs = undefined;
		throw error;
	});
	return sqlJs;
}

async function startSqlJs() {
	const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
		import('sql.js'),
		import('sql.js/dist/sql-wasm-browser.wasm?url')
	]);
	const response = await fetch(wasmUrl);
	if (!response.ok) throw new Error(`sql.js: ${response.status}`);
	return initSqlJs({ wasmBinary: await response.arrayBuffer() });
}

/**
 * @param {Blob} file  the .apkg
 * @param {string} fileName  the title, if the deck has no name of its own
 * @param {{ loadSqlJs?: () => Promise<SqlJsStatic> }} [deps]  replaced in tests
 * @returns {Promise<TableImport>}  one table per note type, the biggest first
 */
export async function readApkg(file, fileName, deps = {}) {
	const { loadSqlJs: load = loadSqlJs } = deps;

	const data = await readDatabase(file);
	let sql;
	try {
		sql = await load();
	} catch {
		throw new ImportError(OFFLINE);
	}
	let collection;
	try {
		collection = readCollection(new sql.Database(data));
	} catch {
		throw new ImportError(UNREADABLE);
	}

	const result = toTables(collection, fileName);
	if (result.tables.length === 0) {
		throw new ImportError(
			'In diesem Deck habe ich keine Vokabeln gefunden – Lückentext- und Bildkarten gehen leider nicht. 😕'
		);
	}
	return result;
}

/**
 * Turn Anki's HTML into plain text: line breaks and blocks become "; " (Anki writes
 * "a<div>b</div>" for two lines), sounds and pictures disappear, entities are decoded.
 * Simple patterns instead of a DOM parser, so this also runs in tests without a browser.
 * @param {string} html
 */
export function htmlToText(html) {
	return html
		.replace(/\[sound:[^\]]*\]/g, '')
		.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/<\/?(br|div|p|li|tr)\b[^>]*>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, decodeEntity)
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter(Boolean)
		.join('; ');
}

/** @type {Record<string, string>} */
const ENTITIES = {
	nbsp: ' ',
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	auml: 'ä',
	ouml: 'ö',
	uuml: 'ü',
	Auml: 'Ä',
	Ouml: 'Ö',
	Uuml: 'Ü',
	szlig: 'ß'
};

/**
 * @param {string} match  e.g. "&amp;" or "&#257;"
 * @param {string} name   e.g. "amp" or "#257"
 */
function decodeEntity(match, name) {
	if (!name.startsWith('#')) return ENTITIES[name] ?? match;
	const code = /^#x/i.test(name) ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
	return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
}

/**
 * The deck's database, unpacked.
 * @param {Blob} file
 */
async function readDatabase(file) {
	try {
		const entries = await listZip(file);
		const entry = DATABASES.map((name) => entries.find((e) => e.name === name)).find(Boolean);
		if (!entry) throw new ImportError(NOT_ANKI);
		if (entry.size > MAX_SIZE) throw new ImportError(TOO_BIG);

		const data = await readZipEntry(file, entry);
		if (entry.name !== 'collection.anki21b') return data;
		// no output buffer: Anki does not write the unpacked size into the zstd frame
		const { decompress } = await import('fzstd');
		const unpacked = decompress(data);
		if (unpacked.length > MAX_SIZE) throw new ImportError(TOO_BIG);
		return unpacked;
	} catch (e) {
		if (e instanceof ImportError) throw e;
		throw new ImportError(UNREADABLE);
	}
}

/**
 * @param {Database} db  closed afterwards
 * @returns {Collection}
 */
function readCollection(db) {
	try {
		forgetUnicase(db);
		const version = Number(rows(db, 'SELECT ver FROM col')[0][0]);
		const { noteTypes, decks } = version >= 15 ? readTables(db) : readJson(db);
		// a note's deck is the deck of its first card – or that card's home deck while it sits in
		// a filtered deck (odid)
		const notes = rows(
			db,
			`SELECT n.mid, n.flds, (
				SELECT CASE c.odid WHEN 0 THEN c.did ELSE c.odid END
				FROM cards c WHERE c.nid = n.id ORDER BY c.ord LIMIT 1
			) FROM notes n ORDER BY n.id`
		).map(([mid, flds, deck]) => ({
			noteType: Number(mid),
			fields: String(flds).split('\x1f'),
			deck: Number(deck)
		}));
		return { noteTypes, decks, notes };
	} finally {
		db.close();
	}
}

/**
 * Since schema 15, Anki compares names with a rule of its own ("COLLATE unicase") that only
 * Anki knows: SQLite refuses every query that touches such a column ("no such collation
 * sequence"). We drop the rule from the table definitions of our copy in memory.
 * @param {Database} db
 */
function forgetUnicase(db) {
	db.run(`PRAGMA writable_schema = ON;
		UPDATE sqlite_master SET sql = replace(sql, ' COLLATE unicase', '') WHERE sql LIKE '%COLLATE unicase%';
		PRAGMA writable_schema = RESET;`);
}

/**
 * Schema 18 (since 15): note types, their fields and the decks have tables of their own.
 * Deck names keep the levels apart with "\x1f".
 * @param {Database} db
 */
function readTables(db) {
	/** @type {Collection['noteTypes']} */
	const noteTypes = new Map(
		rows(db, 'SELECT id, name FROM notetypes').map(([id, name]) => [
			Number(id),
			{ name: String(name), fields: [] }
		])
	);
	for (const [noteType, name] of rows(db, 'SELECT ntid, name FROM fields ORDER BY ntid, ord')) {
		noteTypes.get(Number(noteType))?.fields.push(String(name));
	}
	/** @type {Collection['decks']} */
	const decks = new Map(
		rows(db, 'SELECT id, name FROM decks').map(([id, name]) => [
			Number(id),
			String(name).split('\x1f')
		])
	);
	return { noteTypes, decks };
}

/**
 * Schema 11: note types ("models") and decks are JSON in the one row of the col table.
 * Deck names keep the levels apart with "::".
 * @param {Database} db
 */
function readJson(db) {
	const [models, decks] = rows(db, 'SELECT models, decks FROM col')[0].map(
		(json) => /** @type {Record<string, any>} */ (JSON.parse(String(json)))
	);
	return {
		/** @type {Collection['noteTypes']} */
		noteTypes: new Map(
			Object.entries(models).map(([id, model]) => [
				Number(id),
				{
					name: String(model.name),
					fields: /** @type {{ name: string, ord: number }[]} */ (model.flds)
						.toSorted((a, b) => a.ord - b.ord)
						.map((field) => field.name)
				}
			])
		),
		/** @type {Collection['decks']} */
		decks: new Map(
			Object.entries(decks).map(([id, deck]) => [Number(id), String(deck.name).split('::')])
		)
	};
}

/**
 * @param {Database} db
 * @param {string} query
 */
function rows(db, query) {
	return db.exec(query)[0]?.values ?? [];
}

/**
 * One table per note type with usable notes, the biggest first.
 *
 * The root is the deepest deck that holds all notes, e.g. "Latein Campus A": its name is the
 * title, the decks below it are the rows' paths. The id contains the deck's and the note
 * type's id (Anki makes them unique), so importing the same deck again updates the lesson.
 *
 * @param {Collection} collection
 * @param {string} fileName
 * @returns {TableImport}
 */
function toTables({ noteTypes, decks, notes }, fileName) {
	const root = commonStart(notes.map((note) => decks.get(note.deck) ?? []));
	const rootId = [...decks].find(([, path]) => path.join('\x1f') === root.join('\x1f'))?.[0];
	const named = root.length > 0 && rootId !== undefined && rootId !== DEFAULT_DECK;
	const title = named ? /** @type {string} */ (root.at(-1)) : titleOf(fileName);
	const deckKey = named ? String(rootId) : slugify(title);

	/** @type {Map<number, ImportTable>} */
	const tables = new Map();
	let skipped = 0;
	for (const note of notes) {
		const type = noteTypes.get(note.noteType);
		if (!type || type.fields.length < 2 || note.fields.some((field) => CLOZE.test(field))) {
			skipped++;
			continue;
		}
		let table = tables.get(note.noteType);
		if (!table) {
			table = {
				id: `anki-${deckKey}-${note.noteType}`,
				title: type.name,
				source: { type: 'file', name: fileName },
				columns: type.fields,
				rows: []
			};
			tables.set(note.noteType, table);
		}
		table.rows.push({
			path: (decks.get(note.deck) ?? []).slice(root.length),
			cells: type.fields.map((_, i) => htmlToText(note.fields[i] ?? ''))
		});
	}

	const sorted = [...tables.values()].toSorted((a, b) => b.rows.length - a.rows.length);
	for (const table of sorted) {
		table.title = sorted.length === 1 ? title : `${title} – ${table.title}`;
	}
	return { tables: sorted, skipped };
}

/**
 * The part all paths start with: [["A", "B"], ["A", "C"]] → ["A"].
 * @param {string[][]} paths
 */
function commonStart(paths) {
	const [first = [], ...others] = paths;
	let length = first.length;
	for (const path of others) {
		while (
			length > 0 &&
			path.slice(0, length).join('\x1f') !== first.slice(0, length).join('\x1f')
		) {
			length--;
		}
	}
	return first.slice(0, length);
}

/**
 * A title from the file name: "Latein_Campus_A.apkg" → "Latein Campus A".
 * @param {string} fileName
 */
function titleOf(fileName) {
	return (
		fileName
			.replace(/\.[^.]*$/, '')
			.replace(/_+/g, ' ')
			.trim() || 'Anki-Deck'
	);
}
