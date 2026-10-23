// Take the screenshots for the README: three screens of the app at phone size – the start page,
// a round in "Auswahl" mode and its result – each drawn into a sketched Android phone on squared
// paper, with a handwritten line on top and arrows to what matters.
// The app is built and served by Vite. Headless Chromium gets three made-up lessons in
// localStorage and plays a round, driven over the DevTools protocol. Math.random is seeded,
// so every run asks the same words.
// Usage: node scripts/make-screenshots.mjs   (needs Chromium; pngquant makes the files smaller)
//        CHROMIUM=/path/to/chrome node scripts/make-screenshots.mjs
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, preview } from 'vite';
import { buildUnit } from '../src/lib/model.js';
import { localDay } from '../src/lib/learn/streak.js';

const root = new URL('..', import.meta.url).pathname;
const outDir = new URL('../docs/screenshots/', import.meta.url).pathname;

/** the phone's viewport in CSS pixels (a 20:9 Android phone without its status and navigation bar) */
const PHONE = { width: 412, height: 870 };
const LATIN_ID = 'ccb-40702-229';

// --- made-up lessons ------------------------------------------------------------------

/** [front, frontInfo, back] – the Latin lesson the round is played with */
const LATIN = [
	['cōnsilium', 'n', 'Rat, Beschluss, Plan'],
	['senātus, senātūs', 'm', 'Senat'],
	['rēs pūblica, reī pūblicae', 'f', 'Staat, Gemeinwesen'],
	['cīvis, cīvis', 'm', 'Bürger'],
	['imperium', 'n', 'Befehl, Herrschaft, Reich'],
	['glōria', 'f', 'Ruhm, Ehre'],
	['virtūs, virtūtis', 'f', 'Tapferkeit, Tüchtigkeit'],
	['clēmentia', 'f', 'Milde, Nachsicht'],
	['sevēritās, sevēritātis', 'f', 'Strenge, Ernst'],
	['coniūrātiō, coniūrātiōnis', 'f', 'Verschwörung'],
	['supplicium', 'n', 'Hinrichtung, Todesstrafe'],
	['lēx, lēgis', 'f', 'Gesetz'],
	['parcere, parcō, pepercī', '+ Dat.', 'schonen, verschonen'],
	['ignōscere, ignōscō, ignōvī', '', 'verzeihen'],
	['dēcernere, dēcernō, dēcrēvī', '', 'beschließen, entscheiden'],
	['dēfendere, dēfendō, dēfendī', '', 'verteidigen, abwehren'],
	['pūnīre, pūniō', '', 'bestrafen'],
	['dubitāre, dubitō', '', 'zweifeln, zögern'],
	['mūnus, mūneris', 'n', 'Aufgabe, Amt; Geschenk'],
	['ingenium', 'n', 'Begabung, Talent, Verstand'],
	['dignitās, dignitātis', 'f', 'Würde, Ansehen'],
	['misericordia', 'f', 'Mitleid, Barmherzigkeit'],
	['sapientia', 'f', 'Weisheit, Klugheit'],
	['līberālitās, līberālitātis', 'f', 'Großzügigkeit'],
	['cōnstantia', 'f', 'Beständigkeit, Standhaftigkeit'],
	['mōs, mōris', 'm', 'Sitte, Brauch'],
	['laudāre, laudō', '', 'loben'],
	['iūdicāre, iūdicō', '', 'urteilen, beurteilen'],
	['praestāre, praestō, praestitī', '', 'übertreffen; leisten'],
	['tribuere, tribuō, tribuī', '', 'zuteilen, schenken'],
	['egēre, egeō, eguī', '+ Abl.', 'nötig haben, brauchen'],
	['cōnferre, cōnferō, contulī', '', 'vergleichen; zusammentragen']
];

