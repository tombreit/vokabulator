import { describe, expect, it } from 'vitest';
import { buildUnit } from '../model.js';
import { guessColumns, guessLang, scopesOf, tableToDraft } from './table.js';

/** @typedef {import('./table.js').ImportTable} ImportTable */
/** @typedef {import('./table.js').TableRow} TableRow */

/**
 * @param {TableRow[]} rows
 * @param {string[]} [columns]
 * @returns {ImportTable}
 */
const tableOf = (rows, columns = ['Vorderseite', 'Rückseite']) => ({
	id: 'anki-1-2',
	title: 'Latein Campus A',
	source: { type: 'file', name: 'Latein_Campus_A.apkg' },
	columns,
	rows
});

/** n rows "w1 = b1", "w2 = b2", … in one group */
const many = (/** @type {number} */ n, /** @type {string[]} */ path = []) =>
	Array.from({ length: n }, (_, i) => ({ path, cells: [`w${i + 1}`, `b${i + 1}`] }));

const campus = tableOf([
	{
		path: ['Campus A 1-15', 'Lektion 1-9', 'Lektion 2', 'Lektion 2 W1'],
		cells: ['avus', 'Großvater']
	},
	{
		path: ['Campus A 1-15', 'Lektion 1-9', 'Lektion 2', 'Lektion 2 W2'],
		cells: ['equus', 'Pferd']
	},
	{ path: ['Campus A 1-15', 'Lektion 1-9', 'Lektion 10', 'Lektion 10 W1'], cells: ['via', 'Weg'] },
	{
		path: ['Campus A 1-15', 'Lektion 1-9', 'Lektion 2', 'Lektion 2 W1'],
		cells: ['campus', 'Feld']
	},
	{ path: ['Campus A 1-15', 'Lektion 1-9', 'Lektion 2', 'Lektion 2 W2'], cells: ['', 'leer'] }
]);

describe('guessColumns', () => {
	it('takes the first two columns of a simple deck', () => {
		expect(guessColumns(campus)).toEqual({ front: 0, back: 1 });
	});

	it('skips columns without text, like numbers, sounds or pictures', () => {
		const table = tableOf(
			[
				{ path: [], cells: ['1', '', 'el perro', 'der Hund'] },
				{ path: [], cells: ['2', '', 'el gato', 'die Katze'] }
			],
			['Nr.', 'Audio', 'Wort', 'Bedeutung']
		);
		expect(guessColumns(table)).toEqual({ front: 2, back: 3 });
	});

	it('skips a column that only repeats the word', () => {
		const table = tableOf(
			[
				{ path: [], cells: ['chat', 'chat', 'Katze'] },
				{ path: [], cells: ['chien', 'chien', 'Hund'] }
			],
			['Word', 'Word (copy)', 'Meaning']
		);
		expect(guessColumns(table)).toEqual({ front: 0, back: 2 });
	});
});

describe('scopesOf', () => {
	it('lists everything, then every group in tree order with numbers by value', () => {
		expect(scopesOf(campus).map(({ path, count }) => [path.at(-1) ?? 'alles', count])).toEqual([
			['alles', 5],
			['Campus A 1-15', 5],
			['Lektion 1-9', 5],
			['Lektion 2', 4],
			['Lektion 2 W1', 2],
			['Lektion 2 W2', 2],
			['Lektion 10', 1],
			['Lektion 10 W1', 1]
		]);
	});

	it('has only "everything" for a table without groups', () => {
		expect(scopesOf(tableOf(many(3)))).toEqual([{ path: [], count: 3 }]);
	});
});

describe('tableToDraft', () => {
	const choice = { front: 0, back: 1, scope: /** @type {string[]} */ ([]) };

	it('makes the whole table one unit, sections named by the end of their path', () => {
		const { draft, empty } = tableToDraft(campus, choice);
		expect(draft.id).toBe('anki-1-2');
		expect(draft.parsed.title).toBe('Latein Campus A');
		expect(draft.lang).toBe('la');
		expect(draft.source).toEqual({ type: 'file', name: 'Latein_Campus_A.apkg' });
		expect(draft.parsed.sections.map((s) => [s.title, s.entries.map((e) => e.front)])).toEqual([
			['Lektion 2 W1', ['avus', 'campus']],
			['Lektion 2 W2', ['equus']],
			['Lektion 10 W1', ['via']]
		]);
		expect(empty).toBe(1);
	});

	it('makes one part its own unit, with its own id and title', () => {
		const scope = ['Campus A 1-15', 'Lektion 1-9', 'Lektion 2'];
		const { draft } = tableToDraft(campus, { ...choice, scope });
		expect(draft.id).toBe('anki-1-2-campus-a-1-15-lektion-1-9-lektion-2');
		expect(draft.parsed.title).toBe('Latein Campus A – Lektion 2');
		expect(draft.parsed.sections.map((s) => s.title)).toEqual(['Lektion 2 W1', 'Lektion 2 W2']);
	});

	it('calls words without a group "Alle Wörter"', () => {
		const leaf = ['Campus A 1-15', 'Lektion 1-9', 'Lektion 10', 'Lektion 10 W1'];
		const { draft } = tableToDraft(campus, { ...choice, scope: leaf });
		expect(draft.parsed.sections).toEqual([
			{ title: 'Alle Wörter', entries: [{ front: 'via', back: 'Weg' }] }
		]);
	});

	it('uses the chosen columns, e.g. the other way round', () => {
		const { draft } = tableToDraft(campus, { ...choice, front: 1, back: 0 });
		expect(draft.parsed.sections[0].entries[0]).toEqual({ front: 'Großvater', back: 'avus' });
	});

	it('keeps sections apart that end the same', () => {
		const table = tableOf([...many(1, ['Teil A', 'Vokabeln']), ...many(1, ['Teil B', 'Vokabeln'])]);
		const { draft } = tableToDraft(table, choice);
		expect(draft.parsed.sections.map((s) => s.title)).toEqual([
			'Teil A › Vokabeln',
			'Teil B › Vokabeln'
		]);
	});

	it('splits long sections into parts of about the same size', () => {
		const sizes = (/** @type {ImportTable} */ table) =>
			tableToDraft(table, choice).draft.parsed.sections.map((s) => [s.title, s.entries.length]);
		expect(sizes(tableOf(many(50)))).toEqual([['Alle Wörter', 50]]);
		expect(sizes(tableOf(many(51)))).toEqual([
			['Teil 1', 26],
			['Teil 2', 25]
		]);
		expect(sizes(tableOf(many(120, ['Wortschatz'])))).toEqual([
			['Wortschatz (Teil 1)', 40],
			['Wortschatz (Teil 2)', 40],
			['Wortschatz (Teil 3)', 40]
		]);
	});

	it('delivers what buildUnit takes', () => {
		const unit = buildUnit(tableToDraft(campus, choice).draft);
		expect(unit.entries.map((e) => e.id)).toEqual(['avus', 'campus', 'equus', 'via']);
		expect(unit.sections).toHaveLength(3);
	});
});

describe('guessLang', () => {
	it('finds the language in the title', () => {
		expect(guessLang('Latein Campus A')).toBe('la');
		expect(guessLang('Green Line 3 Englisch')).toBe('en');
		expect(guessLang('Español – Vokabeln')).toBe('es');
		expect(guessLang('5000 most frequently used French words')).toBe('fr');
		expect(guessLang('Französisch Découvertes 1')).toBe('fr');
	});

	it('says Latin if the title does not tell', () => {
		expect(guessLang('Meine Vokabeln')).toBe('la');
	});
});
