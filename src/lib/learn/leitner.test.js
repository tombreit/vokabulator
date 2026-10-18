import { describe, expect, it } from 'vitest';
import {
	learnedShare,
	newProgress,
	stageOf,
	pickRound,
	recordAnswer,
	shuffle,
	toggleHard
} from './leitner.js';

/** @param {string} id */
const entry = (id) => ({ id, front: id, frontInfo: '', back: id, refs: '' });
const noRandom = () => 0;

describe('recordAnswer', () => {
	it('moves a known word one box up, at most to box 5', () => {
		let p = newProgress();
		for (let i = 0; i < 7; i++) p = recordAnswer(p, true, 1000);
		expect(p).toEqual({ box: 5, hard: false, right: 7, wrong: 0, lastSeen: 1000 });
	});

	it('sends an unknown word back to box 1', () => {
		const p = recordAnswer({ ...newProgress(), box: 4, right: 3 }, false, 2000);
		expect(p).toEqual({ box: 1, hard: false, right: 3, wrong: 1, lastSeen: 2000 });
	});

	it('keeps the hard mark', () => {
		const p = recordAnswer(toggleHard(newProgress()), true);
		expect(p.hard).toBe(true);
	});
});

describe('pickRound', () => {
	const entries = ['a', 'b', 'c', 'd'].map(entry);

	it('prefers low boxes', () => {
		const progress = {
			a: { ...newProgress(), box: 5 },
			b: { ...newProgress(), box: 1 },
			c: { ...newProgress(), box: 3 },
			d: { ...newProgress(), box: 2 }
		};
		const round = pickRound(entries, progress, 2, noRandom);
		expect(round.map((e) => e.id).sort()).toEqual(['b', 'd']);
	});

	it('lets hard words jump two boxes ahead', () => {
		const progress = {
			a: { ...newProgress(), box: 3, hard: true }, // score 1
			b: { ...newProgress(), box: 2 }, // score 2
			c: { ...newProgress(), box: 2 },
			d: { ...newProgress(), box: 2 }
		};
		const round = pickRound(entries, progress, 1, noRandom);
		expect(round.map((e) => e.id)).toEqual(['a']);
	});

	it('prefers words not asked for a long time when the score is equal', () => {
		const progress = {
			a: { ...newProgress(), lastSeen: 300 },
			b: { ...newProgress(), lastSeen: 100 },
			c: { ...newProgress(), lastSeen: 200 },
			d: { ...newProgress(), lastSeen: 400 }
		};
		const round = pickRound(entries, progress, 2, noRandom);
		expect(round.map((e) => e.id).sort()).toEqual(['b', 'c']);
	});

	it('returns all words for size 0', () => {
		expect(pickRound(entries, {}, 0)).toHaveLength(4);
	});
});

describe('learnedShare', () => {
	it('counts words from box 4 on', () => {
		const entries = ['a', 'b', 'c', 'd'].map(entry);
		const progress = { a: { ...newProgress(), box: 4 }, b: { ...newProgress(), box: 5 } };
		expect(learnedShare(entries, progress)).toBe(0.5);
		expect(learnedShare([], progress)).toBe(0);
	});
});

describe('shuffle', () => {
	it('keeps all items', () => {
		expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
	});
});

describe('stageOf', () => {
	it('goes from stone to diamond and stays in range', () => {
		expect([0, 1, 2, 3, 4, 5, 9].map((box) => stageOf(box).item)).toEqual([
			'Stein',
			'Stein',
			'Kohle',
			'Eisenbarren',
			'Goldbarren',
			'Diamant',
			'Diamant'
		]);
	});
});