/** [front, back] */
const SPANISH = [
	['la madre', 'die Mutter'],
	['el padre', 'der Vater'],
	['los padres', 'die Eltern'],
	['el hermano', 'der Bruder'],
	['la hermana', 'die Schwester'],
	['el abuelo', 'der Großvater'],
	['la abuela', 'die Großmutter'],
	['el tío', 'der Onkel'],
	['la tía', 'die Tante'],
	['el primo', 'der Cousin'],
	['la prima', 'die Cousine'],
	['el perro', 'der Hund'],
	['el gato', 'die Katze'],
	['vivir', 'wohnen, leben'],
	['tener', 'haben'],
	['simpático', 'nett, sympathisch'],
	['mayor', 'älter'],
	['menor', 'jünger']
];

const ENGLISH = [
	['the underground', 'die U-Bahn (in London)'],
	['to get on', 'einsteigen'],
	['to get off', 'aussteigen'],
	['a ticket', 'eine Fahrkarte'],
	['to queue', 'Schlange stehen'],
	['a sight', 'eine Sehenswürdigkeit'],
	['famous', 'berühmt'],
	['a bridge', 'eine Brücke'],
	['a tower', 'ein Turm'],
	['expensive', 'teuer'],
	['cheap', 'billig'],
	['a souvenir', 'ein Andenken'],
	['to get lost', 'sich verlaufen'],
	['a map', 'ein Stadtplan'],
	['straight on', 'geradeaus'],
	['to cross', 'überqueren'],
	['crowded', 'überfüllt'],
	['tired', 'müde'],
	['a guide', 'ein Fremdenführer'],
	['to look for', 'suchen'],
	['on the left', 'links'],
	['on the right', 'rechts']
];

const now = Date.now();
const daysAgo = (/** @type {number} */ n) => new Date(now - n * 86_400_000);

/**
 * A lesson with its progress: the words get the given stages (boxes) in turn.
 * @param {import('../src/lib/model.js').UnitDraft} draft
 * @param {number} age  days since the import
 * @param {number[]} boxes
 */
function lesson(draft, age, boxes) {
	const unit = { ...buildUnit(draft), createdAt: daysAgo(age).toISOString() };
	const progress = Object.fromEntries(
		unit.entries.map((entry, i) => {
			const box = boxes[i % boxes.length];
			const lastSeen = daysAgo(1 + (i % 4)).getTime();
			return [entry.id, { box, hard: false, right: box - 1, wrong: box === 1 ? 1 : 0, lastSeen }];
		})
	);
	return { unit, progress };
}

const lessons = [
	lesson(
		{
			id: LATIN_ID,
			lang: 'la',
			source: {
				type: 'ccbuchner',
				code: '40702-229',
				pdfUrl: 'https://www.ccbuchner.de/_files_media/mediathek/downloads/26273.pdf'
			},
			parsed: {
				title: 'Die nd-Formen | Cäsar gegen Cato',
				sections: [
					{ title: 'A Zwei Positionen im Senat', entries: LATIN.slice(0, 18) },
					{ title: 'B Zwei Politiker im Vergleich', entries: LATIN.slice(18) }
				].map(({ title, entries }) => ({
					title,
					entries: entries.map(([front, frontInfo, back]) => ({ front, frontInfo, back }))
				}))
			}
		},
		1,
		[1, 2, 5, 1, 3, 4, 2, 5, 1, 3]
	),
	lesson(
		{
			id: 'txt-familia',
			lang: 'es',
			source: { type: 'text' },
			parsed: {
				title: 'Unidad 2 · Mi familia',
				sections: [{ title: '', entries: SPANISH.map(([front, back]) => ({ front, back })) }]
			}
		},
		4,
		[1, 2, 1, 3, 4, 1, 2]
	),
	lesson(
		{
			id: 'txt-london',
			lang: 'en',
			source: { type: 'text' },
			parsed: {
				title: 'Unit 3 · A day in London',
				sections: [{ title: '', entries: ENGLISH.map(([front, back]) => ({ front, back })) }]
			}
		},
		9,
		[5, 4, 5, 5, 3, 5, 4]
	)
];

