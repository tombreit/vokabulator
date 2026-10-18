// @ts-check
/**
 * What Vokabulator says after an answer and at the end of a round.
 * Plain data – change, add or remove phrases freely; one is picked at random.
 */

export const PHRASES = {
	right: [
		'Sheesh! 🔥',
		'No cap, korrekt! 💯',
		'Ehrenmove! 🫡',
		'Läuft bei dir! 😎',
		'Slay! ✨',
		'Sauber! 👌',
		'Treffer! 🎯',
		'Big Brain! 🧠',
		'Gefarmt! ⛏️',
		'Gut abgebaut! 💎'
	],
	/** {n} becomes the multiplier */
	combo: ['Combo ×{n}! 🔥🔥', 'On fire – ×{n}! 🚀', 'Unaufhaltbar – ×{n}! ⚡'],
	typo: [
		'Fast, Digga! 👀',
		'Ein Buchstabe – zählt halb. 🤏',
		'Knapp! Achte auf die Schreibweise. ✍️'
	],
	wrong: [
		'Bruh 💀',
		'Das war wohl nix 💩',
		'Autsch 🙈',
		'Oof 🫠',
		'Ssssss… 💥',
		'In Lava gefallen 🔥',
		'Nicht ganz – nächstes Mal! 💪'
	],
	revealed: ['Gespickt 👀 – merk sie dir!', 'Kein Ding, jetzt weißt du es. 💡'],
	timeUp: ['Zeit um! ⏰', 'Die Uhr war schneller. ⏰']
};

/** The yellow splash text on the start page – one at random each time. */
export const SPLASHES = [
	'Veni, vidi, vici!',
	'Carpe diem!',
	'Alea iacta est!',
	'Jetzt mit Ablativ!',
	'Auch mit Makronen!',
	'Cäsar-geprüft!',
	'Errare humanum est!',
	'Mit 100 % mehr Diamanten!',
	'Rom wurde auch nicht an einem Tag gebaut!',
	'Non scholae, sed vitae!',
	'Ssssss… cave!',
	'Per aspera ad astra!'
];

/** @param {() => number} [random] */
export function splash(random = Math.random) {
	return SPLASHES[Math.floor(random() * SPLASHES.length)];
}

/**
 * @param {keyof typeof PHRASES} kind
 * @param {Record<string, string | number>} [values]  fills placeholders like {n}
 * @param {() => number} [random]
 */
export function phrase(kind, values = {}, random = Math.random) {
	const list = PHRASES[kind];
	const text = list[Math.floor(random() * list.length)];
	return text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

/**
 * The headline of the result page.
 * @param {number} share  right answers, 0..1
 */
export function verdict(share) {
	if (share === 1) return { emoji: '🏆', text: 'Perfekt – GOAT! 🐐' };
	if (share >= 0.8) return { emoji: '🔥', text: 'Sheesh, stark!' };
	if (share >= 0.5) return { emoji: '👍', text: 'Läuft!' };
	return { emoji: '💪', text: 'Dranbleiben – das wird!' };
}
