import { existsSync, openAsBlob } from 'node:fs';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';
import { htmlToText, readApkg } from './anki.js';
import { makeApkg, makeDatabase } from './fixtures/make-apkg.js';
import { makeZip } from './fixtures/make-zip.js';
import { ImportError } from './import-error.js';
import { tableToDraft } from './table.js';

/** @typedef {import('./fixtures/make-apkg.js').DeckSpec} DeckSpec */

// sql.js for Node finds its .wasm by itself
const deps = { loadSqlJs: () => initSqlJs() };

describe('htmlToText', () => {
	it.each([
		['servare', 'servare'],
		['<div><div>Wald<br></div></div>', 'Wald'],
		['<br>Āfrica', 'Āfrica'],
		['nehmen<div>ergreifen</div>', 'nehmen; ergreifen'],
		['nehmen;  erobern', 'nehmen; erobern'],
		['der&nbsp;Hund', 'der Hund'],
		['Tom &amp; Jerry &lt;3', 'Tom & Jerry <3'],
		['capi&#333; &#x101;', 'capiō ā'],
		['M&uuml;he &unknown;', 'Mühe &unknown;'],
		['<b>el</b> <i>perro</i>', 'el perro'],
		['chien [sound:chien.mp3]', 'chien'],
		['<img src="hund.jpg">', ''],
		['<style>.card { color: red }</style>Hund', 'Hund'],
		['eins<br />zwei<p>drei</p>', 'eins; zwei; drei']
	])('%s → %s', (html, text) => {
		expect(htmlToText(html)).toBe(text);
	});
});

/** A small Spanish deck: two lessons, a cloze note and a card in a filtered deck. */
const spanish = /** @type {DeckSpec} */ ({
	noteTypes: [
		{ id: 200, name: 'Einfach', fields: ['Wort', 'Bedeutung', 'Audio'] },
		{ id: 201, name: 'Lückentext', fields: ['Text', 'Rückseite Extra'] }
	],
	decks: [
		{ id: 1, path: ['Default'] },
		{ id: 100, path: ['Spanisch'] },
		{ id: 101, path: ['Spanisch', 'Lektion 1'] },
		{ id: 102, path: ['Spanisch', 'Lektion 2'] },
		{ id: 103, path: ['Gefiltertes Deck 1'] }
	],
	notes: [
		{ noteType: 200, fields: ['el perro', 'der Hund', '[sound:perro.mp3]'], deck: 101 },
		{ noteType: 200, fields: ['el <b>gato</b>', 'die Katze<br>', ''], deck: 101 },
		{ noteType: 201, fields: ['{{c1::la casa}} ist das Haus', ''], deck: 101 },
		{ noteType: 200, fields: ['la mesa', 'der Tisch', ''], deck: 103, homeDeck: 102 },
		{ noteType: 200, fields: ['la silla', 'der Stuhl', ''], deck: 102 }
	]
});

describe.each(/** @type {const} */ (['anki2', 'anki21', 'anki21b']))(
	'readApkg with a %s deck',
	(format) => {
		it('reads the notes as one table, the subdecks as paths', async () => {
			const { tables, skipped } = await readApkg(
				await makeApkg(spanish, format),
				'spanisch.apkg',
				deps
			);
			expect(tables).toHaveLength(1); // the cloze note type has no usable notes
			expect(skipped).toBe(1);
			const [table] = tables;
			expect(table.id).toBe('anki-100-200');
			expect(table.title).toBe('Spanisch');
			expect(table.source).toEqual({ type: 'file', name: 'spanisch.apkg' });
			// in the order of their "ord" – not the order of the JSON or of the name index
			expect(table.columns).toEqual(['Wort', 'Bedeutung', 'Audio']);
			expect(table.rows).toEqual([
				{ path: ['Lektion 1'], cells: ['el perro', 'der Hund', ''] },
				{ path: ['Lektion 1'], cells: ['el gato', 'die Katze', ''] },
				// its card sits in a filtered deck, the note belongs to its home deck
				{ path: ['Lektion 2'], cells: ['la mesa', 'der Tisch', ''] },
				{ path: ['Lektion 2'], cells: ['la silla', 'der Stuhl', ''] }
			]);
		});
	}
);