/** what localStorage holds before the screenshots: 11 days in a row so far, level 8 */
const storage = {
	'vokabulator.schema': 1,
	'vokabulator.units': lessons.map((l) => l.unit),
	...Object.fromEntries(lessons.map((l) => [`vokabulator.progress.${l.unit.id}`, l.progress])),
	'vokabulator.settings': {
		direction: 'front-back',
		roundSize: 10,
		mode: 'choice',
		clock: 0,
		sound: false
	},
	'vokabulator.stats': {
		highscores: { [LATIN_ID]: 180, 'txt-london': 240 },
		days: { lastDay: localDay(daysAgo(1)), days: 11 },
		xp: 2480,
		// unlocked before – the perfect round then unlocks "Fehlerfrei" and "Neuer Rekord"
		advancements: Object.fromEntries(
			['first-round', 'first-diamond', 'iron-age', 'combo', 'no-torch', 'days-3', 'days-7'].map(
				(id) => [id, localDay(daysAgo(5))]
			)
		)
	}
};

// --- the browser ------------------------------------------------------------------------

/**
 * A seeded Math.random (mulberry32), so every run picks the same words and sayings.
 * Seed 7: a short splash text ("Veni, vidi, vici!") – long ones overlap the line below.
 */
const SEEDED_RANDOM = `{
	let seed = 7;
	Math.random = () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}`;

const sleep = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start Chromium and open one tab; returns a function to send DevTools commands to that tab.
 * @param {string} dir  for the browser profile
 */
async function openBrowser(dir) {
	const browser = spawn(
		process.env.CHROMIUM ?? 'chromium',
		[
			'--headless',
			// it only opens our own pages – the browser sandbox fails in some containers
			'--no-sandbox',
			'--disable-gpu',
			'--hide-scrollbars',
			'--remote-debugging-port=0',
			`--user-data-dir=${join(dir, 'profile')}`,
			'about:blank'
		],
		{ stdio: ['ignore', 'ignore', 'pipe'] }
	);
	const endpoint = await new Promise((resolve, reject) => {
		let log = '';
		browser.stderr.on('data', (chunk) => {
			log += chunk;
			const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
			if (match) resolve(match[1]);
		});
		browser.on('exit', () => reject(new Error(`Chromium quit:\n${log}`)));
	});

	const socket = new WebSocket(endpoint);
	await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
	let lastId = 0;
	/** @type {Map<number, { resolve: (value: any) => void, reject: (error: Error) => void }>} */
	const pending = new Map();
	socket.addEventListener('message', (event) => {
		const message = JSON.parse(event.data);
		const call = pending.get(message.id);
		if (!call) return;
		pending.delete(message.id);
		if (message.error) call.reject(new Error(message.error.message));
		else call.resolve(message.result);
	});
	/**
	 * @param {string} method
	 * @param {object} [params]
	 * @param {string} [sessionId]
	 * @returns {Promise<any>}
	 */
	const send = (method, params = {}, sessionId) =>
		new Promise((resolve, reject) => {
			pending.set(++lastId, { resolve, reject });
			socket.send(JSON.stringify({ id: lastId, method, params, sessionId }));
		});

	const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
	const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
	return {
		/** @type {(method: string, params?: object) => Promise<any>} */
		tab: (method, params) => send(method, params, sessionId),
		close: () => {
			socket.close();
			browser.kill();
		}
	};
}

