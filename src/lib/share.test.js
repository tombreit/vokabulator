import { describe, expect, it } from 'vitest';
import { buildUnit } from './model.js';
import { packUnit, readChallenge, sharePath, unpackUnit } from './share.js';

const parsed = {
	title: 'Lektion 12',
	sections: [
		{
			title: 'A',
			entries: [
				{ front: 'cōnsilium, cōnsiliī', frontInfo: 'n', back: 'der Plan, der Rat' },
				{ front: 'amīcus', back: 'der Freund' }
			]
		},
		{ title: 'B', entries: [{ front: 'amīcus', back: 'der Freund' }] }
	]
};
const textUnit = buildUnit({ id: 'txt-1', lang: 'la', source: { type: 'text' }, parsed });
const challenge = {
	points: 57,
	mode: /** @type {const} */ ('typing'),
	roundSize: 10,
	direction: /** @type {const} */ ('front-back'),
	clock: 10
};

describe('sharePath', () => {
	it('shares only the Mediencode for C.C.Buchner units', async () => {
		const unit = { ...textUnit, source: { type: 'ccbuchner', code: '40702-229', pdfUrl: '' } };
		expect(await sharePath(/** @type {any} */ (unit))).toBe('/neu?code=40702-229');
	});

	it('puts the words after # for other units', async () => {
		const path = await sharePath(textUnit);
		expect(path).toMatch(/^\/neu#d=[\w-]+$/);
	});

	it('adds a challenge to the query', async () => {
		const path = await sharePath(textUnit, challenge);
		const url = new URL(path, 'https://example.org');
		expect(readChallenge(url.searchParams)).toEqual(challenge);
		expect(url.hash).toMatch(/^#d=/);
	});
});

describe('packUnit / unpackUnit', () => {
	it('gets the same unit back (including id, sections and grammar info)', async () => {
		const draft = await unpackUnit(await packUnit(textUnit));
		const again = buildUnit(draft);
		expect(again.id).toBe('txt-1');
		expect(again.title).toBe('Lektion 12');
		expect(again.sections).toEqual(textUnit.sections);
		expect(again.entries).toEqual(textUnit.entries);
	});

	it('keeps links short', async () => {
		const entries = Array.from({ length: 150 }, (_, i) => ({
			front: `verbum${i}, verbī`,
			back: `das Wort ${i}, die Äußerung`
		}));
		const big = buildUnit({
			id: 'x',
			lang: 'la',
			source: { type: 'text' },
			parsed: { title: 'Groß', sections: [{ title: 'A', entries }] }
		});
		expect((await packUnit(big)).length).toBeLessThan(4000);
	});
});

describe('readChallenge', () => {
	it('ignores links without challenge and unknown values', () => {
		expect(readChallenge(new URLSearchParams('code=1-2'))).toBeUndefined();
		// clock=60: a time for the whole round, from links made before batch 13
		expect(readChallenge(new URLSearchParams('challenge=30&mode=hack&words=999&clock=60'))).toEqual(
			{
				points: 30,
				mode: 'cards',
				roundSize: 10,
				direction: 'front-back',
				clock: 0
			}
		);
	});
});
