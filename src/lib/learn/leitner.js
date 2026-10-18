// @ts-check
/**
 * Learning progress following the Leitner system (the classic card box).
 *
 * Every word sits in one of 5 boxes. Known → one box up, not known → back to box 1.
 * Words in low boxes and words marked as "hard" (⭐) are asked more often.
 *
 * Unlike Anki there are no due dates: a vocabulary test is usually a few days
 * away, so every round simply picks the words that need practice most.
 */

/** @typedef {import('../model.js').Entry} Entry */

/**
 * Progress of one word.
 * @typedef {object} EntryProgress
 * @property {number} box       1..5
 * @property {boolean} hard     marked as difficult by the learner (⭐)
 * @property {number} right     how often known
 * @property {number} wrong     how often not known
 * @property {number} lastSeen  timestamp (ms) of the last answer, 0 = never asked
 */

/** Progress of all words of a unit, by entry id. Words never asked are missing.
 * @typedef {Record<string, EntryProgress>} UnitProgress
 */

export const BOX_COUNT = 5;
/** From this box on a word counts as learned. */
export const LEARNED_BOX = 4;

/** @returns {EntryProgress} */
export function newProgress() {
	return { box: 1, hard: false, right: 0, wrong: 0, lastSeen: 0 };
}

/**
 * @param {UnitProgress} progress
 * @param {string} entryId
 */
export function progressOf(progress, entryId) {
	return progress[entryId] ?? newProgress();
}

/**
 * Record one answer.
 * @param {EntryProgress} p
 * @param {boolean} known
 * @param {number} [now]
 * @returns {EntryProgress}
 */
export function recordAnswer(p, known, now = Date.now()) {
	return {
		...p,
		box: known ? Math.min(p.box + 1, BOX_COUNT) : 1,
		right: p.right + (known ? 1 : 0),
		wrong: p.wrong + (known ? 0 : 1),
		lastSeen: now
	};
}

/**
 * @param {EntryProgress} p
 * @returns {EntryProgress}
 */
export function toggleHard(p) {
	return { ...p, hard: !p.hard };
}

/**
 * Choose the words for one round.
 *
 * Every word gets an urgency score, lowest first:
 *   score = box − 2 if marked hard + a random bit (0..1.5)
 * so hard words jump two boxes ahead, and the random bit mixes neighbouring
 * boxes so that rounds do not always look the same. On equal score, the word
 * not asked for the longest time wins. The chosen words are then shuffled.
 *
 * @param {Entry[]} entries
 * @param {UnitProgress} progress
 * @param {number} size  number of words, 0 = all
 * @param {() => number} [random]
 * @returns {Entry[]}
 */
export function pickRound(entries, progress, size, random = Math.random) {
	const ranked = entries
		.map((entry) => {
			const p = progressOf(progress, entry.id);
			return { entry, score: p.box - (p.hard ? 2 : 0) + random() * 1.5, lastSeen: p.lastSeen };
		})
		.sort((a, b) => a.score - b.score || a.lastSeen - b.lastSeen);

	const chosen = ranked.slice(0, size > 0 ? size : undefined).map((r) => r.entry);
	return shuffle(chosen, random);
}

/**
 * Share of words that are learned (box ≥ LEARNED_BOX), from 0 to 1.
 * @param {Entry[]} entries
 * @param {UnitProgress} progress
 */
export function learnedShare(entries, progress) {
	if (entries.length === 0) return 0;
	const learned = entries.filter((e) => progressOf(progress, e.id).box >= LEARNED_BOX);
	return learned.length / entries.length;
}

/**
 * Fisher–Yates shuffle, returns a new array.
 * @template T
 * @param {T[]} items
 * @param {() => number} [random]
 * @returns {T[]}
 */
export function shuffle(items, random = Math.random) {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