/** @param {(method: string, params?: object) => Promise<any>} tab */
function pageHelpers(tab) {
	/**
	 * Run JavaScript in the page and return its (JSON) result.
	 * @param {string} expression
	 */
	async function evaluate(expression) {
		const { result, exceptionDetails } = await tab('Runtime.evaluate', {
			expression,
			awaitPromise: true,
			returnByValue: true
		});
		if (exceptionDetails) {
			throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
		}
		return result.value;
	}

	/** @param {string} expression  until it is truthy */
	async function waitFor(expression) {
		for (let i = 0; i < 100; i++) {
			if (await evaluate(expression)) return;
			await sleep(100);
		}
		throw new Error(`Timed out waiting for: ${expression}`);
	}

	/**
	 * @param {string} url
	 * @param {string} [ready]  an expression that is truthy once the page is there
	 */
	async function go(url, ready = `document.querySelector('main')`) {
		await tab('Page.navigate', { url });
		await waitFor(`document.readyState === 'complete' && ${ready}`);
		await evaluate('document.fonts.ready.then(() => true)');
	}

	/**
	 * Where things are on the screen, in CSS pixels – the arrows point there.
	 * @param {Record<string, string>} selectors
	 * @returns {Promise<Record<string, { x: number, y: number, width: number, height: number }>>}
	 */
	const rects = (selectors) =>
		evaluate(`Object.fromEntries(Object.entries(${JSON.stringify(selectors)}).map(([name, selector]) => {
			const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
			return [name, { x, y, width, height }];
		}))`);

	const screenshot = async () =>
		Buffer.from((await tab('Page.captureScreenshot', { format: 'png' })).data, 'base64');

	return { evaluate, waitFor, go, rects, screenshot };
}

// --- the frames -------------------------------------------------------------------------

/** the picture around a screenshot, in CSS pixels */
const CANVAS = { width: 600, height: 960, scale: 1.5 };
/** screen inside the phone: status bar, the app, navigation bar */
const SCREEN = { width: 316, status: 26, nav: 34 };
const BEZEL = 12;
const SCREEN_SCALE = SCREEN.width / PHONE.width;
const APP_HEIGHT = PHONE.height * SCREEN_SCALE;
const PHONE_SIZE = {
	width: SCREEN.width + 2 * BEZEL,
	height: SCREEN.status + APP_HEIGHT + SCREEN.nav + 2 * BEZEL
};

const font = (/** @type {string} */ path) =>
	`url(data:font/woff2;base64,${readFileSync(new URL(path, import.meta.url)).toString('base64')}) format('woff2')`;

/**
 * @typedef {object} Note  a handwritten note with an arrow to something on the screen
 * @property {string} text      lines separated by \n
 * @property {number} x         where the note sits on the paper (its centre)
 * @property {number} y
 * @property {number} [turn]    degrees
 * @property {string} to        a name from the screenshot's rects
 * @property {'left' | 'right' | 'top' | 'bottom'} side  where the arrow ends at the target
 * @property {number} [bend]    how far the arrow bows out, in pixels (negative: the other way)
 * @property {'left' | 'right' | 'top' | 'bottom'} [from]  where the arrow leaves the note
 *   (default: its top or bottom, whichever faces the target)
 */

/**
 * @param {object} shot
 * @param {string} shot.image   file name of the screenshot
 * @param {Record<string, { x: number, y: number, width: number, height: number }>} shot.rects
 * @param {string} shot.title   the handwritten line on top
 * @param {number} shot.phoneX  left edge of the phone on the paper
 * @param {number} shot.turn    the phone's tilt in degrees
 * @param {Note[]} shot.notes
 * @param {[number, number, number][]} shot.sparkles  little stars beside the phone: x, y, size
 */
