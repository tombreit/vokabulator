import { describe, expect, it } from 'vitest';
import { choicesFor } from './choices.js';

/** @param {string} id @param {string} back */
const entry = (id, back) => ({ id, front: id, frontInfo: '', back, refs: '' });

const entries = [
	entry('amicus', 'der Freund'),
	entry('via', 'der Weg'),
	entry('porta', 'die Tür'),
	entry('aqua', 'das Wasser'),
	entry('amica', 'der Freund') // same meaning as amicus – must not appear as a "wrong" answer
];

describe('choicesFor', () => {
	it('offers the right answer and three different wrong ones', () => {
		for (let i = 0; i < 20; i++) {
			const choices = choicesFor(entries[0], entries, false);
			expect(choices).toHaveLength(4);
			expect(choices.filter((c) => c.right)).toEqual([{ text: 'der Freund', right: true }]);
			expect(new Set(choices.map((c) => c.text)).size).toBe(4);
		}
	});

	it('uses the foreign words when asking German → foreign', () => {
		const texts = choicesFor(entries[1], entries, true).map((c) => c.text);
		expect(texts).toContain('via');
		expect(texts.every((t) => entries.some((e) => e.front === t))).toBe(true);
	});

	it('works with tiny units', () => {
		expect(choicesFor(entries[0], entries.slice(0, 2), false)).toHaveLength(2);
	});
});