describe('readApkg', () => {
	it('copes with Anki\'s "COLLATE unicase" in the newest format', async () => {
		const SQL = await initSqlJs();
		const db = new SQL.Database(await makeDatabase(spanish, 18));
		// the trap is real: plain SQLite refuses the table
		expect(() => db.exec('SELECT * FROM fields')).toThrow('no such collation sequence: unicase');
		db.close();
		// …and readApkg still reads it (see the test above for the result)
		const { tables } = await readApkg(await makeApkg(spanish, 'anki21b'), 'x.apkg', deps);
		expect(tables[0].columns).toEqual(['Wort', 'Bedeutung', 'Audio']);
	});

	it('makes one table per note type, the biggest first', async () => {
		const deck = /** @type {DeckSpec} */ ({
			...spanish,
			noteTypes: [
				...spanish.noteTypes,
				{ id: 202, name: 'Verben', fields: ['Infinitiv', 'Deutsch'] }
			],
			notes: [...spanish.notes, { noteType: 202, fields: ['comer', 'essen'], deck: 102 }]
		});
		const { tables } = await readApkg(await makeApkg(deck, 'anki21'), 'x.apkg', deps);
		expect(tables.map((t) => [t.id, t.title, t.rows.length])).toEqual([
			['anki-100-200', 'Spanisch – Einfach', 4],
			['anki-100-202', 'Spanisch – Verben', 1]
		]);
	});

	it('takes the title from the file name if the words are in the "Default" deck', async () => {
		const deck = /** @type {DeckSpec} */ ({
			...spanish,
			notes: spanish.notes.map((note) => ({ ...note, deck: 1, homeDeck: 0 }))
		});
		const { tables } = await readApkg(await makeApkg(deck, 'anki2'), 'Mein_Deck.apkg', deps);
		expect(tables[0].title).toBe('Mein Deck');
		expect(tables[0].id).toBe('anki-mein-deck-200');
		expect(tables[0].rows[0].path).toEqual([]);
	});

	it('says so when there is nothing to learn', async () => {
		const deck = /** @type {DeckSpec} */ ({
			...spanish,
			notes: spanish.notes.filter((note) => note.noteType === 201)
		});
		await expect(readApkg(await makeApkg(deck, 'anki21'), 'x.apkg', deps)).rejects.toThrow(
			new ImportError(
				'In diesem Deck habe ich keine Vokabeln gefunden – Lückentext- und Bildkarten gehen leider nicht. 😕'
			)
		);
	});

	it('explains what went wrong, in words for the learner', async () => {
		const text = (/** @type {string} */ value) => new TextEncoder().encode(value);
		const notAnki = makeZip([{ name: 'hallo.txt', data: text('Hallo') }]);
		await expect(readApkg(notAnki, 'x.apkg', deps)).rejects.toThrow(
			new ImportError('Das ist kein Anki-Deck. 🤔')
		);

		const broken = makeZip([{ name: 'collection.anki21', data: text('no database') }]);
		await expect(readApkg(broken, 'x.apkg', deps)).rejects.toThrow(
			new ImportError('Dieses Anki-Deck konnte ich nicht lesen. 😕')
		);

		await expect(readApkg(new Blob([text('PK… cut off')]), 'x.apkg', deps)).rejects.toThrow(
			new ImportError('Dieses Anki-Deck konnte ich nicht lesen. 😕')
		);

		const offline = { loadSqlJs: () => Promise.reject(new TypeError('Failed to fetch')) };
		await expect(readApkg(await makeApkg(spanish, 'anki21'), 'x.apkg', offline)).rejects.toThrow(
			new ImportError('Zum Lesen von Anki-Decks brauchst du kurz Internet. 📡')
		);
	});
});

// Real decks from ankiweb.net – not in the repository (see .gitignore), tested where they are
const local = (/** @type {string} */ name) =>
	fileURLToPath(new URL(`./fixtures/local/${name}`, import.meta.url));
const campusA = local('latein-campus-a.apkg');
const campusAlle = local('latein-campus-alle.apkg');

describe.skipIf(!existsSync(campusA))('readApkg with "Latein Campus A" (Legacy 2)', () => {
	it('reads all 1684 words with their lessons', async () => {
		const { tables, skipped } = await readApkg(
			await openAsBlob(campusA),
			'Latein_Campus_A.apkg',
			deps
		);
		expect(tables).toHaveLength(1);
		expect(skipped).toBe(0);
		const [table] = tables;
		expect(table.id).toBe('anki-1699708827342-1699713660486');
		expect(table.title).toBe('Latein Campus A');
		expect(table.columns).toEqual(['Vorderseite', 'Rückseite']);
		expect(table.rows).toHaveLength(1684);
		expect(table.rows[0]).toEqual({
			path: ['Campus A 1-15', 'Lektion 1-9', 'Lektion 1', 'Lektion 1 W1'],
			cells: ['avus', 'Großvater']
		});
		// no HTML left
		expect(
			table.rows.flatMap((row) => row.cells).filter((cell) => /[<>]|&\w+;/.test(cell))
		).toEqual([]);

		const { draft } = tableToDraft(table, {
			front: 0,
			back: 1,
			scope: ['Campus A 1-15', 'Lektion 10-15', 'Lektion 12']
		});
		expect(draft.parsed.title).toBe('Latein Campus A – Lektion 12');
		expect(draft.parsed.sections.map((s) => s.title)).toEqual([
			'Lektion 12 W1',
			'Lektion 12 W2',
			'Lektion 12 W3'
		]);
	});
});

describe.skipIf(!existsSync(campusAlle))(
	'readApkg with "Latein Campus alle Vokabeln" (Legacy 1)',
	() => {
		it('reads 2088 words in one deck and splits them into parts', async () => {
			const { tables } = await readApkg(
				await openAsBlob(campusAlle),
				'Latein_Campus_alle_Vokabeln_.apkg',
				deps
			);
			expect(tables).toHaveLength(1); // the unused note type "Basic" is left out
			expect(tables[0].title).toBe('Latein Campus Vokabeln');
			expect(tables[0].rows).toHaveLength(2088);
			const { draft } = tableToDraft(tables[0], { front: 0, back: 1, scope: [] });
			expect(draft.parsed.sections).toHaveLength(42);
			expect(draft.parsed.sections[0].title).toBe('Teil 1');
		});
	}
);
