// @ts-check
/**
 * All persistence of Vokabulator, in one place.
 *
 * Data lives in the browser's localStorage under keys starting with "vokabulator.":
 *   vokabulator.schema               schema version (number)
 *   vokabulator.units                Unit[]               (see model.js)
 *   vokabulator.progress.<unitId>    UnitProgress         (see learn/leitner.js)
 *   vokabulator.settings             Settings
 *   vokabulator.stats                Stats (highscores, days in a row)
 *
 * exportBackup() / importBackup() move units, progress and stats (XP, level, records,
 * advancements) between devices as a JSON file.
 *
 * Pages call these functions explicitly whenever something changes – there is
 * no hidden auto-saving. Open DevTools → Application → Local Storage to look at the data.
 */

/** @typedef {import('./model.js').Unit} Unit */
/** @typedef {import('./learn/leitner.js').UnitProgress} UnitProgress */
/** @typedef {import('./learn/streak.js').DayStreak} DayStreak */

const PREFIX = 'vokabulator.';
export const SCHEMA_VERSION = 1;

/**
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
function read(key, fallback) {
	const raw = localStorage.getItem(PREFIX + key);
	if (raw === null) return fallback;
	try {
		return JSON.parse(raw);
	} catch {
		console.warn(`Ignoring unreadable localStorage entry "${PREFIX + key}"`);
		return fallback;
	}
}

/**
 * @param {string} key
 * @param {unknown} value
 */
