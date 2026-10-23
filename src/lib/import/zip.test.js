import { existsSync, openAsBlob } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { makeZip } from './fixtures/make-zip.js';
import { listZip, readZipEntry } from './zip.js';

const text = (/** @type {string} */ value) => new TextEncoder().encode(value);

describe('listZip and readZipEntry', () => {
	const big = text('amicus = der Freund\n'.repeat(1000));
	const zip = makeZip(
		[
			{ name: 'stored.txt', data: text('servare') },
			{ name: 'deflated.txt', data: big, deflate: true },
			{ name: 'Ordner/ä.txt', data: text('') }
		],
		'a comment at the end'
	);

	it('lists the files with their method and sizes', async () => {
		const entries = await listZip(zip);
		expect(entries.map(({ name, method, size }) => [name, method, size])).toEqual([
			['stored.txt', 0, 7],
			['deflated.txt', 8, big.length],
			['Ordner/ä.txt', 0, 0]
		]);
		expect(entries[1].compressedSize).toBeLessThan(big.length);
	});

	it('reads stored and deflated files', async () => {
		const [stored, deflated, empty] = await listZip(zip);
		expect(new TextDecoder().decode(await readZipEntry(zip, stored))).toBe('servare');
		expect(await readZipEntry(zip, deflated)).toEqual(big);
		expect((await readZipEntry(zip, empty)).length).toBe(0);
	});

	it('rejects what is not a ZIP', async () => {
		await expect(listZip(new Blob([text('%PDF-1.7 hello')]))).rejects.toThrow('Not a ZIP');
		await expect(listZip(new Blob([]))).rejects.toThrow('Not a ZIP');
	});

	it('rejects compression methods it does not know', async () => {
		const [entry] = await listZip(zip);
		await expect(readZipEntry(zip, { ...entry, method: 93 })).rejects.toThrow('method 93');
	});
});

// A real deck from ankiweb.net – not in the repository, see .gitignore
const campusA = fileURLToPath(new URL('./fixtures/local/latein-campus-a.apkg', import.meta.url));

describe.skipIf(!existsSync(campusA))('listZip with a real Anki deck', () => {
	it('finds the database next to the placeholder', async () => {
		const entries = await listZip(await openAsBlob(campusA));
		expect(entries.map(({ name, method }) => [name, method])).toEqual([
			['meta', 0],
			['collection.anki21', 8],
			['collection.anki2', 0],
			['media', 0]
		]);
	});
});
