import { describe, expect, it } from 'vitest';
import { FILE_FORMATS, readFile } from './files.js';
import { makeZip } from './fixtures/make-zip.js';
import { ImportError } from './import-error.js';

describe('FILE_FORMATS', () => {
	const formatOf = async (/** @type {Blob} */ blob) => {
		const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
		return FILE_FORMATS.find((format) => format.matches(head))?.name;
	};

	it('recognises an Anki deck by its content, whatever its name', async () => {
		const deck = makeZip([{ name: 'collection.anki21', data: new Uint8Array([1, 2, 3]) }]);
		expect(await formatOf(deck)).toBe('Anki-Deck');
	});

	it('knows nothing else yet', async () => {
		expect(await formatOf(new Blob(['%PDF-1.7']))).toBeUndefined();
		expect(await formatOf(new Blob([]))).toBeUndefined();
	});
});

describe('readFile', () => {
	it('says which files it can read', async () => {
		await expect(readFile(new File(['amicus = der Freund'], 'vokabeln.txt'))).rejects.toThrow(
			new ImportError('Diese Datei kenne ich nicht. 🤔 Wähle ein Anki-Deck (.apkg).')
		);
	});
});
