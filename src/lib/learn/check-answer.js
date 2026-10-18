// @ts-check
/**
 * Is a typed answer right? Strict enough to learn something, kind enough not to
 * frustrate. Rules:
 *
 *  - Case, macrons and breves do not matter ("capiō" = "capio"); umlauts do. "ß" = "ss".
 *  - Things in (brackets), leading articles (der/die/das, the/a/to, el/la …) and
 *    "sich", and grammar abbreviations like "m." "dopp." "Akk." "jdn." are ignored.
 *  - German meanings: one of them is enough ("nehmen" for "nehmen, ergreifen; erobern").
 *    Several typed meanings ("nehmen, fangen") must all be right.
 *  - Latin: the first form is enough ("capere" for "capere, capiō, cēpī, captum"),
 *    the whole lemma counts too. Other languages: any of the listed words.
 *  - One wrong letter in a word of 4 or more letters is a typo: it counts, but
 *    gives fewer points (see scoring.js).
 */

/** @typedef {import('../model.js').Entry} Entry */
/** @typedef {import('../model.js').Lang} Lang */
/** @typedef {'right' | 'typo' | 'wrong'} Outcome */

const IGNORED_LEADING_WORDS = new Set([
	...['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'sich'],
	...['the', 'a', 'an', 'to'],
	...['el', 'la', 'lo', 'los', 'las', 'un', 'una', 'unos', 'unas']
]);

/**
 * @param {string} given  what the learner typed
 * @param {Entry} entry
 * @param {boolean} reverse  true = asked for the foreign word (German → foreign)
 * @param {Lang} lang
 * @returns {Outcome}
 */
export function checkAnswer(given, entry, reverse, lang) {
	const accepted = reverse ? foreignAnswers(entry, lang) : meanings(entry.back);

	if (accepted.includes(normalize(given))) return 'right';

	const parts = meanings(given);
	if (parts.length === 0) return 'wrong';
	let typo = false;
	for (const part of parts) {
		if (accepted.includes(part)) continue;
		if (accepted.some((answer) => isTypo(part, answer))) typo = true;
		else return 'wrong';
	}
	return typo ? 'typo' : 'right';
}

/**
 * The accepted spellings of the foreign word.
 * @param {Entry} entry
 * @param {Lang} lang
 */
function foreignAnswers(entry, lang) {
	const listed = lang === 'la' ? entry.front.split(',')[0] : entry.front;
	return [...meanings(listed), normalize(entry.front)];
}

/**
 * Split a list of meanings at "," ";" and "/" (not inside brackets) and normalize each:
 * "in (… hinein), nach, gegen (wohin?)" → ["in", "nach", "gegen"]
 * @param {string} text
 * @returns {string[]}
 */
export function meanings(text) {
	return text
		.replace(/\([^)]*\)/g, ' ')
		.split(/[,;/]/)
		.map(normalize)
		.filter((m) => m !== '');
}

/**
 * "Der Plan (m. Gen.)" → "plan", "cēpī" → "cepi", "m. dopp. Akk. halten für" → "halten für"
 * @param {string} text
 */
export function normalize(text) {
	const words = text
		.normalize('NFD')
		.replace(/[̄̆]/g, '') // macron, breve
		.normalize('NFC')
		.toLowerCase()
		.replace(/ß/g, 'ss')
		.replace(/\([^)]*\)/g, ' ')
		.replace(/(?<!\p{L})\p{L}{1,5}\.(?!\p{L})/gu, ' ') // abbreviations: "m." "Akk." "jdn."
		.replace(/[^\p{L}\p{N}\s-]/gu, ' ')
		.split(/\s+/)
		.filter((w) => w !== '');

	while (words.length > 1 && IGNORED_LEADING_WORDS.has(words[0])) words.shift();
	return words.join(' ');
}

/**
 * Exactly one letter wrong, missing or too much – in a word that is long enough.
 * @param {string} given
 * @param {string} answer
 */
function isTypo(given, answer) {
	return (
		answer.length >= 4 &&
		Math.abs(given.length - answer.length) <= 1 &&
		distance(given, answer) === 1
	);
}

/**
 * Levenshtein distance: how many letters must be changed, added or removed.
 * @param {string} a
 * @param {string} b
 */
function distance(a, b) {
	let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
			current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
		}
		previous = current;
	}
	return previous[b.length];
}
