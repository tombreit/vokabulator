// Draw the link preview card (Open Graph image, 1200 × 630) that messengers show when a
// Vokabulator link is shared: a title screen like in the game – stone logo with a splash text,
// what the app does, and at the bottom the HUD: XP bar and a hotbar with the five stages.
// Built from the app's own sprites (src/lib/pixel/sprites.js) and fonts.
// Usage: node scripts/make-og-image.mjs   (needs Chromium; pngquant makes the file smaller)
//        CHROMIUM=/path/to/chrome node scripts/make-og-image.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spriteDataUri } from '../src/lib/pixel/sprites.js';

const out = new URL('../static/og-image.png', import.meta.url).pathname;
const font = (/** @type {string} */ path) =>
	`url(data:font/woff2;base64,${readFileSync(new URL(path, import.meta.url)).toString('base64')}) format('woff2')`;
const sprite = (/** @type {string} */ name) => `url("${spriteDataUri(name)}")`;
const STAGES = ['rock', 'coal', 'iron', 'gold', 'diamond'];

const html = `<!doctype html>
<html lang="de">
<meta charset="utf-8" />
<style>
	@font-face { font-family: Monocraft; font-weight: 400; src: ${font('../src/lib/fonts/monocraft-regular.woff2')}; }
	@font-face { font-family: Monocraft; font-weight: 700; src: ${font('../src/lib/fonts/monocraft-bold.woff2')}; }
	@font-face {
		font-family: Lexend; font-weight: 100 900;
		src: ${font('../node_modules/@fontsource-variable/lexend/files/lexend-latin-wght-normal.woff2')};
	}

	html, body { margin: 0; }
	body {
		position: relative; width: 1200px; height: 630px; overflow: hidden;
		display: flex; flex-direction: column; align-items: center;
		color: #fff; font-family: Monocraft;
		/* dark dirt, like the app's background */
		background: linear-gradient(rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.72)), ${sprite('dirt')} 0 0 / 80px 80px;
		image-rendering: pixelated;
	}

	.grass { align-self: stretch; height: 40px; background: ${sprite('grass')} 0 0 / 80px 80px; border-bottom: 4px solid #000; }

	.title { position: relative; margin-top: 50px; }
	.logo {
		margin: 0; font-size: 124px; font-weight: 700; line-height: 1;
		background: ${sprite('stone')} 0 0 / 64px 64px; background-clip: text; color: transparent;
		filter: drop-shadow(0 6px 0 #3a3a3a) drop-shadow(0 6px 0 #1c1c1c) drop-shadow(5px 5px 0 #000);
	}
	.splash {
		position: absolute; right: -36px; bottom: -34px; margin: 0;
		color: #ffff55; font-size: 40px; font-weight: 700; text-shadow: 4px 4px 0 #3f3f15;
		transform: rotate(-12deg);
	}

	.tagline {
		margin: 92px 0 0; font-family: Lexend; font-size: 40px; font-weight: 600;
		text-shadow: 3px 3px 0 #000;
	}

	/* the HUD at the bottom of the game screen: level, XP bar, hotbar */
	.hud { position: absolute; bottom: 40px; display: grid; justify-items: center; gap: 8px; }
	.level {
		color: #80ff20; font-size: 40px; font-weight: 700; line-height: 1;
		text-shadow: 3px 0 0 #000, -3px 0 0 #000, 0 3px 0 #000, 0 -3px 0 #000;
	}
	.bar {
		/* as wide as the hotbar: 5 slots of 96 px, overlapping by their 4 px border */
		width: calc(5 * 96px - 4 * 4px); box-sizing: border-box; height: 20px; border: 4px solid #000; background: #2b2b2b;
		background-image: repeating-linear-gradient(90deg, transparent 0 calc(100% / 18 - 4px), #000 calc(100% / 18 - 4px) calc(100% / 18));
	}
	.fill { width: 68%; height: 100%; background: linear-gradient(#c8ff3c 0 35%, #80ff20 35%); }
	.hotbar { display: flex; margin-top: 6px; }
	.slot {
		display: grid; place-items: center; box-sizing: border-box; width: 96px; height: 96px; margin-left: -4px;
		border: 4px solid #555; background: rgb(0 0 0 / 0.5);
	}
	.slot.selected { position: relative; z-index: 1; border-color: #fff; outline: 4px solid #000; }
	.slot i { width: 64px; height: 64px; background: center / contain no-repeat; }
</style>
<body>
	<div class="grass"></div>
	<div class="title">
		<h1 class="logo">VOKABULATOR</h1>
		<p class="splash">Carpe vocabulum!</p>
	</div>
	<p class="tagline">Vokabeln aus dem Buch scannen und spielend lernen</p>
	<div class="hud">
		<div class="level">12</div>
		<div class="bar"><div class="fill"></div></div>
		<div class="hotbar">
			${STAGES.map((name, i) => `<div class="slot${i === STAGES.length - 1 ? ' selected' : ''}"><i style="background-image: ${sprite(name).replaceAll('"', "'")}"></i></div>`).join('')}
		</div>
	</div>
</body>
</html>
`;

const dir = mkdtempSync(join(tmpdir(), 'vokabulator-og-'));
try {
	writeFileSync(join(dir, 'og.html'), html);
	execFileSync(process.env.CHROMIUM ?? 'chromium', [
		'--headless',
		// it only opens the page written above – the browser sandbox fails in some containers
		'--no-sandbox',
		'--disable-gpu',
		'--hide-scrollbars',
		'--force-device-scale-factor=1',
		'--window-size=1200,630',
		'--virtual-time-budget=3000',
		`--user-data-dir=${join(dir, 'profile')}`,
		`--screenshot=${join(dir, 'og.png')}`,
		`file://${join(dir, 'og.html')}`
	]);
	try {
		// 256 colours are plenty for pixel art – a much smaller file for slow phones
		execFileSync('pngquant', [
			'--quality=80-100',
			'--speed=1',
			'--strip',
			'--force',
			'--output',
			out,
			join(dir, 'og.png')
		]);
	} catch {
		console.log('pngquant not found – the image is bigger than it needs to be');
		copyFileSync(join(dir, 'og.png'), out);
	}
} finally {
	rmSync(dir, { recursive: true, force: true });
}
console.log('link preview written to static/og-image.png');
