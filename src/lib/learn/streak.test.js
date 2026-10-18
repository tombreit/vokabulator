import { describe, expect, it } from 'vitest';
import { currentDays, localDay, recordDay } from './streak.js';

describe('recordDay', () => {
	const none = { lastDay: '', days: 0 };

	it('starts with one day, counts on day by day, starts over after a gap', () => {
		let streak = recordDay(none, '2026-10-17');
		expect(streak).toEqual({ lastDay: '2026-10-17', days: 1 });
		streak = recordDay(streak, '2026-10-17'); // second round, same day
		expect(streak.days).toBe(1);
		streak = recordDay(streak, '2026-10-18');
		expect(streak.days).toBe(2);
		streak = recordDay(streak, '2026-10-20');
		expect(streak).toEqual({ lastDay: '2026-10-20', days: 1 });
	});

	it('works across month and year ends', () => {
		expect(recordDay({ lastDay: '2026-10-31', days: 4 }, '2026-11-01').days).toBe(5);
		expect(recordDay({ lastDay: '2026-12-31', days: 4 }, '2027-01-01').days).toBe(5);
	});
});

describe('currentDays', () => {
	it('is still alive the day after, broken the day after that', () => {
		const streak = { lastDay: '2026-10-18', days: 3 };
		expect(currentDays(streak, '2026-10-18')).toBe(3);
		expect(currentDays(streak, '2026-10-19')).toBe(3);
		expect(currentDays(streak, '2026-10-20')).toBe(0);
	});
});

describe('localDay', () => {
	it('formats the local date', () => {
		expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
	});
});