function write(key, value) {
	localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

// --- Units -------------------------------------------------------------------

/** @returns {Unit[]} newest first */
export function loadUnits() {
	return read('units', /** @type {Unit[]} */ ([])).toSorted((a, b) =>
		b.createdAt.localeCompare(a.createdAt)
	);
}

/** @param {string} id */
export function getUnit(id) {
	return loadUnits().find((u) => u.id === id);
}

/**
 * Insert a new unit or replace the one with the same id (re-import keeps progress).
 * @param {Unit} unit
 */
export function saveUnit(unit) {
	const others = loadUnits().filter((u) => u.id !== unit.id);
	write('units', [unit, ...others]);
}

/**
 * Delete a unit together with its learning progress.
 * @param {string} id
 */
export function deleteUnit(id) {
	write(
		'units',
		loadUnits().filter((u) => u.id !== id)
	);
	localStorage.removeItem(`${PREFIX}progress.${id}`);
	const stats = loadStats();
	delete stats.highscores[id];
	saveStats(stats);
}

// --- Learning progress -------------------------------------------------------

/**
 * @param {string} unitId
 * @returns {UnitProgress}
 */
export function loadProgress(unitId) {
	return read(`progress.${unitId}`, {});
}

/**
 * @param {string} unitId
 * @param {UnitProgress} progress
 */
export function saveProgress(unitId, progress) {
	write(`progress.${unitId}`, progress);
}

// --- Settings ----------------------------------------------------------------

/**
 * Remembered choices of the learner.
 * @typedef {object} Settings
 * @property {'front-back' | 'back-front' | 'mixed'} direction  front-back = Latein → Deutsch
 * @property {number} roundSize  number of words per round, 0 = all
 * @property {'cards' | 'typing' | 'choice'} mode  flash cards, type the answer, or multiple choice
 * @property {number} clock  seconds per word, 0 = off (one of CLOCK_SECONDS)
 * @property {boolean} sound  little sounds for XP, level-up and wrong answers (see sound.js)
 */

/** @type {Settings} */
const DEFAULT_SETTINGS = {
	direction: 'front-back',
	roundSize: 10,
	mode: 'cards',
	clock: 0,
	sound: false
};

/** The choices for the time per word, besides 0 = off. */
export const CLOCK_SECONDS = [5, 10, 20];

/** @returns {Settings} */
export function loadSettings() {
	const settings = { ...DEFAULT_SETTINGS, ...read('settings', {}) };
	// before batch 13 the clock was a time for the whole round (60, 180 or 300 seconds)
	if (!CLOCK_SECONDS.includes(settings.clock)) settings.clock = 0;
	return settings;
}

/** @param {Settings} settings */
export function saveSettings(settings) {
	write('settings', settings);
}

// --- Stats -------------------------------------------------------------------

/**
 * @typedef {object} Stats
 * @property {Record<string, number>} highscores  best XP of a round, by unit id
 * @property {DayStreak} days                     rounds finished on days in a row
 * @property {number} xp                          all XP ever earned (→ level, see learn/level.js)
 * @property {Record<string, string>} advancements  unlocked advancements: id → ISO date (learn/advancements.js)
 */

/** @returns {Stats} */
export function loadStats() {
	return {
		highscores: {},
		days: { lastDay: '', days: 0 },
		xp: 0,
		advancements: {},
		...read('stats', {})
	};
}

/** @param {Stats} stats */
export function saveStats(stats) {
	write('stats', stats);
}

// --- Backup ------------------------------------------------------------------

/**
 * A backup file: all units with their progress, and the stats (settings are per device
 * and not included).
 * @typedef {object} Backup
 * @property {'vokabulator'} app
 * @property {number} schema
 * @property {string} exportedAt  ISO timestamp
 * @property {Unit[]} units
 * @property {Record<string, UnitProgress>} progress  by unit id
 * @property {Stats} [stats]  missing in backups made before the block-world design
 */

/** @returns {Backup} */
export function exportBackup() {
	const units = loadUnits();
	return {
		app: 'vokabulator',
		schema: SCHEMA_VERSION,
		exportedAt: new Date().toISOString(),
		units,
		progress: Object.fromEntries(units.map((u) => [u.id, loadProgress(u.id)])),
		stats: loadStats()
	};
}

/**
 * Restore a backup on this device. Units from the backup are added, or replace
 * the unit with the same id (including its progress). Other units stay untouched.
 * Stats are merged, so nothing earned on either device gets lost (see mergeStats).
 *
 * @param {unknown} data  the parsed JSON file
 * @returns {number} number of restored units
 */
export function importBackup(data) {
	const backup = /** @type {Partial<Backup>} */ (data);
	if (backup?.app !== 'vokabulator' || !Array.isArray(backup.units)) {
		throw new Error('Das ist keine Vokabulator-Sicherung.');
	}
	if ((backup.schema ?? 0) > SCHEMA_VERSION) {
		throw new Error('Diese Sicherung stammt aus einer neueren Vokabulator-Version.');
	}
	for (const unit of backup.units) {
		saveUnit(unit);
		saveProgress(unit.id, backup.progress?.[unit.id] ?? {});
	}
	if (backup.stats) saveStats(mergeStats(loadStats(), backup.stats));
	return backup.units.length;
}

/**
 * Combine the stats of two devices: the higher XP and records, all advancements
 * (with the earlier date), and the more recent run of days.
 * @param {Stats} a
 * @param {Partial<Stats>} b
 * @returns {Stats}
 */
export function mergeStats(a, b) {
	const highscores = { ...a.highscores };
	for (const [id, points] of Object.entries(b.highscores ?? {})) {
		highscores[id] = Math.max(highscores[id] ?? 0, points);
	}
	const advancements = { ...a.advancements };
	for (const [id, date] of Object.entries(b.advancements ?? {})) {
		advancements[id] = advancements[id] && advancements[id] < date ? advancements[id] : date;
	}
	const days = b.days && b.days.lastDay > a.days.lastDay ? b.days : a.days;
	return { highscores, advancements, days, xp: Math.max(a.xp, b.xp ?? 0) };
}

// --- Schema ------------------------------------------------------------------

/**
 * Called once at app start. Later schema changes get their migration step here,
 * e.g. `if (version < 2) { ...; version = 2 }`.
 */
export function migrate() {
	const version = read('schema', 0);
	if (version === 0) write('schema', SCHEMA_VERSION);
}