function frameHtml({ image, rects, title, phoneX, turn, notes, sparkles }) {
	const phoneY = 150;
	const centre = { x: phoneX + PHONE_SIZE.width / 2, y: phoneY + PHONE_SIZE.height / 2 };
	const radians = (turn * Math.PI) / 180;
	/** a point on the screenshot (CSS px of the phone) → on the paper, with the tilt */
	const onPaper = (/** @type {number} */ x, /** @type {number} */ y) => {
		const dx = phoneX + BEZEL + x * SCREEN_SCALE - centre.x;
		const dy = phoneY + BEZEL + SCREEN.status + y * SCREEN_SCALE - centre.y;
		return {
			x: centre.x + dx * Math.cos(radians) - dy * Math.sin(radians),
			y: centre.y + dx * Math.sin(radians) + dy * Math.cos(radians)
		};
	};

	const arrows = notes.map((note) => {
		const r = rects[note.to];
		const end = {
			left: onPaper(r.x - 4, r.y + r.height / 2),
			right: onPaper(r.x + r.width + 4, r.y + r.height / 2),
			top: onPaper(r.x + r.width / 2, r.y - 4),
			bottom: onPaper(r.x + r.width / 2, r.y + r.height + 4)
		}[note.side];
		const lines = note.text.split('\n');
		const halfHeight = (lines.length * 27) / 2 + 6;
		const offset = {
			left: { x: -textWidth(lines) / 2 - 6, y: 0 },
			right: { x: textWidth(lines) / 2 + 6, y: 0 },
			top: { x: 0, y: -halfHeight },
			bottom: { x: 0, y: halfHeight }
		}[note.from ?? (end.y > note.y ? 'bottom' : 'top')];
		const start = { x: note.x + offset.x, y: note.y + offset.y };
		// a bow: the control point sits beside the middle of the line
		const length = Math.hypot(end.x - start.x, end.y - start.y);
		const bend = note.bend ?? 30;
		const control = {
			x: (start.x + end.x) / 2 - ((end.y - start.y) / length) * bend,
			y: (start.y + end.y) / 2 + ((end.x - start.x) / length) * bend
		};
		// the arrowhead follows the direction the curve arrives in
		const angle = Math.atan2(end.y - control.y, end.x - control.x);
		const head = (/** @type {number} */ side) => ({
			x: end.x - 16 * Math.cos(angle + side * 0.45),
			y: end.y - 16 * Math.sin(angle + side * 0.45)
		});
		const [a, b] = [head(1), head(-1)];
		return `<path d="M${start.x},${start.y} Q${control.x},${control.y} ${end.x},${end.y} M${a.x},${a.y} L${end.x},${end.y} L${b.x},${b.y}" />`;
	});

	const { width: w, height: h } = PHONE_SIZE;
	return `<!doctype html>
<html lang="de">
<meta charset="utf-8" />
<style>
	@font-face { font-family: Gochi; src: ${font('../node_modules/@fontsource/gochi-hand/files/gochi-hand-latin-400-normal.woff2')}; }
	html, body { margin: 0; }
	body {
		position: relative; width: ${CANVAS.width}px; height: ${CANVAS.height}px; overflow: hidden;
		font-family: Gochi, 'Comic Sans MS', cursive;
		/* squared paper from a school exercise book */
		background:
			radial-gradient(ellipse at 50% 40%, transparent 60%, rgb(120 100 60 / 0.12)),
			linear-gradient(#c9d8ee 1px, transparent 1px) 0 9px / 20px 20px,
			linear-gradient(90deg, #c9d8ee 1px, transparent 1px) 9px 0 / 20px 20px,
			#fdfcf6;
	}
	svg.ink { position: absolute; inset: 0; overflow: visible; }

	h1 {
		position: absolute; left: 0; right: 0; top: 34px; margin: 0;
		color: #1d3a9e; font-size: 46px; font-weight: 400; line-height: 1.1; text-align: center;
		transform: rotate(-2deg);
	}
	/* a stroke of highlighter behind the line */
	h1 span { position: relative; padding: 0 12px; }
	h1 span::before {
		content: ''; position: absolute; z-index: -1; left: 0; right: 0; top: 0.42em; height: 0.62em;
		background: #fff35c; border-radius: 4px 14px 6px 12px; transform: rotate(1deg) skewX(-12deg);
		opacity: 0.9;
	}

	.phone {
		position: absolute; left: ${phoneX}px; top: ${phoneY}px; width: ${w}px; height: ${h}px;
		transform: rotate(${turn}deg);
	}
	.screen {
		position: absolute; left: ${BEZEL}px; top: ${BEZEL}px; width: ${SCREEN.width}px;
		height: ${h - 2 * BEZEL}px; overflow: hidden; border-radius: 26px; background: #241a12;
		display: flex; flex-direction: column;
	}
	.screen img { display: block; width: ${SCREEN.width}px; height: ${APP_HEIGHT}px; }

	/* Android's status bar: time on the left, the punch-hole camera in the middle, icons on the right */
	.status {
		position: relative; display: flex; align-items: center; justify-content: space-between;
		height: ${SCREEN.status}px; padding: 2px 18px 0 22px; color: #fff;
		font: 600 12px/1 'Adwaita Sans', Roboto, 'DejaVu Sans', sans-serif;
	}
	.status::after {
		content: ''; position: absolute; left: 50%; top: 7px; width: 13px; height: 13px; margin-left: -6.5px;
		border-radius: 50%; background: #050505; box-shadow: inset 0 0 0 2px #1d1d1d;
	}
	.status svg { display: block; }
	.icons { display: flex; gap: 5px; align-items: center; }
	/* the three Android buttons: back, home, recent apps */
	.nav {
		display: flex; justify-content: space-around; align-items: center;
		height: ${SCREEN.nav}px; padding: 0 44px; background: #000;
	}

	.note {
		position: absolute; margin: 0; transform: translate(-50%, -50%) rotate(var(--turn, 0deg));
		color: #c2261d; font-size: 25px; line-height: 27px; text-align: center; white-space: nowrap;
	}
</style>
<body>
	<svg class="ink" aria-hidden="true">
		<defs>
			<!-- shaky hand: lines get pushed around a little by noise -->
			<filter id="shaky" x="-5%" y="-5%" width="110%" height="110%">
				<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" />
				<feDisplacementMap in="SourceGraphic" scale="5" />
			</filter>
			<filter id="shaky2" x="-5%" y="-5%" width="110%" height="110%">
				<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" />
				<feDisplacementMap in="SourceGraphic" scale="6" />
			</filter>
			<!-- pencil hatching for the phone's shadow -->
			<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
				<line x1="0" y1="0" x2="0" y2="7" stroke="#6b6b6b" stroke-width="1.6" />
			</pattern>
		</defs>
		<g transform="rotate(${turn} ${centre.x} ${centre.y})">
			<!-- shadow, body, the sketched outline twice, side buttons -->
			<rect x="${phoneX + 14}" y="${phoneY + 16}" width="${w}" height="${h}" rx="40" fill="url(#hatch)" filter="url(#shaky2)" opacity="0.7" />
			<rect x="${phoneX}" y="${phoneY}" width="${w}" height="${h}" rx="38" fill="#2e3136" />
			<g fill="none" stroke="#14161a" stroke-linecap="round">
				<rect x="${phoneX}" y="${phoneY}" width="${w}" height="${h}" rx="38" stroke-width="3" filter="url(#shaky)" />
				<rect x="${phoneX - 2}" y="${phoneY + 1}" width="${w + 3}" height="${h - 1}" rx="40" stroke-width="1.6" filter="url(#shaky2)" />
				<path d="M${phoneX + w + 2},${phoneY + 150} v60 M${phoneX + w + 2},${phoneY + 240} v34" stroke-width="7" filter="url(#shaky)" />
			</g>
		</g>
	</svg>

	<div class="phone">
		<div class="screen">
			<div class="status">
				<span>7:45</span>
				<span class="icons">
					<svg width="15" height="12" viewBox="0 0 15 12"><path d="M7.5 11.5 0 3.2a10.6 10.6 0 0 1 15 0Z" fill="#fff" /></svg>
					<svg width="12" height="12" viewBox="0 0 12 12"><path d="M12 0v12H0Z" fill="#fff" /></svg>
					<svg width="8" height="13" viewBox="0 0 8 13"><rect x="2.5" width="3" height="2" rx=".5" fill="#fff" /><rect x=".5" y="1.5" width="7" height="11" rx="1.2" fill="none" stroke="#fff" /><rect x="1.8" y="4" width="4.4" height="7.3" rx=".4" fill="#fff" /></svg>
				</span>
			</div>
			<img src="${image}" alt="" />
			<div class="nav">
				<svg width="16" height="16" viewBox="0 0 16 16"><path d="M12.5 2v12L2.5 8Z" fill="none" stroke="#ddd" stroke-width="1.6" stroke-linejoin="round" /></svg>
				<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2" fill="none" stroke="#ddd" stroke-width="1.6" /></svg>
				<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="#ddd" stroke-width="1.6" /></svg>
			</div>
		</div>
	</div>

	<h1><span>${title}</span></h1>

	<svg class="ink" aria-hidden="true">
		<g fill="none" stroke="#c2261d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#shaky)">
			${arrows.join('\n\t\t\t')}
		</g>
		<g fill="#ffd21f" stroke="#1d3a9e" stroke-width="2" stroke-linejoin="round" filter="url(#shaky)">
			${sparkles
				.map(
					([x, y, r]) =>
						`<path d="M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r}Z" />`
				)
				.join('\n\t\t\t')}
		</g>
	</svg>
	${notes
		.map(
			(note) =>
				`<p class="note" style="left: ${note.x}px; top: ${note.y}px; --turn: ${note.turn ?? 0}deg">${note.text.replaceAll('\n', '<br />')}</p>`
		)
		.join('\n\t')}
</body>
</html>
`;
}

