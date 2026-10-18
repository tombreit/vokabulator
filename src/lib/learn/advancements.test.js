import { describe, expect, it } from 'vitest';
import { ADVANCEMENTS, newAdvancements } from './advancements.js';

/** @type {import('./advancements.js').RoundFacts} */
const base = {
	known: 3,
	planned: 5,
	bestStreak: 2,
	usedJokers: true,
	timed: false,
	timeouts: 0,
	beatRecord: false,
	boxes: [1, 1, 2],
	xpTotal: 50,
	days: 1
};

/** @param {Partial<typeof base>} facts */
const ids = (facts, unlocked = {}) =>
	newAdvancements({ ...base, ...facts }, unlocked).map((a) => a.id);

describe('newAdvancements', () => {
	it('unlocks "Auf geht\'s!" after the first round, and only once', () => {
		expect(ids({})).toEqual(['first-round']);
		expect(ids({}, { 'first-round': '2026-10-18' })).toEqual([]);
	});

	it('knows stage 5, stage 3 and a whole unit on stage 5', () => {
		expect(ids({ boxes: [1, 5] })).toContain('first-diamond');
		expect(ids({ boxes: Array(10).fill(3) })).toContain('iron-age');
		expect(ids({ boxes: Array(9).fill(3) })).not.toContain('iron-age');
		expect(ids({ boxes: [5, 5, 5] })).toContain('diamond-mine');
		expect(ids({ boxes: [] })).not.toContain('diamond-mine');
	});

	it('rewards flawless rounds – without jokers even more', () => {
		expect(ids({ known: 10, planned: 10 })).toEqual(['first-round', 'flawless']);
		expect(ids({ known: 10, planned: 10, usedJokers: false })).toContain('no-torch');
		expect(ids({ known: 5, planned: 5, usedJokers: false })).not.toContain('flawless');
	});

	it('combo, record, speedrun, days and level', () => {
		expect(ids({ bestStreak: 6 })).toContain('combo');
		expect(ids({ beatRecord: true })).toContain('record');
		expect(ids({ timed: true, planned: 10 })).toContain('speedrun');
		expect(ids({ timed: true, planned: 10, timeouts: 1 })).not.toContain('speedrun');
		expect(ids({ timed: false, planned: 10 })).not.toContain('speedrun');
		expect(ids({ days: 7 })).toEqual(expect.arrayContaining(['days-3', 'days-7']));
		expect(ids({ xpTotal: 3250 })).toContain('level-10');
	});
});

describe('ADVANCEMENTS', () => {
	it('have unique ids and a sprite', () => {
		expect(new Set(ADVANCEMENTS.map((a) => a.id)).size).toBe(ADVANCEMENTS.length);
		for (const a of ADVANCEMENTS) expect(a.sprite).toBeTruthy();
	});
});
