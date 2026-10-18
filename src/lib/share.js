// @ts-check
/**
 * Share links – nothing is stored on a server:
 *
 *   C.C.Buchner unit   /neu?code=40702-229
 *                      only the Mediencode; the friend's phone loads the PDF itself
 *   any other unit     /neu#d=<words>
 *                      the words travel inside the link, compressed. The part after "#"
 *                      is never sent to a server.
 *   challenge          …&challenge=57&mode=typing&words=10&direction=front-back&clock=60
 *                      "Schlag 57 Punkte!" – with the same settings, so it is fair
 */

/** @typedef {import('./model.js').Unit} Unit */
/** @typedef {import('./model.js').UnitDraft} UnitDraft */
/** @typedef {import('./storage.js').Settings} Settings */

/**
 * @typedef {object} Challenge
 * @property {number} points  to beat
 * @property {Settings['mode']} mode
 * @property {number} roundSize
 * @property {Settings['direction']} direction
 * @property {number} clock  seconds, 0 = off
 */

/**
 * The path (with query and hash) that brings a friend to this unit.
 * @param {Unit} unit
 * @param {Challenge} [challenge]
 * @returns {Promise<string>}  e.g. "/neu?code=40702-229" – prefix it with the origin
 */
export async function sharePath(unit, challenge) {
	const query = new URLSearchParams(challenge ? challengeParams(challenge) : {});
	if (unit.source.type === 'ccbuchner') {
		query.set('code', unit.source.code);
		return `/neu?${query}`;
	}
	return `/neu${query.size ? `?${query}` : ''}#d=${await packUnit(unit)}`;
}

/**
 * @param {Challenge} challenge
 * @returns {Record<string, string>}
 */
export function challengeParams({ points, mode, roundSize, direction, clock }) {
	return {
		challenge: String(points),
		mode,
		words: String(roundSize),
		direction,
		clock: String(clock)
	};
}

/**
 * Read a challenge from the query of a link (undefined if there is none).
 * @param {Pick<URLSearchParams, 'get'>} query
 * @returns {Challenge | undefined}
 */
export function readChallenge(query) {
	const points = Number(query.get('challenge'));
	if (!points) return undefined;
	const pick = (
		/** @type {string} */ key,
		/** @type {string[]} */ allowed,
		/** @type {string} */ fallback
	) => {
		const value = query.get(key) ?? '';
		return allowed.includes(value) ? value : fallback;
	};
	return {
		points,
		mode: /** @type {Challenge['mode']} */ (pick('mode', ['cards', 'typing', 'choice'], 'cards')),
		roundSize: Number(pick('words', ['10', '20', '0'], '10')),
		direction: /** @type {Challenge['direction']} */ (
			pick('direction', ['front-back', 'back-front', 'mixed'], 'front-back')
		),
		clock: Number(pick('clock', ['0', '60', '180', '300'], '0'))
	};
}

/**
 * Keep the challenge of the current link when moving on, e.g. from /neu?code=…&challenge=57
 * to /lernen/ccb-…?challenge=57, so the learning page can show and check it.
 * @param {string} path
 * @param {{ searchParams: Pick<URLSearchParams, 'get'> }} from  the current URL
 */
export function withChallenge(path, from) {
	const challenge = readChallenge(from.searchParams);
	return challenge ? `${path}?${new URLSearchParams(challengeParams(challenge))}` : path;
}

// --- words inside the link ---------------------------------------------------

/**
 * Unit → short text for the link: compact JSON, deflate-compressed, base64url.
 * @param {Unit} unit
 */
export async function packUnit(unit) {
	const byId = new Map(unit.entries.map((e) => [e.id, e]));
	const compact = {
		i: unit.id,
		t: unit.title,
		l: unit.lang,
		s: unit.sections.map((section) => [
			section.title,
			section.entryIds.map((id) => {
				const e = /** @type {import('./model.js').Entry} */ (byId.get(id));
				return [e.front, e.frontInfo, e.back];
			})
		])
	};
	const bytes = await transform(
		new TextEncoder().encode(JSON.stringify(compact)),
		new CompressionStream('deflate-raw')
	);
	return toBase64Url(bytes);
}

/**
 * Text from a link → what the importers deliver (shown in the preview, then saved).
 * @param {string} packed
 * @returns {Promise<UnitDraft>}
 */
export async function unpackUnit(packed) {
	const bytes = await transform(fromBase64Url(packed), new DecompressionStream('deflate-raw'));
	/** @type {{ i: string, t: string, l: import('./model.js').Lang, s: [string, [string, string, string][]][] }} */
	const compact = JSON.parse(new TextDecoder().decode(bytes));
	return {
		id: compact.i,
		lang: compact.l,
		source: { type: 'text' },
		parsed: {
			title: compact.t,
			sections: compact.s.map(([title, entries]) => ({
				title,
				entries: entries.map(([front, frontInfo, back]) => ({ front, frontInfo, back }))
			}))
		}
	};
}

/**
 * @param {Uint8Array<ArrayBuffer>} bytes
 * @param {CompressionStream | DecompressionStream} stream
 */
async function transform(bytes, stream) {
	const output = new Blob([bytes]).stream().pipeThrough(stream);
	return new Uint8Array(await new Response(output).arrayBuffer());
}

/** @param {Uint8Array} bytes */
function toBase64Url(bytes) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string} text */
function fromBase64Url(text) {
	const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
