import { readFile } from 'node:fs/promises';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseLexikon } from './pdf-lexikon.js';
import { readPdf } from './pdf-items.js';

/** @typedef {import('../model.js').ParsedUnit} ParsedUnit */

describe('parseLexikon with a real C.C.Buchner PDF (Mediencode 40702-229)', () => {
	/** @type {ParsedUnit} */
	let unit;

	beforeAll(async () => {
		const data = new Uint8Array(
			await readFile(new URL('./fixtures/ccbuchner-26273.pdf', import.meta.url))
		);
		unit = parseLexikon(await readPdf(data, /** @type {any} */ (pdfjs)));
	});

	/** @param {string} front */
	const find = (front) => unit.sections.flatMap((s) => s.entries).find((e) => e.front === front);

	it('reads the title and the sections', () => {
		expect(unit.title).toBe('Die nd-Formen | Cäsar gegen Cato');
		expect(unit.sections.map((s) => [s.title, s.entries.length])).toEqual([
			['Seite 2', 39],
			['Seite 2 (Teil 2)', 13], // page 2: the alphabet starts over, its heading is only an image
			['A Zwei Positionen im Senat', 83],
			['B Zwei Politiker im Vergleich', 59]
		]);
	});

	it('joins wrapped lines and keeps chapter references apart', () => {
		expect(find('capere, capiō, cēpī, captum')).toEqual({
			front: 'capere, capiō, cēpī, captum',
			frontInfo: '',
			back: 'nehmen, ergreifen, fangen; erobern',
			refs: '6. 10. Ü1'
		});
	});

	it('separates grammar info (italic) from the meaning', () => {
		expect(find('cōnsilium, cōnsiliī')).toMatchObject({
			frontInfo: 'n',
			back: 'der Plan, der Rat, die Beratung, der Beschluss'
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
			'die Tapferkeit, die Tüchtigkeit, die gute Eigenschaft, das vorbildliche Verhalten, die Leistung'
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
