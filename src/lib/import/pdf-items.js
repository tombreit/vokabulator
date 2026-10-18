// @ts-check
/**
 * Read the text of a PDF together with position, size and font style – the raw
 * material for pdf-lexikon.js. This is the only module that talks to pdf.js.
 *
 * pdf.js is big (~1 MB), so the browser loads it only when a PDF is imported
 * (loadPdfjs). Tests pass in the Node build of pdf.js instead.
 */

/**
 * One piece of text as it sits on the page.
 * @typedef {object} PdfItem
 * @property {string} str
 * @property {number} x       left edge in PDF points (from the left)
 * @property {number} y       baseline in PDF points (from the bottom)
 * @property {number} size    font size in points
 * @property {boolean} bold
 * @property {boolean} italic
 */

/** @typedef {{ width: number, items: PdfItem[] }} PdfPage */

/** @typedef {typeof import('pdfjs-dist')} Pdfjs */

/**
 * Load pdf.js in the browser, with its worker (parses the PDF off the main thread).
 * @returns {Promise<Pdfjs>}
 */
export async function loadPdfjs() {
	const [pdfjs, worker] = await Promise.all([
		import('pdfjs-dist'),
		import('pdfjs-dist/build/pdf.worker.min.mjs?url')
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	return pdfjs;
}

/**
 * @param {Uint8Array} data  the PDF file
 * @param {Pdfjs} pdfjs
 * @returns {Promise<PdfPage[]>}
 */
export async function readPdf(data, pdfjs) {
	// fontExtraProperties: keep the real font names ("…Aptos-Bold"), which tell us bold/italic.
	// verbosity 0: only errors, no warnings about font details we do not need.
	const task = pdfjs.getDocument({ data, fontExtraProperties: true, verbosity: 0 });
	const doc = await task.promise;
	/** @type {PdfPage[]} */
	const pages = [];

	for (let number = 1; number <= doc.numPages; number++) {
		const page = await doc.getPage(number);
		const content = await page.getTextContent();
		await page.getOperatorList(); // loads the fonts into page.commonObjs

		/** @type {PdfItem[]} */
		const items = [];
		for (const item of content.items) {
			if (!('str' in item) || item.str === '') continue;
			const fontName = page.commonObjs.get(item.fontName)?.name ?? '';
			const [, , c, d, x, y] = item.transform;
			items.push({
				str: item.str,
				x,
				y,
				size: Math.hypot(c, d),
				bold: /bold|black|heavy/i.test(fontName),
				italic: /italic|oblique/i.test(fontName)
			});
		}
		pages.push({ width: page.view[2], items });
	}

	await task.destroy();
	return pages;
}
