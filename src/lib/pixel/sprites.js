// @ts-check
/**
 * All pixel art of Vokabulator, drawn by hand as 16 × 16 character grids.
 *
 * Every sprite has a palette (one character → one colour) and 16 rows of 16
 * characters; "." is transparent. To change a picture, edit the rows – it is
 * easiest with a monospace font. Rendered by Sprite.svelte (as SVG) or used as
 * CSS background via spriteDataUri().
 *
 * The style follows block-building games; all art here is original.
 */

/** @typedef {{ palette: Record<string, string>, rows: string[] }} SpriteDef */

// --- stone (the block: texture of the logo) ----------------------------------------

const STONE_ROWS = [
	'aaacaaabbaaacaaa',
	'abaaaacaaabaaaab',
	'aaabbaaaacaaaaba',
	'caaaaabaaaabbaaa',
	'aabaaaaccaaaaaac',
	'aaaacaaaaaabaaaa',
	'abaaaaaabaaaacaa',
	'aaaabbaaaaacaaab',
	'acaaaaaacaaaaaaa',
	'aaabaaaaaabbaaca',
	'baaaaacaaaaaaaaa',
	'aacaaaaaabaaacaa',
	'aaaaabaaaaaaaaab',
	'abaaaaaacaabaaaa',
	'aaacaaabaaaaaaca',
	'caaaabaaaacaabaa'
];

const STONE_PALETTE = { a: '#8f8f8f', b: '#747474', c: '#a8a8a8' };

/** iron and gold bars have the same shape */
const INGOT_ROWS = [
	'................',
	'................',
	'................',
	'.....oooooo.....',
	'....owwwwwlo....',
	'...owwllllllo...',
	'..owllllllllmo..',
	'.oooooooooooooo.',
	'.ommmmmmmmmmmdo.',
	'.ommmmmmmmmmmdo.',
	'.ommmmmmmmmmmdo.',
	'.oddddddddddddo.',
	'.oooooooooooooo.',
	'................',
	'................',
	'................'
];