/**
 * Roughly how wide a note is (Gochi Hand at 25 px: about 11 px per character).
 * @param {string[]} lines
 */
function textWidth(lines) {
	return Math.max(...lines.map((line) => [...line].length)) * 11;
}

// --- go ---------------------------------------------------------------------------------

process.chdir(root);
await build({ logLevel: 'warn' });
const server = await preview({ logLevel: 'warn', preview: { port: 4179 } });
const origin = /** @type {string} */ (server.resolvedUrls?.local[0]).replace(/\/$/, '');

const dir = mkdtempSync(join(tmpdir(), 'vokabulator-screenshots-'));
const { tab, close } = await openBrowser(dir);
try {
	const { evaluate, waitFor, go, rects, screenshot } = pageHelpers(tab);
	await tab('Emulation.setDeviceMetricsOverride', {
		...PHONE,
		deviceScaleFactor: 2,
		mobile: true
	});
	await tab('Page.enable');
	await tab('Page.addScriptToEvaluateOnNewDocument', { source: SEEDED_RANDOM });

	// the lessons go into localStorage on a page of the app's origin that runs no app code
	await tab('Page.navigate', { url: `${origin}/robots.txt` });
	await waitFor(`document.readyState === 'complete'`);
	await evaluate(`(() => {
		localStorage.clear();
		for (const [key, value] of Object.entries(${JSON.stringify(storage)})) {
			localStorage.setItem(key, JSON.stringify(value));
		}
	})()`);

	// 1 – the start page
	await go(`${origin}/`);
	await waitFor(`document.querySelector('.unit')`);
	await sleep(500);
	writeFileSync(join(dir, 'start.png'), await screenshot());
	const startRects = await rects({ scan: '.scan', lesson: '.unit' });

	// 2 – a round: three right answers in a row make a combo, then the fourth question
	await go(`${origin}/lernen/${LATIN_ID}`);
	await evaluate(`document.querySelector('.start').click()`);
	const answerRight = async () => {
		await waitFor(`document.querySelector('.choices button')`);
		await evaluate(`(() => {
			const front = document.querySelector('.question .word').textContent.trim();
			const units = JSON.parse(localStorage.getItem('vokabulator.units'));
			const { back } = units.flatMap((u) => u.entries).find((e) => e.front === front);
			[...document.querySelectorAll('.choices button')].find((b) => b.textContent.trim() === back).click();
		})()`);
		await waitFor(`document.querySelector('.feedback .next')`);
		await evaluate(`document.querySelector('.feedback .next').click()`);
		await sleep(150);
	};
	for (let i = 0; i < 3; i++) await answerRight();
	await waitFor(`document.querySelector('.choices button')`);
	await sleep(400);
	writeFileSync(join(dir, 'round.png'), await screenshot());
	const roundRects = await rects({
		xp: '.round-stats',
		stage: '.question .stage',
		jokers: '.hotbar .slot'
	});

	// 3 – the result of a perfect round, with confetti and a level-up
	for (let i = 3; i < 10; i++) await answerRight();
	await waitFor(`document.querySelector('.result')`);
	await sleep(650);
	writeFileSync(join(dir, 'result.png'), await screenshot());
	const resultRects = await rects({ toast: '.toast', xp: '.result .xp' });

	// the frames
	await tab('Emulation.setDeviceMetricsOverride', {
		width: CANVAS.width,
		height: CANVAS.height,
		deviceScaleFactor: CANVAS.scale,
		mobile: false
	});
	/** @type {(Parameters<typeof frameHtml>[0] & { name: string })[]} */
	const shots = [
		{
			name: '1-lektionen',
			image: 'start.png',
			rects: startRects,
			title: 'Scannen statt abschreiben',
			phoneX: 40,
			turn: -2,
			sparkles: [
				[548, 182, 13],
				[576, 222, 8]
			],
			notes: [
				{
					text: 'QR-Code aus\ndem Buch –\nzack, alles drauf!',
					x: 488,
					y: 300,
					turn: 4,
					to: 'scan',
					side: 'right'
				},
				{
					text: 'geht auch\noffline,\nim Bus 🚌',
					x: 492,
					y: 640,
					turn: -3,
					to: 'lesson',
					side: 'right'
				}
			]
		},
		{
			name: '2-runde',
			image: 'round.png',
			rects: roundRects,
			title: 'Lernen wie zocken',
			phoneX: 220,
			turn: 2,
			sparkles: [
				[52, 178, 13],
				[24, 218, 8]
			],
			notes: [
				{ text: 'Combo!\ndoppelte XP', x: 110, y: 250, turn: -5, to: 'xp', side: 'left' },
				{
					text: 'jede Vokabel\nlevelt hoch:\nStein → Diamant',
					x: 108,
					y: 470,
					turn: 2,
					to: 'stage',
					side: 'left',
					from: 'right',
					bend: -20
				},
				{
					text: 'Joker,\nwenn’s\nklemmt',
					x: 104,
					y: 720,
					turn: 3,
					to: 'jokers',
					side: 'left'
				}
			]
		},
		{
			name: '3-ergebnis',
			image: 'result.png',
			rects: resultRects,
			title: 'Rekord? Angeben! 😎',
			phoneX: 40,
			turn: -1.5,
			sparkles: [
				[560, 560, 13],
				[530, 600, 8]
			],
			notes: [
				{ text: 'Level-Up!', x: 494, y: 175, turn: 6, to: 'toast', side: 'right' },
				{
					text: 'als Challenge\nan Freunde\nschicken 😏',
					x: 498,
					y: 430,
					turn: -4,
					to: 'xp',
					side: 'right',
					from: 'left',
					bend: 20
				}
			]
		}
	];

	mkdirSync(outDir, { recursive: true });
	for (const shot of shots) {
		writeFileSync(join(dir, `${shot.name}.html`), frameHtml(shot));
		await go(`file://${join(dir, `${shot.name}.html`)}`, 'true');
		const png = join(dir, `${shot.name}.png`);
		writeFileSync(png, await screenshot());
		const out = join(outDir, `${shot.name}.png`);
		try {
			// 256 colours are plenty for pixel art on paper – a much smaller file for the README
			execFileSync('pngquant', [
				'--quality=70-95',
				'--speed=1',
				'--strip',
				'--force',
				'--output',
				out,
				png
			]);
		} catch {
			console.log('pngquant not found – the images are bigger than they need to be');
			copyFileSync(png, out);
		}
		console.log(`written: docs/screenshots/${shot.name}.png`);
	}
} finally {
	close();
	await server.close();
	rmSync(dir, { recursive: true, force: true });
}
