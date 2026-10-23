// @ts-check
/**
 * Import vocabulary by C.C.Buchner "Mediencode" – the code printed next to the QR
 * codes in the textbook, e.g. "40702-229". The QR code itself contains the URL
 * https://ccbuchner.de/clip_code/40702-229/.
 *
 * That page links to a PDF ("Hier findest du die Lexika …"). Browsers may not read
 * ccbuchner.de directly (it sends no CORS headers), so both requests go through our
 * own server under /proxy/ccbuchner/… (static/.htaccess; in development: vite.config.js).
 *
 *   code → /proxy/ccbuchner/clip_code/<code>/ → PDF link → /proxy/ccbuchner/<PDF path>
 *        → pdf-items.js → pdf-lexikon.js → UnitDraft
 */

import { ImportError } from './import-error.js';
import { loadPdfjs, readPdf } from './pdf-items.js';
import { parseLexikon } from './pdf-lexikon.js';

/** @typedef {import('../model.js').UnitDraft} UnitDraft */

const SITE = 'https://www.ccbuchner.de';
const PROXY = '/proxy/ccbuchner';

/**
 * Find the Mediencode in what the learner typed or scanned:
 *   "40702-229", "40702 - 229", "https://ccbuchner.de/clip_code/40702-229/" → "40702-229"
 * @param {string} input
 * @returns {string | undefined}
 */
export function parseMediencode(input) {
	const text = input.trim();
	const fromUrl = text.match(/ccbuchner\.de\/clip_code\/(\d+-\d+)/i);
	if (fromUrl) return fromUrl[1];
	const typed = text.match(/^(\d+)\s*-\s*(\d+)$/);
	return typed ? `${typed[1]}-${typed[2]}` : undefined;
}

/**
 * The path of the PDF linked on a Mediencode page, e.g. "/_files_media/mediathek/downloads/26273.pdf".
 * A simple pattern is enough for this small page (and works in tests without a browser).
 * @param {string} html
 * @returns {string | undefined}
 */
export function findPdfPath(html) {
	const href = html.match(/href\s*=\s*["']([^"']+\.pdf)["']/i)?.[1];
	if (!href) return undefined;
	const url = new URL(href, SITE);
	return url.hostname.endsWith('ccbuchner.de') ? url.pathname : undefined;
}

/**
 * @param {string} code  e.g. "40702-229" (see parseMediencode)
 * @param {{ fetch?: typeof globalThis.fetch, loadPdfjs?: typeof loadPdfjs }} [deps]  replaced in tests
 * @returns {Promise<UnitDraft>}
 */
export async function importMediencode(code, deps = {}) {
	const { fetch = globalThis.fetch, loadPdfjs: load = loadPdfjs } = deps;

	const page = await get(
		`${PROXY}/clip_code/${code}/`,
		`Den Mediencode ${code} kennt C.C.Buchner nicht. 🤔 Vertippt?`
	);
	const pdfPath = findPdfPath(await page.text());
	if (!pdfPath) {
		throw new ImportError(
			`Zum Mediencode ${code} gibt es keine Vokabel-PDF – vielleicht ist es ein Video oder ein Arbeitsblatt. 🤔`
		);
	}

	const pdf = await get(PROXY + pdfPath, 'Die Vokabel-PDF zu diesem Code gibt es nicht mehr. 😕');
	let parsed;
	try {
		parsed = parseLexikon(await readPdf(new Uint8Array(await pdf.arrayBuffer()), await load()));
	} catch {
		throw new ImportError('Die PDF zu diesem Code konnte ich nicht lesen. 😕');
	}
	if (parsed.sections.length === 0) {
		throw new ImportError(
			'In der PDF zu diesem Code habe ich keine Vokabeln erkannt. 😕 Probier es mit „Text eintippen“.'
		);
	}

	return {
		id: `ccb-${code}`,
		lang: 'la',
		source: { type: 'ccbuchner', code, pdfUrl: SITE + pdfPath },
		parsed
	};

	/**
	 * @param {string} url
	 * @param {string} notFoundMessage
	 */
	async function get(url, notFoundMessage) {
		let response;
		try {
			response = await fetch(url);
		} catch {
			throw new ImportError(
				'Keine Internetverbindung. 📡 Zum Laden der Vokabeln brauchst du kurz Internet.'
			);
		}
		if (response.status === 404) throw new ImportError(notFoundMessage);
		if (!response.ok) {
			throw new ImportError(
				`Die Vokabeln konnten gerade nicht geladen werden (Fehler ${response.status}). Versuch es später nochmal.`
			);
		}
		return response;
	}
}
