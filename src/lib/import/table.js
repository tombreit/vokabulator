// @ts-check
/**
 * The shared step for importers that deliver a table: rows of cells under column names, like
 * the notes of an Anki deck (anki.js) or, one day, a CSV file. Such an importer only reads its
 * format. What becomes a lesson is decided here, the same way for every format:
 *
 *   TableImport ─► guessColumns, scopesOf   defaults and choices for the page (/neu, "Datei")
 *               ─► tableToDraft(choice)     → UnitDraft → buildUnit() (model.js)
 *
 * A row can sit in a group with a path, e.g. an Anki subdeck
 * ["Campus A 1-15", "Lektion 1-9", "Lektion 1", "Lektion 1 W1"]. The learner imports the whole
 * table or one group ("Teil des Decks"); the groups below it become the sections.
 */

import { slugify } from '../model.js';

/** @typedef {import('../model.js').Lang} Lang */
/** @typedef {import('../model.js').Source} Source */
/** @typedef {import('../model.js').UnitDraft} UnitDraft */
/** @typedef {import('../model.js').ParsedSection} ParsedSection */
/** @typedef {import('../model.js').EntryDraft} EntryDraft */

/**
 * @typedef {object} ImportTable
 * @property {string} id         unit id of the whole table, e.g. "anki-1699708827342-1699713660486"
 * @property {string} title      e.g. "Latein Campus A"
 * @property {Source} source
 * @property {string[]} columns  e.g. ["Vorderseite", "Rückseite"]
 * @property {TableRow[]} rows   in the order of the source
 */

/**
 * @typedef {object} TableRow
 * @property {string[]} path   its group, [] = none
 * @property {string[]} cells  plain text, one per column
 */

/**
 * What a table importer delivers: one or more tables (an Anki deck has one per note type)
 * and how many rows of the file fit in none of them (e.g. cloze cards).
 * @typedef {{ tables: ImportTable[], skipped: number }} TableImport
 */

/**
 * What the learner chose: the columns for word and meaning, and the part of the table.
 * @typedef {{ front: number, back: number, scope: string[] }} TableChoice  scope: a group path, [] = all
 */

/** Longer sections are split into parts – the round setup lets the learner pick them. */
export const SECTION_SIZE = 50;

const collator = new Intl.Collator('de', { numeric: true });

/**
 * Which columns probably are word and meaning: the first column with text in at least half
 * of the rows, then the next one that mostly says something else. Columns with only numbers,
 * sounds or pictures are skipped (their cells are empty after reading).
 * @param {ImportTable} table
 * @returns {{ front: number, back: number }}
 */
export function guessColumns({ columns, rows }) {
	/** @param {(row: TableRow) => boolean} test */
	const most = (test) => rows.filter(test).length >= rows.length / 2;
	const hasText = (/** @type {string | undefined} */ cell) => /\p{L}/u.test(cell ?? '');
	const indexes = columns.map((_, i) => i);

	const front = indexes.find((i) => most((row) => hasText(row.cells[i]))) ?? 0;
	const back =
		indexes.find(
			(i) => i > front && most((row) => hasText(row.cells[i]) && row.cells[i] !== row.cells[front])
		) ?? (front === 0 ? 1 : 0);
	return { front, back };
}

/**
 * The parts of a table to choose from: all rows (path []), then every group in tree order,
 * e.g. "Campus A 1-15", "Campus A 1-15 › Lektion 1-9", … – with the number of rows in each.
 * @param {ImportTable} table
 * @returns {{ path: string[], count: number }[]}
 */
export function scopesOf(table) {
	/** @type {Map<string, { path: string[], count: number }>} */
	const groups = new Map();
	for (const { path } of table.rows) {
		for (let depth = 1; depth <= path.length; depth++) {
			const key = path.slice(0, depth).join('\x1f');
			const group = groups.get(key) ?? { path: path.slice(0, depth), count: 0 };
			group.count++;
			groups.set(key, group);
		}
	}
	return [
		{ path: [], count: table.rows.length },
		...[...groups.values()].toSorted((a, b) => comparePaths(a.path, b.path))
	];
}

