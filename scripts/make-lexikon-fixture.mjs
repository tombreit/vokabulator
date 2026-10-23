// Make the test PDF for the vocabulary list parser (src/lib/import/pdf-lexikon.js): a made-up
// Latin "Lexikon" in the layout of the textbook PDFs – two columns, bold lemma, italic grammar,
// small raised chapter numbers, a © footer on every page – with made-up words.
// It contains every case the parser and its tests care about: a title, sections, wrapped entries,
// the right column, "in" twice, brackets across fonts, a page without heading whose words start
// over at "a" (→ "… (Teil 2)") and a page without heading that goes on with the alphabet.
// Usage: node scripts/make-lexikon-fixture.mjs   (needs Chromium and the font DejaVu Serif)
//        CHROMIUM=/path/to/chrome node scripts/make-lexikon-fixture.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = new URL('../src/lib/import/fixtures/lexikon-beispiel.pdf', import.meta.url).pathname;

/**
 * One entry: lemma (bold), grammar (italic), meaning, chapter references (raised).
 * Lemma and grammar are HTML, for the entries that change the font inside a bracket.
 * @typedef {[lemma: string, grammar: string, meaning: string, refs?: string]} Entry
 */

/** @type {(string | Entry)[][]} pages: a string is a heading (the very first one is the title) */
const PAGES = [
	[
		'Beispiel-Lexikon | Ein Tag in Rom',
		'Wortschatz 1',
		['amīcus, amīcī', 'm', 'der Freund', '1'],
		['capere, capiō, cēpī, captum', '', 'nehmen, fassen, ergreifen; erobern', '3. 7. Ü2'],
		['cōnsilium, cōnsiliī', 'n', 'der Rat, der Plan, der Beschluss', '2'],
		['dīcere, dīcō, dīxī, dictum', '', 'sagen, sprechen; nennen'],
		['forum, forī', 'n', 'der Marktplatz, das Forum'],
		['in', 'Präp. m. Abl.', 'in, an, auf (wo?)'],
		['in', 'Präp. m. Akk.', 'in, nach, gegen (wohin?)'],
		// the grammar mixes fonts: italic "(Gen.", bold "eius", italic ", Dat.", bold "eī", italic ")"
		[
			'is, ea, id',
			'(Gen.</i> <b>eius</b><i>, Dat.</i> <b>eī</b><i>)',
			'dieser, diese, dieses; er, sie, es'
		],
		['laudāre, laudō', '', 'loben'],
		['magnus, magna, magnum', '', 'groß, bedeutend'],
		['mihi', 'Dat. von egō', 'mir'],
		// the bracket opens in the bold lemma and closes in the italic grammar
		['parātus, parāta, parātum (ad', 'm. Akk.)', 'bereit, entschlossen (zu / für)'],
		['populus, populī', 'm', 'das Volk'],
		['rēx, rēgis', 'm', 'der König'],
		['senātor, senātōris', 'm', 'der Senator'],
		['servāre, servō', '', 'retten, bewahren; beobachten', '4'],
		['via, viae', 'f', 'der Weg, die Straße'],
		[
			'virtūs, virtūtis',
			'f',
			'die Tapferkeit, die Tüchtigkeit, die gute Eigenschaft, die Leistung'
		],
		['vocāre, vocō', '', 'rufen, nennen']
	],
	// no heading, and the words start over at "a": a new list (in the textbooks its heading is an image)
	[
		['ager, agrī', 'm', 'der Acker, das Feld'],
		['dare, dō, dedī, datum', '', 'geben'],
		['flūmen, flūminis', 'n', 'der Fluss'],
		['nauta, nautae', 'm', 'der Seemann'],
		['porta, portae', 'f', 'das Tor, die Tür'],
		['terra, terrae', 'f', 'die Erde, das Land']
	],
	[
		'A Auf dem Forum',
		['clāmor, clāmōris', 'm', 'der Lärm, das Geschrei'],
		['cōnsilium, cōnsiliī', 'n', 'der Rat, der Plan, der Beschluss', '2'],
		['emere, emō, ēmī, ēmptum', '', 'kaufen'],
		['mercātor, mercātōris', 'm', 'der Kaufmann, der Händler'],
		['multī, multae, multa', '', 'viele'],
		['pecūnia, pecūniae', 'f', 'das Geld']
	],
	// no heading at the top, but the alphabet goes on: still "A Auf dem Forum"
	[
		['tabula, tabulae', 'f', 'die Tafel, das Gemälde'],
		['turba, turbae', 'f', 'die Menschenmenge'],
		'B Im Senat',
		['ōrātiō, ōrātiōnis', 'f', 'die Rede'],
		['ōrātor, ōrātōris', 'm', 'der Redner'],
		['sententia, sententiae', 'f', 'die Meinung, der Satz; der Antrag'],
		['vōx, vōcis', 'f', 'die Stimme, der Laut']
	]
];

let first = true;
/** @param {string | Entry} item */
function render(item) {
	if (typeof item === 'string') {
		const tag = first ? 'h1' : 'h2';
		first = false;
		return `<${tag}>${item}</${tag}>`;
	}
	const [lemma, grammar, meaning, refs] = item;
	return `<p><b>${lemma}</b> ${grammar ? `<i>${grammar}</i> ` : ''}${meaning}${refs ? `<sup>${refs}</sup>` : ''}</p>`;
}

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<style>
	@page { size: A4; margin: 15mm; }
	body { margin: 0; font: 12pt/1.35 'DejaVu Serif', serif; }
	/* one page per block, its text in two columns – headings flow with the words */
	.page { position: relative; height: 266mm; break-after: page; }
	.columns { column-count: 2; column-gap: 10mm; }
	h1 { margin: 0 0 4mm; font-size: 22pt; column-span: all; }
	h2 { margin: 2mm 0; font-size: 16pt; break-after: avoid; }
	p { margin: 0 0 1.5mm; break-inside: avoid; }
	sup { font-size: 0.6em; }
	footer { position: absolute; bottom: 0; font-size: 9pt; }
</style>
</head>
<body>
${PAGES.map(
	(items) => `<div class="page">
	<div class="columns">
		${items.map(render).join('\n\t\t')}
	</div>
	<footer>© Vokabulator – frei erfundene Beispieldaten</footer>
</div>`
).join('\n')}
</body>
</html>
`;

const dir = mkdtempSync(join(tmpdir(), 'vokabulator-lexikon-'));
try {
	writeFileSync(join(dir, 'lexikon.html'), html);
	execFileSync(process.env.CHROMIUM ?? 'chromium', [
		'--headless',
		// it only opens the page written above – the browser sandbox fails in some containers
		'--no-sandbox',
		'--disable-gpu',
		'--no-pdf-header-footer',
		`--user-data-dir=${join(dir, 'profile')}`,
		`--print-to-pdf=${join(dir, 'lexikon.pdf')}`,
		`file://${join(dir, 'lexikon.html')}`
	]);
	copyFileSync(join(dir, 'lexikon.pdf'), out);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
console.log(`wrote ${out}`);
