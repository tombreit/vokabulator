// @ts-check
/**
 * Multiple choice: the right answer plus three wrong ones from the same unit.
 */

import { shuffle } from './leitner.js';

/** @typedef {import('../model.js').Entry} Entry */

/**
 * @param {Entry} entry      the word being asked
 * @param {Entry[]} entries  all words of the unit (the wrong answers come from here)
 * @param {boolean} reverse  true = the answers are foreign words, false = German meanings
 * @param {() => number} [random]
 * @returns {{ text: string, right: boolean }[]}  four (or fewer for tiny units) answers in random order
 */
export function choicesFor(entry, entries, reverse, random = Math.random) {
	const label = (/** @type {Entry} */ e) => (reverse ? e.front : e.back);
	const right = label(entry);

	const wrong = [...new Set(shuffle(entries, random).map(label))]
		.filter((text) => text !== right)
		.slice(0, 3);

	return shuffle(
		[{ text: right, right: true }, ...wrong.map((text) => ({ text, right: false }))],
		random
	);
}
