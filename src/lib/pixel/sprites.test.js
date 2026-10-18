import { describe, expect, it } from 'vitest';
import { SPRITES, spriteDataUri, spriteRuns } from './sprites.js';

describe('SPRITES', () => {
	for (const [name, sprite] of Object.entries(SPRITES)) {
		it(`${name}: 16 rows of 16 characters, every colour defined`, () => {
			expect(sprite.rows).toHaveLength(16);
			for (const row of sprite.rows) {
				expect(row).toHaveLength(16);
				for (const char of row) {
					if (char !== '.') expect(sprite.palette[char], `colour "${char}"`).toBeDefined();
				}
			}
		});
	}
});

describe('spriteRuns', () => {
	it('merges neighbouring pixels of one colour', () => {
		const runs = spriteRuns('sun');
		expect(runs[0]).toEqual({ x: 4, y: 3, width: 8, color: '#e0a800' });
	});
});

describe('spriteDataUri', () => {
	it('is a usable SVG data URI', () => {
		expect(spriteDataUri('dirt')).toMatch(/^data:image\/svg\+xml,%3Csvg/);
	});
});
