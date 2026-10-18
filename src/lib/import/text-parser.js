// @ts-check
/**
 * Import vocabulary from pasted text – works for any language and any source.
 *
 * Format, one word per line:
 *
 *   # Lektion 3                    ← a line starting with "#" begins a new section
 *   amicus = der Freund            ← foreign word, separator, German meaning
 *   the dog ; der Hund
 *   el perro<TAB>der Hund
 *
 * Separators (the first one found wins, checked in this order):
 *   TAB, " = ", " - ", " – ", ";"
 * Empty lines are ignored. Lines without separator are reported as errors.
 */

/** @typedef {import('../model.js').ParsedUnit} ParsedUnit */
/** @typedef {import('../model.js').ParsedSection} ParsedSection */

const SEPARATORS = ['\t', ' = ', ' - ', ' – ', ';'];

/**
 * @param {string} text
 * @param {string} title  title of the unit
 * @returns {{ parsed: ParsedUnit, errors: { lineNumber: number, line: string }[] }}
 */
export function parseText(text, title) {
	/** @type {ParsedSection[]} */
	const sections = [];
	/** @type {{ lineNumber: number, line: string }[]} */
	const errors = [];
	/** @type {ParsedSection | undefined} */
	let current;

	text.split(/\r?\n/).forEach((rawLine, index) => {
		const line = rawLine.trim();
		if (line === '') return;

		if (line.startsWith('#')) {
			current = { title: line.replace(/^#+/, '').trim(), entries: [] };
			sections.push(current);
			return;
		}

		const pair = splitLine(line);
		if (!pair) {
			errors.push({ lineNumber: index + 1, line });
			return;
		}

		if (!current) {
			current = { title: 'Alle Wörter', entries: [] };
			sections.push(current);
		}
		current.entries.push({ front: pair[0], back: pair[1] });
	});

	return { parsed: { title, sections }, errors };
}

/**
 * "amicus = der Freund" -> ["amicus", "der Freund"], or undefined if no separator.
 * @param {string} line
 * @returns {[string, string] | undefined}
 */
function splitLine(line) {
	for (const separator of SEPARATORS) {
		const at = line.indexOf(separator);
		if (at === -1) continue;
		const front = line.slice(0, at).trim();
		const back = line.slice(at + separator.length).trim();
		return front && back ? [front, back] : undefined;
	}
	return undefined;
}