/** @type {Record<string, SpriteDef>} */
export const SPRITES = {
	stone: { palette: STONE_PALETTE, rows: STONE_ROWS },

	// --- the five stages of a word (#lib/learn/leitner.js): each looks different ---
	rock: {
		palette: { o: '#3a3a3a', a: '#9a9a9a', b: '#7d7d7d', c: '#bdbdbd', d: '#666666' },
		rows: [
			'................',
			'................',
			'................',
			'................',
			'......ooooo.....',
			'....oocacaaoo...',
			'...ocaaabaacao..',
			'..ocaabaaaabado.',
			'..oaabaaacaaado.',
			'.oaaaaaabaaabdo.',
			'.obaacaaaaabddo.',
			'.odbaaaabaabddo.',
			'..oddbbbbbdddo..',
			'...ooooooooooo..',
			'................',
			'................'
		]
	},
	coal: {
		palette: { o: '#000000', k: '#202020', d: '#333333', g: '#4f4f4f', h: '#767676' },
		rows: [
			'................',
			'................',
			'......oooo......',
			'....ookkddoo....',
			'...okkdgkkddo...',
			'..okdhgkkkdkko..',
			'..okkgkkdkkgdo..',
			'.okkkkkdhgkkkko.',
			'.okdkkkkgkkdkdo.',
			'.okhgkkkkkkhgko.',
			'..okgkkdkkkgkko.',
			'..okkkkhgkkkko..',
			'...ookkkkkdoo...',
			'.....oooooo.....',
			'................',
			'................'
		]
	},
	iron: {
		palette: { o: '#2f2f2f', w: '#ffffff', l: '#e0e0e0', m: '#bdbdbd', d: '#8a8a8a' },
		rows: INGOT_ROWS
	},
	gold: {
		palette: { o: '#5a3c00', w: '#fffbd0', l: '#fcee4b', m: '#e8b300', d: '#b07400' },
		rows: INGOT_ROWS
	},
	diamond: {
		palette: { o: '#0b3b38', w: '#e8fffd', l: '#8ff7ec', m: '#4ae0d0', d: '#1fb3a2' },
		rows: [
			'................',
			'................',
			'....oooooooo....',
			'...owwlwllmmo...',
			'..owwllwllmmmo..',
			'.owllllwlllmmmo.',
			'.oooooooooooooo.',
			'..odllllllldmo..',
			'...odlllllldo...',
			'....odllllmo....',
			'.....odllmo.....',
			'......odmo......',
			'.......oo.......',
			'................',
			'................',
			'................'
		]
	},

	// --- a word marked as hard: heavy as an anvil ----------------------------------------
	anvil: {
		palette: { o: '#111111', h: '#8c8c8c', a: '#6b6b6b', b: '#4d4d4d', c: '#363636' },
		rows: [
			'................',
			'................',
			'................',
			'.ooooooooooooo..',
			'ohhhhhhhhhhhhao.',
			'.ooaaaaaaaaaabo.',
			'...oooabbbbbooo.',
			'.....oabbbbco...',
			'.....oabbbbco...',
			'.....oabbbbco...',
			'....oabbbbbcco..',
			'...ooooooooooooo',
			'...oaaaaaaabbcco',
			'...occccccccccco',
			'...ooooooooooooo',
			'................'
		]
	},

	// --- ground ---------------------------------------------------------------------
	dirt: {
		palette: { a: '#79553a', b: '#5c3f2a', c: '#946a4a', d: '#4a3220' },
		rows: [
			'aabaaacaaabaaada',
			'abaadaaaacaaabaa',
			'aaaaaabaaaaadaab',
			'caabaaaaabaaaaaa',
			'aaaaacaadaaacaba',
			'badaaaaaaaabaaaa',
			'aaaaabaacaaaaaca',
			'acaaaaaaaadaabaa',
			'aaabaadaaaaaaaaa',
			'daaaaaaabaacaada',
			'aacaabaaaaaaaaaa',
			'aaaaaaacaadaabac',
			'abadaaaaaaaaaaaa',
			'aaaaacabaaabaada',
			'cabaaaaaaaaaaaaa',
			'aaaaadaaacaabaca'
		]
	},
	grass: {
		palette: { g: '#6aa83f', G: '#4f8a2c', h: '#86c255', a: '#79553a', b: '#5c3f2a', c: '#946a4a' },
		rows: [
			'gghggGgghgggGghg',
			'gGggggGgggGgggGg',
			'GgGgGggGgGgGgGgG',
			'aGaGaaGaaGaGaaGa',
			'aaGaabaGaaaGabaa',
			'abaaaaaaabaaaaaa',
			'aaaacaaaaaaacaab',
			'caaaaabaaaaaaaaa',
			'aabaaaaaacaabaaa',
			'aaaaacaaaaaaaaca',
			'abaaaaaabaacaaaa',
			'aaacaabaaaaaaaba',
			'caaaaaaacaaabaaa',
			'aaabaaaaaaaaaaca',
			'aaaaacaabaacaaaa',
			'abaaaaaaaaaaabaa'
		]
	},

	// --- items ------------------------------------------------------------------------
	torch: {
		palette: { f: '#ffb43a', y: '#fff3a0', o: '#ff7a1a', b: '#8a5a2b', B: '#5e3c1c' },
		rows: [
			'................',
			'................',
			'.......ff.......',
			'......fyyf......',
			'......fyyf......',
			'.......oo.......',
			'.......bB.......',
			'.......bB.......',
			'.......bB.......',
			'.......bB.......',
			'.......bB.......',
			'.......bB.......',
			'.......bB.......',
			'.......bB.......',
			'................',
			'................'
		]
	},
	spyglass: {
		palette: { c: '#bff3ff', C: '#5ec8f0', g: '#f0b84d', G: '#b8802a', b: '#7a4f24' },
		rows: [
			'................',
			'............cC..',
			'...........cCCC.',
			'..........gCCC..',
			'.........gGGC...',
			'........gGGg....',
			'.......gGGg.....',
			'......gGGg......',
			'.....gGGg.......',
			'....bGGg........',
			'...bbGg.........',
			'..bbbb..........',
			'.bbbb...........',
			'.bbb............',
			'..b.............',
			'................'
		]
	},
	pickaxe: {
		palette: { d: '#8ff7ec', D: '#1fb3a2', o: '#0b5a52', b: '#8a5a2b', B: '#5e3c1c' },
		rows: [
			'................',
			'....odddddo.....',
			'...odDDDDDdo....',
			'..odDooooDDdo...',
			'..oDo...obDDo...',
			'...o...obB.oDo..',
			'......obB...oDo.',
			'.....obB.....oo.',
			'....obB.........',
			'...obB..........',
			'..obB...........',
			'.obB............',
			'.oB.............',
			'..o.............',
			'................',
			'................'
		]
	},
	clock: {
		palette: { o: '#5e4500', g: '#d9a400', y: '#fff1b8', k: '#3f3f3f' },
		rows: [
			'................',
			'.....oooooo.....',
			'....oggggggo....',
			'...ogyyyyyygo...',
			'..ogyyykkyyygo..',
			'..ogyyykkyyygo..',
			'..ogyyykkyyygo..',
			'..ogyyykkkkygo..',
			'..ogyyyyyyyygo..',
			'..ogyyyyyyyygo..',
			'...ogyyyyyygo...',
			'....oggggggo....',
			'.....oooooo.....',
			'................',
			'................',
			'................'
		]
	},
	xp: {
		palette: { o: '#2f6400', G: '#6fd21a', g: '#c8ff3c', w: '#f8ffd0' },
		rows: [
			'................',
			'................',
			'......oooo......',
			'....ooGGGGoo....',
			'...oGGgggGGGo...',
			'...oGgwwgggGo...',
			'..oGgwwggggGGo..',
			'..oGggggggggGo..',
			'..oGggggggggGo..',
			'..oGGgggggGGGo..',
			'...oGGgggGGGo...',
			'....ooGGGGoo....',
			'......oooo......',
			'................',
			'................',
			'................'
		]
	},
	chest: {
		palette: { o: '#2e1c0c', B: '#7a4f24', b: '#a8743a', g: '#d6d6d6', G: '#6f6f6f' },
		rows: [
			'................',
			'.oooooooooooooo.',
			'.oBBBBBBBBBBBBo.',
			'.oBbbbbbbbbbbBo.',
			'.oBbbbbbbbbbbBo.',
			'.oBbbbbbbbbbbBo.',
			'.ooooooggoooooo.',
			'.oBBBBBgGBBBBBo.',
			'.oBbbbbggbbbbBo.',
			'.oBbbbbbbbbbbBo.',
			'.oBbbbbbbbbbbBo.',
			'.oBbbbbbbbbbbBo.',
			'.oBbbbbbbbbbbBo.',
			'.oBBBBBBBBBBBBo.',
			'.oooooooooooooo.',
			'................'
		]
	},
	book: {
		palette: { o: '#2a1206', r: '#9b2d20', R: '#6b1c12', p: '#f1e8cf', g: '#d9a400' },
		rows: [
			'................',
			'...ooooooooo....',
			'..orrrrrrrrRo...',
			'..orrrrrrrrRo...',
			'..orrgggggrRo...',
			'..orrgrrrgrRo...',
			'..orrgggggrRo...',
			'..orrrrrrrrRo...',
			'..orrrrrrrrRo...',
			'..orrrrrrrrRo...',
			'..orrrrrrrrRo...',
			'..oRRRRRRRRRo...',
			'..oppppppppppo..',
			'...oooooooooooo.',
			'................',
			'................'
		]
	},
	star: {
		palette: { o: '#7a5900', y: '#ffe14a', w: '#fff8c4' },
		rows: [
			'................',
			'.......oo.......',
			'......oyyo......',
			'......oyyo......',
			'.....oywyyo.....',
			'oooooyywyyyooooo',
			'oyyyyyyyyyyyyyyo',
			'.oyyyyyyyyyyyyo.',
			'..oyyyyyyyyyyo..',
			'...oyyyyyyyyo...',
			'...oyyyyyyyyo...',
			'..oyyyyooyyyyo..',
			'..oyyyo..oyyyo..',
			'.oyyoo....ooyyo.',
			'.ooo........ooo.',
			'................'
		]
	},
	sun: {
		palette: { o: '#e0a800', y: '#ffe14a', w: '#fff8c4' },
		rows: [
			'................',
			'................',
			'................',
			'....oooooooo....',
			'....oyyyyyyo....',
			'....oywwwwyo....',
			'....oywwwwyo....',
			'....oywwwwyo....',
			'....oywwwwyo....',
			'....oyyyyyyo....',
			'....oooooooo....',
			'................',
			'................',
			'................',
			'................',
			'................'
		]
	},

	// --- navigation (NavBar.svelte) ---------------------------------------------------
	trophy: {
		palette: { o: '#b07400', y: '#fcee4b', w: '#fffbd0', b: '#6b4423', B: '#4a2e17' },
		rows: [
			'................',
			'..oooooooooooo..',
			'..owyyyyyyyyyo..',
			'ooowyyyyyyyyyooo',
			'o.owyyyyyyyyyo.o',
			'o.owyyyyyyyyyo.o',
			'o..owyyyyyyyo..o',
			'.o.owyyyyyyyo.o.',
			'..ooowyyyyyooo..',
			'.....owyyyo.....',
			'......oyyo......',
			'......oyyo......',
			'.....oyyyyo.....',
			'....bbbbbbbb....',
			'....bBBBBBBb....',
			'....bbbbbbbb....'
		]
	},
	gear: {
		palette: { d: '#2b2b2b', a: '#dadada', b: '#a8a8a8', c: '#767676' },
		rows: [
			'......dddd......',
			'......daad......',
			'..ddd.daad.ddd..',
			'..daaddaaddbbd..',
			'..daaaaabbbbbd..',
			'...daaaddbbbd...',
			'dddaaad..dbbbddd',
			'daaaad....dbcccd',
			'daaabd....dccccd',
			'dddbbbd..dcccddd',
			'...dbbbddcccd...',
			'..dbbbbbcccccd..',
			'..dbbddccddccd..',
			'..ddd.dccd.ddd..',
			'......dccd......',
			'......dddd......'
		]
	}
};

/** @typedef {keyof typeof SPRITES} SpriteName */

/**
 * The sprite as horizontal runs of one colour – few SVG rectangles instead of 256.
 * @param {string} name
 * @returns {{ x: number, y: number, width: number, color: string }[]}
 */
export function spriteRuns(name) {
	const sprite = SPRITES[name];
	/** @type {{ x: number, y: number, width: number, color: string }[]} */
	const runs = [];
	sprite.rows.forEach((row, y) => {
		for (let x = 0; x < row.length;) {
			const char = row[x];
			let width = 1;
			while (row[x + width] === char) width++;
			if (char !== '.') runs.push({ x, y, width, color: sprite.palette[char] });
			x += width;
		}
	});
	return runs;
}

/**
 * The sprite as an SVG data URI, e.g. for CSS: background-image: url(…).
 * @param {string} name
 */
export function spriteDataUri(name) {
	const rects = spriteRuns(name)
		.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="1" fill="${r.color}"/>`)
		.join('');
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
