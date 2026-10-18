import { describe, expect, it } from 'vitest';
import { multiplier, newScore, scoreAnswer, speedBonus, useJoker } from './scoring.js';

/** @param {import('./check-answer.js').Outcome[]} outcomes */
function play(outcomes) {
	let score = newScore();
	const gained = [];
	for (const outcome of outcomes) {
		const result = scoreAnswer(score, outcome);
		score = result.score;
		gained.push(result.gained);
	}
	return { score, gained };
}

describe('scoreAnswer', () => {
	it('gives 10 per right answer, doubled from 3 and tripled from 6 in a row', () => {
		const { score, gained } = play(Array(7).fill('right'));
		expect(gained).toEqual([10, 10, 20, 20, 20, 30, 30]);
		expect(score.points).toBe(140);
		expect(score.bestStreak).toBe(7);
	});

	it('gives half for a typo and keeps the combo going', () => {
		expect(play(['right', 'right', 'typo']).gained).toEqual([10, 10, 10]);
	});

	it('resets the combo on a wrong answer but remembers the best streak', () => {
		const { score, gained } = play(['right', 'right', 'right', 'wrong', 'right']);
		expect(gained).toEqual([10, 10, 20, 0, 10]);
		expect(score).toMatchObject({ streak: 1, bestStreak: 3, points: 50 });
	});

	it('costs 3 points when the tip was used, never below zero', () => {
		expect(scoreAnswer(newScore(), 'right', { tip: true }).gained).toBe(7);
		expect(scoreAnswer(newScore(), 'typo', { tip: true }).gained).toBe(2);
	});

	it('reports when a higher combo is reached', () => {
		const ups = [];
		let score = newScore();
		for (let i = 0; i < 7; i++) {
			const result = scoreAnswer(score, 'right');
			ups.push(result.comboUp);
			score = result.score;
		}
		expect(ups).toEqual([false, false, true, false, false, true, false]);
	});
});

describe('jokers, multiplier and time bonus', () => {
	it('has 3 jokers per round and never goes below 0', () => {
		let score = newScore();
		for (let i = 0; i < 5; i++) score = useJoker(score);
		expect(score.jokers).toBe(0);
	});

	it('multiplier', () => {
		expect([0, 1, 2, 3, 5, 6, 10].map(multiplier)).toEqual([1, 1, 1, 2, 2, 3, 3]);
	});

	it('gives up to 5 points for a fast answer', () => {
		expect([1, 0.5, 0.29, 0, 1.2, -1].map(speedBonus)).toEqual([5, 3, 1, 0, 5, 0]);
	});

	it('adds the speed bonus to a right answer, not to a wrong one', () => {
		expect(scoreAnswer(newScore(), 'right', { bonus: 4 }).gained).toBe(14);
		expect(scoreAnswer(newScore(), 'wrong', { bonus: 4 }).gained).toBe(0);
	});
});
