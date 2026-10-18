// @ts-check
/**
 * Learning progress following the Leitner system (the classic card box).
 *
 * Every word sits in one of 5 boxes. Known → one box up, not known → back to box 1.
 * Words in low boxes and words marked as "hard" (⭐) are asked more often.
 */

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
