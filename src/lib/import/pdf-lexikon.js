// @ts-check
/**
 * Turn the text of a C.C.Buchner vocabulary PDF ("Lexika") into a unit.
 *
 * What these PDFs look like (the test PDF fixtures/lexikon-beispiel.pdf copies the layout with
 * made-up words, see scripts/make-lexikon-fixture.mjs):
 *
 *   Beispiel-Lexikon | Ein Tag in Rom        ← biggest text: first heading = title
 *   Wortschatz 1                             ← further headings = sections
 *
 *   **capere, capiō, cēpī, captum** nehmen,  ← an entry starts with bold text (the lemma),
 *   fassen, ergreifen; erobern ³·⁷·Ü²         ← may wrap; small superscripts = chapter refs
 *   **cōnsilium, cōnsiliī** *n* der Rat, …   ← italic text before the meaning = grammar info
 *
 * Two columns per page (left first), a "© C. C. Buchner Verlag" footer on every page.
 * A page without heading continues the previous section – unless its words start over
 * at the beginning of the alphabet: then it is a new list (whose heading is only an
 * image in the PDF), which becomes "<previous title> (Teil 2)".
 *
 * Steps: body font size → per page: drop footer, split columns, build lines →
 * walk the lines: headings start sections, bold starts entries → split each entry.
 */

/** @typedef {import('./pdf-items.js').PdfItem} PdfItem */
/** @typedef {import('./pdf-items.js').PdfPage} PdfPage */
/** @typedef {import('../model.js').ParsedUnit} ParsedUnit */
/** @typedef {import('../model.js').ParsedSection} ParsedSection */
/** @typedef {import('../model.js').EntryDraft} EntryDraft */

/** @typedef {{ y: number, items: PdfItem[] }} Line */

/**
 * @param {PdfPage[]} pages
 * @returns {ParsedUnit}
 */
export function parseLexikon(pages) {
	const bodySize = mostCommonSize(pages);
	const isHeading = (/** @type {PdfItem} */ item) => item.size >= bodySize * 1.2;
	const isSuperscript = (/** @type {PdfItem} */ item) => item.size <= bodySize * 0.8;

	let title = '';
	/** @type {ParsedSection[]} */
	const sections = [];
	/** @type {PdfItem[][]} items of each entry of the current section */
	let entryItems = [];

	/** @param {string} sectionTitle */
	function startSection(sectionTitle) {
		finishSection();
		sections.push({ title: sectionTitle, entries: [] });
	}

	function finishSection() {
		const section = sections.at(-1);
		if (section) section.entries.push(...entryItems.map(toEntry).filter((e) => e.back !== ''));
		entryItems = [];
	}

	for (const page of pages) {
		let pageHasHeading = false;
		let firstEntryOnPage = true;

		for (const line of readingOrder(page, isSuperscript)) {
			const text = joinText(line.items);
			if (text === '') continue;

			if (line.items.some(isHeading)) {
				if (!title) title = text;
				else startSection(text);
				pageHasHeading = true;
				continue;
			}

			const first = line.items.find((item) => item.str.trim() !== '');
			if (first?.bold && !isSuperscript(first)) {
				if (firstEntryOnPage && !pageHasHeading && startsOver(line.items, entryItems)) {
					const previous = sections.at(-1)?.title ?? 'Wörter';
					startSection(
						`${previous.replace(/ \(Teil \d+\)$/, '')} (Teil ${countParts(sections, previous) + 1})`
					);
				}
				if (sections.length === 0) startSection('Alle Wörter');
				entryItems.push([]);
				firstEntryOnPage = false;
			}
			// continuation lines (and stray text before the first entry) join the current entry
			entryItems
				.at(-1)
				?.push({ ...line.items[0], str: ' ', bold: false, italic: false }, ...line.items);
		}
	}
	finishSection();

	return { title: title || 'Vokabeln', sections: sections.filter((s) => s.entries.length > 0) };

	/**
	 * Split one entry into lemma, grammar info, meaning and chapter references.
	 * @param {PdfItem[]} items
	 * @returns {EntryDraft}
	 */
	function toEntry(items) {
		let front = '';
		let frontInfo = '';
		let back = '';
		/** @type {string[]} */
		const refs = [];
		/** @type {'front' | 'info' | 'back'} */
		let part = 'front';

		for (const item of items) {
			if (isSuperscript(item)) {
				if (item.str.trim()) refs.push(item.str.trim());
				continue;
			}
			// Only text with letters switches parts: spaces and punctuation come in any font,
			// e.g. "is, ea, id (Gen. eius …" = bold "is, ea, id", italic "(Gen", regular ".", bold "eius".
			if (/[\p{L}\p{N}]/u.test(item.str)) {
				if (!item.bold && !item.italic) part = 'back';
				else if (part === 'front' && item.italic) part = 'info';
			}
			if (part === 'front') front += item.str;
			else if (part === 'info') frontInfo += item.str;
			else back += item.str;
		}

		[front, frontInfo] = keepBracketsTogether(front, frontInfo);
		return {
			front: tidy(front),
			frontInfo: tidy(frontInfo),
			back: tidy(back),
			refs: refs.join(' ')
		};
	}
}

