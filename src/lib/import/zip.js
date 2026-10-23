// @ts-check
/**
 * Read single files out of a ZIP archive – just enough for Anki decks (.apkg), which are ZIPs.
 *
 * Works on a Blob (the File from the file picker) and reads only the bytes it needs with
 * slice(): a deck with 100 MB of pictures and sounds costs no more than the one file we want.
 *
 *   end of central directory (last bytes of the file) → central directory (list of all files)
 *   → local header of one file → its data, stored (method 0) or deflated (method 8)
 *
 * Errors are plain Errors in English – anki.js turns them into a message for the learner.
 */

/**
 * @typedef {object} ZipEntry
 * @property {string} name
 * @property {number} method          0 = stored, 8 = deflated
 * @property {number} compressedSize  bytes in the archive
 * @property {number} size            bytes when unpacked
 * @property {number} offset          where its local header starts
 */

const END = 0x06054b50; // "PK\5\6"
const CENTRAL = 0x02014b50; // "PK\1\2"
const LOCAL = 0x04034b50; // "PK\3\4"
/** a size or offset too big for 32 bits – the real value is in a ZIP64 record */
const ZIP64 = 0xffffffff;

/**
 * The list of files in the archive.
 * @param {Blob} blob
 * @returns {Promise<ZipEntry[]>}
 */
export async function listZip(blob) {
	// the end record is 22 bytes, plus a comment of up to 65535 bytes
	const tailStart = Math.max(0, blob.size - 22 - 0xffff);
	const tail = await view(blob, tailStart, blob.size);
	let at = tail.byteLength - 22;
	while (at >= 0 && tail.getUint32(at, true) !== END) at--;
	if (at < 0) throw new Error('Not a ZIP archive');

	// The number of entries is not needed (and wrong above 65535 files): the directory
	// simply ends where its size says.
	const size = tail.getUint32(at + 12, true);
	const offset = tail.getUint32(at + 16, true);
	if (size === ZIP64 || offset === ZIP64) throw new Error('ZIP64 archives are not supported');

	const directory = await view(blob, offset, offset + size);
	const decoder = new TextDecoder();
	/** @type {ZipEntry[]} */
	const entries = [];
	let p = 0;
	while (p + 46 <= directory.byteLength && directory.getUint32(p, true) === CENTRAL) {
		const nameLength = directory.getUint16(p + 28, true);
		entries.push({
			name: decoder.decode(new Uint8Array(directory.buffer, p + 46, nameLength)),
			method: directory.getUint16(p + 10, true),
			compressedSize: directory.getUint32(p + 20, true),
			size: directory.getUint32(p + 24, true),
			offset: directory.getUint32(p + 42, true)
		});
		// name, extra field, comment
		p += 46 + nameLength + directory.getUint16(p + 30, true) + directory.getUint16(p + 32, true);
	}
	return entries;
}

/**
 * The unpacked content of one file.
 * @param {Blob} blob
 * @param {ZipEntry} entry  from listZip()
 * @returns {Promise<Uint8Array<ArrayBuffer>>}
 */
export async function readZipEntry(blob, entry) {
	if (entry.offset === ZIP64 || entry.compressedSize === ZIP64) {
		throw new Error(`${entry.name}: ZIP64 is not supported`);
	}
	const header = await view(blob, entry.offset, entry.offset + 30);
	if (header.byteLength < 30 || header.getUint32(0, true) !== LOCAL) {
		throw new Error(`${entry.name}: local header missing`);
	}
	// the local header has its own lengths for name and extra field
	const start = entry.offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
	const data = blob.slice(start, start + entry.compressedSize);

	if (entry.method === 0) return new Uint8Array(await data.arrayBuffer());
	if (entry.method === 8) {
		const stream = data.stream().pipeThrough(new DecompressionStream('deflate-raw'));
		return new Uint8Array(await new Response(stream).arrayBuffer());
	}
	throw new Error(`${entry.name}: compression method ${entry.method} is not supported`);
}

/**
 * @param {Blob} blob
 * @param {number} start
 * @param {number} end
 */
async function view(blob, start, end) {
	return new DataView(await blob.slice(start, end).arrayBuffer());
}
