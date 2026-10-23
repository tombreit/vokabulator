// @ts-check
/**
 * Build small ZIP archives for tests – stored or deflated entries, like the ones in Anki decks.
 * Node only (node:zlib).
 */
import { crc32, deflateRawSync } from 'node:zlib';

/**
 * @typedef {object} ZipFile
 * @property {string} name
 * @property {Uint8Array<ArrayBuffer>} data
 * @property {boolean} [deflate]  compress (method 8) instead of storing (method 0)
 */

/**
 * @param {ZipFile[]} files
 * @param {string} [comment]  the archive comment at the very end
 * @returns {Blob}
 */
export function makeZip(files, comment = '') {
	const encoder = new TextEncoder();
	/** @type {Uint8Array<ArrayBuffer>[]} */
	const parts = [];
	/** @type {Uint8Array<ArrayBuffer>[]} */
	const directory = [];
	let offset = 0;

	for (const { name, data, deflate = false } of files) {
		const nameBytes = encoder.encode(name);
		const packed = deflate ? new Uint8Array(deflateRawSync(data)) : data;
		const method = deflate ? 8 : 0;
		const crc = crc32(data);

		const local = new Uint8Array(30 + nameBytes.length);
		const l = new DataView(local.buffer);
		l.setUint32(0, 0x04034b50, true);
		l.setUint16(4, 20, true); // version needed
		l.setUint16(8, method, true);
		l.setUint32(14, crc, true);
		l.setUint32(18, packed.length, true);
		l.setUint32(22, data.length, true);
		l.setUint16(26, nameBytes.length, true);
		local.set(nameBytes, 30);

		const central = new Uint8Array(46 + nameBytes.length);
		const c = new DataView(central.buffer);
		c.setUint32(0, 0x02014b50, true);
		c.setUint16(4, 20, true); // version made by
		c.setUint16(6, 20, true); // version needed
		c.setUint16(10, method, true);
		c.setUint32(16, crc, true);
		c.setUint32(20, packed.length, true);
		c.setUint32(24, data.length, true);
		c.setUint16(28, nameBytes.length, true);
		c.setUint32(42, offset, true);
		central.set(nameBytes, 46);

		parts.push(local, packed);
		directory.push(central);
		offset += local.length + packed.length;
	}

	const commentBytes = encoder.encode(comment);
	const end = new Uint8Array(22 + commentBytes.length);
	const e = new DataView(end.buffer);
	e.setUint32(0, 0x06054b50, true);
	e.setUint16(8, files.length, true);
	e.setUint16(10, files.length, true);
	e.setUint32(
		12,
		directory.reduce((sum, entry) => sum + entry.length, 0),
		true
	);
	e.setUint32(16, offset, true);
	e.setUint16(20, commentBytes.length, true);
	end.set(commentBytes, 22);

	return new Blob([...parts, ...directory, end]);
}
