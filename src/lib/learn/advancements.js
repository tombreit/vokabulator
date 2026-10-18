// @ts-check
/**
 * Erfolge (advancements): small goals that unlock once, with a message at the
 * top right ("Erfolg freigeschaltet!") and a place on the /erfolge page.
 *
 * Each advancement has a pure `check` over the facts of a finished round. The learning
 * page calls newAdvancements() at the end of every round and stores the new ids with
 * the date in stats.advancements. To add one, add an entry below – that is all.
 */

import { levelFor } from './level.js';

/**
 * What the checks can look at, after a round.
 * @typedef {object} RoundFacts
 * @property {number} known           words known (right or typo) in the round
 * @property {number} planned         words in the round
 * @property {number} bestStreak      most right answers in a row
 * @property {boolean} usedJokers     torch or spyglass used
 * @property {boolean} timeUp         the chess clock ran out
 * @property {number} clockShareLeft  share of the chess clock left at the end, 0..1 (0 without clock)
 * @property {boolean} beatRecord     beat an earlier record in this world (not the first one)
 * @property {number[]} boxes         the boxes (1..5) of all words of the world, after the round
 * @property {number} xpTotal         all XP ever earned, including this round
 * @property {number} days            days in a row, including today
 */

/**
 * @typedef {object} Advancement
 * @property {string} id
 * @property {string} sprite  see #lib/pixel/sprites.js
 * @property {string} title
 * @property {string} text    what you have to do
 * @property {(facts: RoundFacts) => boolean} check
 */

/** @type {Advancement[]} */
export const ADVANCEMENTS = [
	{
		id: 'first-round',
		sprite: 'pickaxe',
		title: "Auf geht's!",
		text: 'Die erste Runde geschafft.',
		check: () => true
	},
	{
		id: 'first-diamond',
		sprite: 'diamond',
		title: 'Diamanten!',
		text: 'Eine Vokabel bis zum Diamanten gebracht.',
		check: (f) => f.boxes.includes(5)
	},
	{
		id: 'iron-age',
		sprite: 'iron',
		title: 'Eisenzeit',
		text: '10 Vokabeln einer Welt mindestens auf Eisen.',
		check: (f) => f.boxes.filter((box) => box >= 3).length >= 10
	},
	{
		id: 'combo',
		sprite: 'xp',
		title: 'Combo-Meister',
		text: '6 richtige Antworten in Folge.',
		check: (f) => f.bestStreak >= 6
	},
	{
		id: 'flawless',
		sprite: 'star',
		title: 'Makellos',
		text: 'Eine Runde mit mindestens 10 Vokabeln ohne Fehler.',
		check: (f) => f.planned >= 10 && f.known === f.planned
	},
	{
		id: 'no-torch',
		sprite: 'torch',
		title: 'Ohne Fackel',
		text: 'Eine Runde mit mindestens 10 Vokabeln ohne Fehler und ohne Joker.',
		check: (f) => f.planned >= 10 && f.known === f.planned && !f.usedJokers
	},
	{
		id: 'record',
		sprite: 'chest',
		title: 'Neuer Rekord',
		text: 'Den eigenen Rekord in einer Welt geschlagen.',
		check: (f) => f.beatRecord
	},
	{
		id: 'speedrun',
		sprite: 'clock',
		title: 'Speedrunner',
		text: 'Mit Schachuhr fertig – und noch die Hälfte der Zeit übrig.',
		check: (f) => !f.timeUp && f.clockShareLeft >= 0.5
	},
	{
		id: 'days-3',
		sprite: 'sun',
		title: '3 Tage überlebt',
		text: 'An drei Tagen hintereinander gelernt.',
		check: (f) => f.days >= 3
	},
	{
		id: 'days-7',
		sprite: 'sun',
		title: 'Eine Woche überlebt',
		text: 'Sieben Tage am Stück gelernt.',
		check: (f) => f.days >= 7
	},
	{
		id: 'diamond-mine',
		sprite: 'diamond',
		title: 'Diamantenmine',
		text: 'Alle Vokabeln einer Welt sind Diamanten.',
		check: (f) => f.boxes.length > 0 && f.boxes.every((box) => box === 5)
	},
	{
		id: 'level-10',
		sprite: 'book',
		title: 'Level 10',
		text: 'Level 10 erreicht.',
		check: (f) => levelFor(f.xpTotal).level >= 10
	}
];

/**
 * The advancements this round unlocks.
 * @param {RoundFacts} facts
 * @param {Record<string, string>} unlocked  already unlocked: id → date
 * @returns {Advancement[]}
 */
export function newAdvancements(facts, unlocked) {
	return ADVANCEMENTS.filter((a) => !unlocked[a.id] && a.check(facts));
}
