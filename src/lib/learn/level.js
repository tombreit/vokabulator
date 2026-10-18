// @ts-check
/**
 * The learner's level, like in the game: the XP of all rounds add up, and every
 * level needs a bit more than the one before.
 *
 *   level n → n+1 costs 100 + 50·n XP
 *   so: level 1 after 100 XP, level 2 after 250, level 3 after 450, level 10 after 3250 …
 *
 * A round of 10 words brings roughly 100–250 XP, so there is a level-up every round or two
 * at first, and a bit less often later.
 */

/**
 * XP needed to get from this level to the next.
 * @param {number} level
 */
export function xpToNextLevel(level) {
	return 100 + 50 * level;
}

/**
 * @param {number} xp  all XP ever earned
 * @returns {{ level: number, into: number, needed: number, share: number }}
 *   into: XP collected in the current level; needed: XP the current level asks for; share: into / needed
 */
export function levelFor(xp) {
	let level = 0;
	let rest = Math.max(0, Math.floor(xp));
	while (rest >= xpToNextLevel(level)) {
		rest -= xpToNextLevel(level);
		level++;
	}
	const needed = xpToNextLevel(level);
	return { level, into: rest, needed, share: rest / needed };
}