/**
 * Turn the chosen part of a table into a unit draft.
 *
 * The id and title name the part ("… – Lektion 12"), so each part is a lesson of its own and
 * importing it again updates it (progress stays). The groups below the part become sections,
 * named by the end of their path ("Lektion 12 W1"); long ones are split (SECTION_SIZE).
 *
 * @param {ImportTable} table
 * @param {TableChoice} choice
 * @returns {{ draft: UnitDraft, empty: number }}  empty: rows left out, their word or meaning is empty
 */
export function tableToDraft(table, { front, back, scope }) {
	/** @type {Map<string, { path: string[], entries: EntryDraft[] }>} */
	const groups = new Map();
	let empty = 0;
	for (const row of table.rows) {
		if (!scope.every((part, i) => row.path[i] === part)) continue;
		const entry = { front: row.cells[front]?.trim() ?? '', back: row.cells[back]?.trim() ?? '' };
		if (!entry.front || !entry.back) {
			empty++;
			continue;
		}
		const path = row.path.slice(scope.length);
		const key = path.join('\x1f');
		const group = groups.get(key) ?? { path, entries: [] };
		group.entries.push(entry);
		groups.set(key, group);
	}

	const sorted = [...groups.values()].toSorted((a, b) => comparePaths(a.path, b.path));
	const titles = shortTitles(sorted.map((group) => group.path));
	const part = scope.at(-1);

	return {
		draft: {
			id: part ? `${table.id}-${slugify(scope.join(' '))}` : table.id,
			lang: guessLang(table.title),
			source: table.source,
			parsed: {
				title: part ? `${table.title} – ${part}` : table.title,
				sections: sorted.flatMap((group, i) => split(titles[i], group.entries))
			}
		},
		empty
	};
}

/** @type {[RegExp, Lang][]} */
const LANG_WORDS = [
	[/latein|latin/i, 'la'],
	[/engl/i, 'en'],
	[/span|espa[ñn]ol/i, 'es'],
	[/franz|fran[cç]ais|french/i, 'fr']
];

/**
 * The language a title talks about ("Latein Campus A", "5000 French words"), Latin if none –
 * the learner can still change it in the preview.
 * @param {string} title
 * @returns {Lang}
 */
export function guessLang(title) {
	return LANG_WORDS.find(([words]) => words.test(title))?.[1] ?? 'la';
}

/**
 * Tree order: level by level, numbers by value ("Lektion 2" before "Lektion 10"), a group
 * before the groups inside it.
 * @param {string[]} a
 * @param {string[]} b
 */
function comparePaths(a, b) {
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		const order = collator.compare(a[i], b[i]);
		if (order !== 0) return order;
	}
	return a.length - b.length;
}

/**
 * Section titles: the end of each path, as long as needed to tell them apart –
 * "Lektion 1 W1" instead of "Campus A 1-15 › Lektion 1-9 › Lektion 1 › Lektion 1 W1",
 * but "A › Vokabeln" and "B › Vokabeln" when both are called "Vokabeln". No path: undefined.
 * @param {string[][]} paths  all different
 * @returns {(string | undefined)[]}
 */
function shortTitles(paths) {
	const tail = (/** @type {string[]} */ path, /** @type {number} */ n) =>
		path.slice(-n).join('\x1f');
	return paths.map((path) => {
		let n = 1;
		while (
			n < path.length &&
			paths.filter((other) => tail(other, n) === tail(path, n)).length > 1
		) {
			n++;
		}
		return path.length ? path.slice(-n).join(' › ') : undefined;
	});
}

/**
 * One section, or parts of about the same size if it is long: 51 words → 26 + 25, not 50 + 1.
 * @param {string | undefined} title  undefined for words without a group
 * @param {EntryDraft[]} entries
 * @returns {ParsedSection[]}
 */
function split(title, entries) {
	const parts = Math.ceil(entries.length / SECTION_SIZE);
	if (parts <= 1) return [{ title: title ?? 'Alle Wörter', entries }];
	const size = Math.ceil(entries.length / parts);
	return Array.from({ length: parts }, (_, i) => ({
		title: title ? `${title} (Teil ${i + 1})` : `Teil ${i + 1}`,
		entries: entries.slice(i * size, (i + 1) * size)
	}));
}
