// @ts-check
/**
 * The file formats Vokabulator can import (tab "Datei" on /neu). A format is recognised by
 * the first bytes of the file, not by its name: phones like to rename downloads, and Anki
 * alone uses several endings (.apkg, .colpkg).
 *
 * Every format delivers tables (table.js); the page then lets the learner choose the columns
 * and the part. A new format: write src/lib/import/<format>.js (+ test) with a read() that
 * returns a TableImport, and add one line to FILE_FORMATS.
 */

import { readApkg } from './anki.js';
import { ImportError } from './import-error.js';

/** @typedef {import('./table.js').TableImport} TableImport */

/**
 * @typedef {object} FileFormat
 * @property {string} name
 * @property {(head: Uint8Array) => boolean} matches  head: the first 16 bytes of the file
 * @property {(file: Blob, fileName: string) => Promise<TableImport>} read
 */

/** @type {FileFormat[]} */
export const FILE_FORMATS = [
	// an Anki deck is a ZIP archive: "PK\3\4"
	{
		name: 'Anki-Deck',
		matches: (head) => startsWith(head, [0x50, 0x4b, 0x03, 0x04]),
		read: readApkg
	}
];

/**
 * @param {File} file
 * @returns {Promise<TableImport>}
 */
export async function readFile(file) {
	const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
	const format = FILE_FORMATS.find((f) => f.matches(head));
	if (!format) {
		throw new ImportError('Diese Datei kenne ich nicht. 🤔 Wähle ein Anki-Deck (.apkg).');
	}
	return format.read(file, file.name);
}

/**
 * @param {Uint8Array} bytes
 * @param {number[]} start
 */
function startsWith(bytes, start) {
	return start.every((byte, i) => bytes[i] === byte);
}
