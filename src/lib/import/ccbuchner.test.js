import { readFile } from 'node:fs/promises';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { findPdfPath, importMediencode, parseMediencode } from './ccbuchner.js';
import { ImportError } from './import-error.js';

describe('parseMediencode', () => {
	it('understands typed codes and scanned URLs', () => {
		expect(parseMediencode('40702-229')).toBe('40702-229');
		expect(parseMediencode(' 40702 - 229 ')).toBe('40702-229');
		expect(parseMediencode('https://ccbuchner.de/clip_code/40702-229/')).toBe('40702-229');
		expect(parseMediencode('https://www.ccbuchner.de/clip_code/40702-229')).toBe('40702-229');
	});

	it('rejects everything else', () => {
		expect(parseMediencode('')).toBeUndefined();
		expect(parseMediencode('40702')).toBeUndefined();
		expect(parseMediencode('https://example.org/clip_code/40702-229/')).toBeUndefined();
		expect(parseMediencode('Hallo')).toBeUndefined();
	});
});

describe('findPdfPath', () => {
	it('finds relative and absolute links to ccbuchner.de', () => {
		expect(findPdfPath('<a href="/_files_media/mediathek/downloads/26273.pdf">Hier</a>')).toBe(
			'/_files_media/mediathek/downloads/26273.pdf'
		);
		expect(findPdfPath(`<a href='https://www.ccbuchner.de/_files_media/x/1.pdf'>`)).toBe(
			'/_files_media/x/1.pdf'
		);
	});

	it('ignores pages without PDF and PDFs elsewhere', () => {
		expect(findPdfPath('<a href="/video">Video</a>')).toBeUndefined();
		expect(findPdfPath('<a href="https://example.org/a.pdf">x</a>')).toBeUndefined();
	});
});

describe('importMediencode', () => {
	const page = `<h1>Mediencode 40702-229</h1>
		<p><a href="/_files_media/mediathek/downloads/26273.pdf">Hier</a> findest du die Lexika …</p>`;

	/**
	 * A fake server: path → response body (anything else is a 404).
	 * @param {Record<string, BodyInit>} files
	 */
	const fakeFetch = (files) =>
		/** @type {typeof fetch} */ (
			async (url) => {
				const body = files[String(url)];
				return body === undefined ? new Response('', { status: 404 }) : new Response(body);
			}
		);
	const loadPdfjs = async () => /** @type {any} */ (pdfjs);

	it('loads page and PDF through the proxy and parses the vocabulary', async () => {
		const pdf = await readFile(new URL('./fixtures/lexikon-beispiel.pdf', import.meta.url));
		const fetch = fakeFetch({
			'/proxy/ccbuchner/clip_code/40702-229/': page,
			'/proxy/ccbuchner/_files_media/mediathek/downloads/26273.pdf': new Uint8Array(pdf)
		});

		const draft = await importMediencode('40702-229', { fetch, loadPdfjs });

		expect(draft.id).toBe('ccb-40702-229');
		expect(draft.source).toEqual({
			type: 'ccbuchner',
			code: '40702-229',
			pdfUrl: 'https://www.ccbuchner.de/_files_media/mediathek/downloads/26273.pdf'
		});
		expect(draft.parsed.title).toBe('Beispiel-Lexikon | Ein Tag in Rom');
		expect(draft.parsed.sections).toHaveLength(4);
	});

	it('explains unknown codes, pages without PDF and missing internet', async () => {
		await expect(importMediencode('1-1', { fetch: fakeFetch({}), loadPdfjs })).rejects.toThrow(
			/kennt C.C.Buchner nicht/
		);

		const noPdf = fakeFetch({ '/proxy/ccbuchner/clip_code/1-2/': '<a href="/video">x</a>' });
		await expect(importMediencode('1-2', { fetch: noPdf, loadPdfjs })).rejects.toThrow(
			/keine Vokabel-PDF/
		);

		const offline = /** @type {typeof fetch} */ (
			async () => {
				throw new TypeError('Failed to fetch');
			}
		);
		await expect(importMediencode('1-3', { fetch: offline, loadPdfjs })).rejects.toThrow(
			ImportError
		);
	});
});