/**
 * The lines of a page in reading order: footer removed, left column, then right column.
 * Superscripts (chapter refs) sit a bit higher than their line; they are attached to it.
 * @param {PdfPage} page
 * @param {(item: PdfItem) => boolean} isSuperscript
 * @returns {Line[]}
 */
function readingOrder(page, isSuperscript) {
	const footerYs = page.items.filter((i) => i.str.includes('©')).map((i) => i.y);
	const items = page.items.filter((i) => !footerYs.some((y) => Math.abs(i.y - y) < 1));
	const middle = page.width / 2;

	return [
		...buildLines(
			items.filter((i) => i.x < middle),
			isSuperscript
		),
		...buildLines(
			items.filter((i) => i.x >= middle),
			isSuperscript
		)
	];
}

/**
 * @param {PdfItem[]} items  items of one column
 * @param {(item: PdfItem) => boolean} isSuperscript
 * @returns {Line[]}
 */
function buildLines(items, isSuperscript) {
	/** @type {Line[]} */
	const lines = [];
	const byTopThenLeft = (/** @type {PdfItem} */ a, /** @type {PdfItem} */ b) =>
		b.y - a.y || a.x - b.x;

	for (const item of items.filter((i) => !isSuperscript(i)).toSorted(byTopThenLeft)) {
		const line = lines.at(-1);
		if (line && Math.abs(line.y - item.y) < 2) line.items.push(item);
		else lines.push({ y: item.y, items: [item] });
	}

	for (const sup of items.filter(isSuperscript)) {
		// the line whose baseline is just below the superscript
		const line = lines.find((l) => sup.y >= l.y - 1 && sup.y - l.y < sup.size);
		line?.items.push(sup);
	}
	for (const line of lines) line.items.sort((a, b) => a.x - b.x);

	return lines;
}

/**
 * A bracket opened in the lemma but closed in the grammar info belongs to the info:
 * "parātus, parāta, parātum (ad" + "m. Akk.)" → "parātus, parāta, parātum" + "(ad m. Akk.)".
 * @param {string} front
 * @param {string} info
 * @returns {[string, string]}
 */
function keepBracketsTogether(front, info) {
	let depth = 0;
	let openedAt = -1;
	for (const [i, char] of [...front].entries()) {
		if (char === '(' && depth++ === 0) openedAt = i;
		if (char === ')' && depth > 0) depth--;
	}
	if (depth === 0) return [front, info];
	const chars = [...front];
	return [chars.slice(0, openedAt).join(''), chars.slice(openedAt).join('') + info];
}

/**
 * Does the first entry of a page start "earlier in the alphabet" than the last entry so far?
 * @param {PdfItem[]} firstLine
 * @param {PdfItem[][]} entriesSoFar
 */
function startsOver(firstLine, entriesSoFar) {
	const last = entriesSoFar.at(-1);
	if (!last) return false;
	const lemma = (/** @type {PdfItem[]} */ items) => joinText(items.filter((i) => i.bold));
	return lemma(firstLine).localeCompare(lemma(last), 'de', { sensitivity: 'base' }) < 0;
}

/**
 * @param {ParsedSection[]} sections
 * @param {string} title
 */
function countParts(sections, title) {
	const base = title.replace(/ \(Teil \d+\)$/, '');
	return sections.filter((s) => s.title === base || s.title.startsWith(`${base} (Teil `)).length;
}

/**
 * The font size used by most of the text (weighted by text length).
 * @param {PdfPage[]} pages
 */
function mostCommonSize(pages) {
	/** @type {Map<number, number>} */
	const chars = new Map();
	for (const item of pages.flatMap((p) => p.items)) {
		const size = Math.round(item.size * 2) / 2;
		chars.set(size, (chars.get(size) ?? 0) + item.str.trim().length);
	}
	return [...chars].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
}

/** @param {PdfItem[]} items */
function joinText(items) {
	return tidy(items.map((i) => i.str).join(''));
}

/** @param {string} text */
function tidy(text) {
	return text.replace(/\s+/g, ' ').trim();
}
