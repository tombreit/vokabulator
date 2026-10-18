// @ts-check
/**
 * Points of a round – the game part of learning.
 *
 *   right answer          +10
 *   typo (see check-answer.js) +5
 *   wrong / revealed        0, and the combo is gone
 *   combo                 ×2 from 3 right answers in a row, ×3 from 6 in a row
 *   💡 joker (tip)         −3 on that answer (first letter, or 50:50 in multiple choice)
 *   ⏱️ time per word       speed bonus for a right answer: up to +5, by the share of time left
 *
 * Every round starts with 3 jokers (tip or reveal).
 */

/** @typedef {import('./check-answer.js').Outcome} Outcome */

export const POINTS_RIGHT = 10;
export const POINTS_TYPO = 5;
export const TIP_COST = 3;
export const JOKERS_PER_ROUND = 3;
export const MAX_SPEED_BONUS = 5;

/**
 * @typedef {object} Score
 * @property {number} points
 * @property {number} streak      right answers in a row right now
 * @property {number} bestStreak
 * @property {number} jokers      left in this round
 */

/** @returns {Score} */
export function newScore() {
	return { points: 0, streak: 0, bestStreak: 0, jokers: JOKERS_PER_ROUND };
}

/**
 * Combo multiplier for the n-th right answer in a row.
 * @param {number} streak
 */
export function multiplier(streak) {
	return streak >= 6 ? 3 : streak >= 3 ? 2 : 1;
}

/**
 * @param {Score} score  before this answer
 * @param {Outcome} outcome
 * @param {{ tip?: boolean, bonus?: number }} [extra]
 *   tip: the tip joker was used for this answer; bonus: speed bonus (see speedBonus)
 * @returns {{ score: Score, gained: number, comboUp: boolean }}
 *   comboUp: this answer reached a higher multiplier (time to celebrate)
 */
export function scoreAnswer(score, outcome, { tip = false, bonus = 0 } = {}) {
	if (outcome === 'wrong') {
		return { score: { ...score, streak: 0 }, gained: 0, comboUp: false };
	}
	const streak = score.streak + 1;
	const base = outcome === 'right' ? POINTS_RIGHT : POINTS_TYPO;
	const gained = Math.max(0, base * multiplier(streak) - (tip ? TIP_COST : 0)) + bonus;
	return {
		score: {
			...score,
			points: score.points + gained,
			streak,
			bestStreak: Math.max(score.bestStreak, streak)
		},
		gained,
		comboUp: multiplier(streak) > multiplier(streak - 1)
	};
}

/**
 * @param {Score} score
 * @returns {Score}
 */
export function useJoker(score) {
	return { ...score, jokers: Math.max(0, score.jokers - 1) };
}

/**
 * Bonus for answering fast when there is a time per word.
 * @param {number} shareLeft  of the time for this word, 0..1
 */
export function speedBonus(shareLeft) {
	return Math.round(MAX_SPEED_BONUS * Math.min(Math.max(shareLeft, 0), 1));
}
