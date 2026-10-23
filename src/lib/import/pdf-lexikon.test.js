import { readFile } from 'node:fs/promises';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseLexikon } from './pdf-lexikon.js';
import { readPdf } from './pdf-items.js';

/** @typedef {import('../model.js').ParsedUnit} ParsedUnit */

// made-up words in the layout of the textbook PDFs, see scripts/make-lexikon-fixture.mjs
describe('parseLexikon with a vocabulary PDF', () => {
	/** @type {ParsedUnit} */
	let unit;

	beforeAll(async () => {
		const data = new Uint8Array(
			await readFile(new URL('./fixtures/lexikon-beispiel.pdf', import.meta.url))
		);
		unit = parseLexikon(await readPdf(data, /** @type {any} */ (pdfjs)));
	});

	/** @param {string} front */
	const find = (front) => unit.sections.flatMap((s) => s.entries).find((e) => e.front === front);

	it('reads the title and the sections', () => {
		expect(unit.title).toBe('Beispiel-Lexikon | Ein Tag in Rom');
		expect(unit.sections.map((s) => [s.title, s.entries.length])).toEqual([
			['Wortschatz 1', 19],
			['Wortschatz 1 (Teil 2)', 6], // page 2: no heading, the alphabet starts over
			['A Auf dem Forum', 8], // page 4 goes on without a heading, the alphabet goes on
			['B Im Senat', 4]
		]);
	});

	it('joins wrapped lines and keeps chapter references apart', () => {
		expect(find('capere, capiō, cēpī, captum')).toEqual({
			front: 'capere, capiō, cēpī, captum',
			frontInfo: '',
			back: 'nehmen, fassen, ergreifen; erobern',
			refs: '3. 7. Ü2'
		});
	});

	it('separates grammar info (italic) from the meaning', () => {
		expect(find('cōnsilium, cōnsiliī')).toMatchObject({
			frontInfo: 'n',
			back: 'der Rat, der Plan, der Beschluss'
		});
		expect(find('mihi')).toMatchObject({ frontInfo: 'Dat. von egō', back: 'mir' });
		expect(find('is, ea, id')).toMatchObject({
			frontInfo: '(Gen. eius, Dat. eī)',
			back: 'dieser, diese, dieses; er, sie, es'
		});
		expect(find('parātus, parāta, parātum')).toMatchObject({
			frontInfo: '(ad m. Akk.)',
			back: 'bereit, entschlossen (zu / für)'
		});
	});

	it('keeps "in" with ablative and with accusative apart', () => {
		const ins = unit.sections[0].entries.filter((e) => e.front === 'in');
		expect(ins.map((e) => e.frontInfo)).toEqual(['Präp. m. Abl.', 'Präp. m. Akk.']);
	});

	it('reads the right column too', () => {
		expect(find('virtūs, virtūtis')?.back).toBe(
			'die Tapferkeit, die Tüchtigkeit, die gute Eigenschaft, die Leistung'
		);
	});
});

describe('parseLexikon rules', () => {
	/**
	 * Build a page from lines like [y, x, text, style], style: B = bold, I = italic, ^ = superscript.
	 * @param {[number, number, string, string][]} rows
	 */
	const page = (rows) => ({
		width: 600,
		items: rows.map(([y, x, str, style]) => ({
			str,
			x,
			y,
			size: style.includes('^') ? 6.5 : style.includes('H') ? 14 : 10.5,
			bold: style.includes('B') || style.includes('H'),
			italic: style.includes('I')
		}))
	});

	it('continues a section on the next page while the alphabet goes on', () => {
		const unit = parseLexikon([
			page([
				[800, 70, 'Titel', 'H'],
				[700, 70, 'amīcus', 'B'],
				[700, 120, 'der Freund', ''],
				[680, 70, 'magnus', 'B'],
				[680, 120, 'groß', '']
			]),
			page([
				[700, 70, 'via', 'B'],
				[700, 120, 'der Weg', '']
			]),
			page([
				[700, 70, 'bellum', 'B'],
				[700, 120, 'der Krieg', '']
			])
		]);

		expect(unit.sections.map((s) => [s.title, s.entries.map((e) => e.front)])).toEqual([
			['Alle Wörter', ['amīcus', 'magnus', 'via']],
			['Alle Wörter (Teil 2)', ['bellum']]
		]);
	});

	it('attaches superscripts to the line below them and drops the footer', () => {
		const unit = parseLexikon([
			page([
				[700, 70, 'servāre', 'B'],
				[700, 120, 'retten,', ''],
				[685, 70, 'bewahren', ''],
				[688.5, 120, '3', '^'],
				[30, 70, '© C. C. Buchner Verlag, Bamberg', '']
			])
		]);

		expect(unit.sections[0].entries).toEqual([
			{ front: 'servāre', frontInfo: '', back: 'retten, bewahren', refs: '3' }
		]);
	});
});
