import { describe, expect, it } from 'vitest';
import { levelFor, xpToNextLevel } from './level.js';

describe('levelFor', () => {
	it('starts at level 0', () => {
		expect(levelFor(0)).toEqual({ level: 0, into: 0, needed: 100, share: 0 });
	});

	it('needs 100, then 150, then 200 XP per level', () => {
		expect(levelFor(99).level).toBe(0);
		expect(levelFor(100)).toEqual({ level: 1, into: 0, needed: 150, share: 0 });
		expect(levelFor(249).level).toBe(1);
		expect(levelFor(250).level).toBe(2);
		expect(levelFor(450).level).toBe(3);
	});

	it('reaches level 10 after 3250 XP', () => {
		expect(levelFor(3249).level).toBe(9);
		expect(levelFor(3250).level).toBe(10);
	});

	it('reports progress within the level', () => {
		expect(levelFor(175)).toEqual({ level: 1, into: 75, needed: 150, share: 0.5 });
	});

	it('xpToNextLevel grows by 50 per level', () => {
		expect([0, 1, 2, 9].map(xpToNextLevel)).toEqual([100, 150, 200, 550]);
	});
});
