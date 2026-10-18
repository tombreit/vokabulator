import { describe, expect, it } from 'vitest';
import { buildUnit, slugify } from './model.js';

describe('slugify', () => {
	it('drops macrons and punctuation', () => {
		expect(slugify('capere, capiō, cēpī, captum')).toBe('capere-capio-cepi-captum');
		expect(slugify('in Präp. m. Abl.')).toBe('in-prap-m-abl');
	});
});

describe('buildUnit', () => {
	const source = /** @type {const} */ ({ type: 'text' });

	it('stores a word that appears in several sections only once', () => {
		const word = { front: 'cōnsilium, cōnsiliī', frontInfo: 'n', back: 'der Plan, der Rat' };
		const unit = buildUnit({
			id: 'u1',
			lang: 'la',
			source,
			parsed: {
				title: 'Test',
				sections: [
					{ title: 'A', entries: [word, { front: 'et', back: 'und' }] },
					{ title: 'B', entries: [word] }
				]
			}
		});

		expect(unit.entries).toHaveLength(2);
		expect(unit.sections).toEqual([
			{ title: 'A', entryIds: ['consilium-consilii-n', 'et'] },
			{ title: 'B', entryIds: ['consilium-consilii-n'] }
		]);
	});

	it('keeps different words with the same front apart', () => {
		const unit = buildUnit({
			id: 'u2',
			lang: 'en',
			source,
			parsed: {
				title: 'Test',
				sections: [
					{
						title: 'A',
						entries: [
							{ front: 'right', back: 'richtig' },
							{ front: 'right', back: 'rechts' }
						]
					}
				]
			}
		});

		expect(unit.entries.map((e) => [e.id, e.back])).toEqual([
			['right', 'richtig'],
			['right-2', 'rechts']
		]);
	});

	it('distinguishes words by their grammar info', () => {
		const unit = buildUnit({
			id: 'u3',
			lang: 'la',
			source,
			parsed: {
				title: 'Test',
				sections: [
					{
						title: 'A',
						entries: [
							{ front: 'in', frontInfo: 'Präp. m. Abl.', back: 'in, auf, bei (wo?)' },
							{ front: 'in', frontInfo: 'Präp. m. Akk.', back: 'in (… hinein), nach' }
						]
					}
				]
			}
		});

		expect(unit.entries.map((e) => e.id)).toEqual(['in-prap-m-abl', 'in-prap-m-akk']);
	});

	it('drops empty sections', () => {
		const unit = buildUnit({
			id: 'u4',
			lang: 'la',
			source,
			parsed: { title: 'T', sections: [{ title: 'leer', entries: [] }] }
		});
		expect(unit.sections).toEqual([]);
	});
});
