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

// --- stone and ores --------------------------------------------------------------

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

/** where an ore shows its colour: x = light, y = dark */
const ORE_SPECKS = [
	'................',
	'..xy......xx....',
	'..yy.....xyy....',
	'.........yy.....',
	'.....xx.........',
	'....xyy.........',
	'.....y......xy..',
	'...........xyy..',
	'..xx........y...',
	'.xyy............',
	'..y.....xx......',
	'........xyy.....',
	'.........y...xx.',
	'....xy......xyy.',
	'....yy.......y..',
	'................'
];

const STONE_PALETTE = { a: '#8f8f8f', b: '#747474', c: '#a8a8a8' };

/**
 * Stone with coloured specks.
 * @param {string} light
 * @param {string} dark
 * @returns {SpriteDef}
 */
function ore(light, dark) {
	return {
		palette: { ...STONE_PALETTE, x: light, y: dark },
		rows: STONE_ROWS.map((row, y) =>
			[...row].map((char, x) => (ORE_SPECKS[y][x] === '.' ? char : ORE_SPECKS[y][x])).join('')
		)
	};
}

/** @type {Record<string, SpriteDef>} */
export const SPRITES = {
	stone: { palette: STONE_PALETTE, rows: STONE_ROWS },
	coal: ore('#3a3a3a', '#161616'),
	iron: ore('#e8c9ad', '#b88b67'),
	gold: ore('#fcee4b', '#d18f00'),
	diamond: ore('#8ff7ec', '#1fb3a2'),

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
	star_off: {
		palette: { o: '#8b8b8b' },
		rows: [
			'................',
			'.......oo.......',
			'......o..o......',
			'......o..o......',
			'.....o....o.....',
			'ooooo......ooooo',
			'o..............o',
			'.o............o.',
			'..o..........o..',
			'...o........o...',
			'...o........o...',
			'..o....oo....o..',
			'..o...o..o...o..',
			'.o..oo....oo..o.',
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

	// --- breaking a block: three crack stages, drawn over an ore ------------------------
	crack1: {
		palette: { k: '#1a1a1a' },
		rows: [
			'................',
			'................',
			'................',
			'.......k........',
			'.......k........',
			'......kk........',
			'.......kk.......',
			'........k.......',
			'................',
			'................',
			'................',
			'................',
			'................',
			'................',
			'................',
			'................'
		]
	},
	crack2: {
		palette: { k: '#1a1a1a' },
		rows: [
			'................',
			'................',
			'....k...........',
			'.....k.k........',
			'......kk........',
			'......kk....k...',
			'.....k.kk..k....',
			'....k...kkk.....',
			'........k.......',
			'.......k.k......',
			'......k...k.....',
			'..........k.....',
			'................',
			'................',
			'................',
			'................'
		]
	},
	crack3: {
		palette: { k: '#1a1a1a' },
		rows: [
			'..k.............',
			'...k.......k....',
			'....k.....k.....',
			'.....k.k.k......',
			'......kk........',
			'.k....kk....k...',
			'..k..k.kk..k....',
			'...kk...kkk...k.',
			'....k...k....k..',
			'.......k.k..k...',
			'..k...k...kk....',
			'...k.k....k.....',
			'....k....k.k....',
			'....k...k...k...',
			'...k...k.....k..',
			'..k.............'
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
