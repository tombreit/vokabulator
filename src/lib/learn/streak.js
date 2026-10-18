// @ts-check
/**
 * "🔥 3 Tage in Folge": on how many days in a row a round was finished.
 * Days are the learner's local calendar days ("2026-10-18").
 */

/** @typedef {{ lastDay: string, days: number }} DayStreak */

/**
 * Today (or the given date) as local "YYYY-MM-DD".
 * @param {Date} [date]
 */
export function localDay(date = new Date()) {
	const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A round was finished today.
 * @param {DayStreak} streak
 * @param {string} today  "YYYY-MM-DD"
 * @returns {DayStreak}
 */
export function recordDay(streak, today) {
	if (streak.lastDay === today) return streak;
	const continues = streak.lastDay === dayBefore(today);
	return { lastDay: today, days: continues ? streak.days + 1 : 1 };
}

/**
 * Days in a row as of today – 0 if the chain is broken (nothing yesterday or today).
 * @param {DayStreak} streak
 * @param {string} today
 */
export function currentDays(streak, today) {
	return streak.lastDay === today || streak.lastDay === dayBefore(today) ? streak.days : 0;
}

/** @param {string} day  "YYYY-MM-DD" */
function dayBefore(day) {
	const date = new Date(`${day}T12:00:00`); // noon: safe across daylight saving changes
	date.setDate(date.getDate() - 1);
	return localDay(date);
}
