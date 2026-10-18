// @ts-check
/**
 * All persistence of Vokabulator, in one place.
 *
 * Data lives in the browser's localStorage under keys starting with "vokabulator.":
 *   vokabulator.schema               schema version (number)
 *   vokabulator.units                Unit[]               (see model.js)
 *   vokabulator.progress.<unitId>    UnitProgress         (see learn/leitner.js)
 *   vokabulator.settings             Settings
 *
 * exportBackup() / importBackup() move units + progress between devices as a JSON file.
 *
 * Pages call these functions explicitly whenever something changes – there is
 * no hidden auto-saving. Open DevTools → Application → Local Storage to look at the data.
 */

/** @typedef {import('./model.js').Unit} Unit */
/** @typedef {import('./learn/leitner.js').UnitProgress} UnitProgress */

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
 */

/** @type {Settings} */
const DEFAULT_SETTINGS = { direction: 'front-back', roundSize: 10, mode: 'cards' };

/** @returns {Settings} */
export function loadSettings() {
	return { ...DEFAULT_SETTINGS, ...read('settings', {}) };
}

/** @param {Settings} settings */
export function saveSettings(settings) {
	write('settings', settings);
}

// --- Backup ------------------------------------------------------------------

/**
 * A backup file: all units with their progress (settings are per device and not included).
 * @typedef {object} Backup
 * @property {'vokabulator'} app
 * @property {number} schema
 * @property {string} exportedAt  ISO timestamp
 * @property {Unit[]} units
 * @property {Record<string, UnitProgress>} progress  by unit id
 */

/** @returns {Backup} */
export function exportBackup() {
	const units = loadUnits();
	return {
		app: 'vokabulator',
		schema: SCHEMA_VERSION,
		exportedAt: new Date().toISOString(),
		units,
		progress: Object.fromEntries(units.map((u) => [u.id, loadProgress(u.id)]))
	};
}

/**
 * Restore a backup on this device. Units from the backup are added, or replace
 * the unit with the same id (including its progress). Other units stay untouched.
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
	return backup.units.length;
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
