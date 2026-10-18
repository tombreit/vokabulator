import { beforeEach, describe, expect, it } from 'vitest';
import {
	deleteUnit,
	exportBackup,
	importBackup,
	loadProgress,
	loadUnits,
	saveProgress,
	saveUnit
} from './storage.js';

/** A minimal in-memory localStorage, because tests run in Node. */
function fakeLocalStorage() {
	const data = new Map();
	return {
		getItem: (/** @type {string} */ k) => data.get(k) ?? null,
		setItem: (/** @type {string} */ k, /** @type {string} */ v) => data.set(k, String(v)),
		removeItem: (/** @type {string} */ k) => data.delete(k),
		clear: () => data.clear(),
		key: (/** @type {number} */ i) => [...data.keys()][i] ?? null,
		get length() {
			return data.size;
		}
	};
}

/** @param {string} id @param {string} createdAt */
const unit = (id, createdAt = '2026-10-18T10:00:00.000Z') => ({
	id,
	title: `Unit ${id}`,
	lang: /** @type {const} */ ('la'),
	source: /** @type {const} */ ({ type: 'text' }),
	createdAt,
	sections: [{ title: 'A', entryIds: ['amicus'] }],
	entries: [{ id: 'amicus', front: 'amicus', frontInfo: '', back: 'der Freund', refs: '' }]
});
const someProgress = { amicus: { box: 3, hard: true, right: 2, wrong: 1, lastSeen: 5 } };

beforeEach(() => {
	globalThis.localStorage = /** @type {Storage} */ (fakeLocalStorage());
});

describe('units', () => {
	it('lists newest first and replaces a unit with the same id', () => {
		saveUnit(unit('old', '2026-01-01T00:00:00.000Z'));
		saveUnit(unit('new', '2026-02-01T00:00:00.000Z'));
		saveUnit({ ...unit('old', '2026-01-01T00:00:00.000Z'), title: 'renamed' });

		expect(loadUnits().map((u) => [u.id, u.title])).toEqual([
			['new', 'Unit new'],
			['old', 'renamed']
		]);
	});

	it('deletes a unit together with its progress', () => {
		saveUnit(unit('a'));
		saveProgress('a', someProgress);
		deleteUnit('a');
		expect(loadUnits()).toEqual([]);
		expect(loadProgress('a')).toEqual({});
	});
});

describe('backup', () => {
	it('restores units and progress on another device', () => {
		saveUnit(unit('a'));
		saveProgress('a', someProgress);
		const file = JSON.parse(JSON.stringify(exportBackup()));

		globalThis.localStorage = /** @type {Storage} */ (fakeLocalStorage()); // "another device"
		saveUnit(unit('local'));

		expect(importBackup(file)).toBe(1);
		expect(
			loadUnits()
				.map((u) => u.id)
				.sort()
		).toEqual(['a', 'local']);
		expect(loadProgress('a')).toEqual(someProgress);
	});

	it('rejects files that are not a backup', () => {
		expect(() => importBackup({ hello: 'world' })).toThrow(/keine Vokabulator-Sicherung/);
		expect(() => importBackup({ app: 'vokabulator', schema: 99, units: [] })).toThrow(/neueren/);
	});
});
