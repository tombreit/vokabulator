import { describe, expect, it } from 'vitest';
import { checkAnswer, meanings, normalize } from './check-answer.js';

/** @param {string} front @param {string} back @param {string} [frontInfo] */
const entry = (front, back, frontInfo = '') => ({ id: 'x', front, frontInfo, back, refs: '' });

const capere = entry('capere, capiō, cēpī, captum', 'nehmen, ergreifen, fangen; erobern');
const consilium = entry(
	'cōnsilium, cōnsiliī',
	'der Plan, der Rat, die Beratung, der Beschluss',
	'n'
);
const ducere = entry('dūcere, dūcō, dūxī', 'führen, ziehen; m. dopp. Akk. halten für');

describe('normalize', () => {
	it('ignores case, macrons, articles, brackets and abbreviations', () => {
		expect(normalize('Cēpī')).toBe('cepi');
		expect(normalize(' Der  Plan ')).toBe('plan');
		expect(normalize('(er, sie, es) selbst')).toBe('selbst');
		expect(normalize('m. dopp. Akk. halten für')).toBe('halten für');
		expect(normalize('groß')).toBe('gross');
		expect(normalize('Tür')).toBe('tür'); // umlauts stay
	});

	it('keeps a lone article as the word itself', () => {
		expect(normalize('die')).toBe('die');
	});
});

describe('meanings', () => {
	it('splits at , ; and / but not inside brackets', () => {
		expect(meanings('in (… hinein), nach, gegen (wohin?)')).toEqual(['in', 'nach', 'gegen']);
		expect(meanings('ā / ab')).toEqual(['a', 'ab']);
	});
});

describe('checkAnswer: foreign → German', () => {
	it('accepts any one of the meanings', () => {
		expect(checkAnswer('nehmen', capere, false, 'la')).toBe('right');
		expect(checkAnswer(' Erobern ', capere, false, 'la')).toBe('right');
		expect(checkAnswer('Beratung', consilium, false, 'la')).toBe('right');
		expect(checkAnswer('der Rat', consilium, false, 'la')).toBe('right');
		expect(checkAnswer('halten für', ducere, false, 'la')).toBe('right');
		expect(
			checkAnswer('befinden', entry('esse, sum, fuī', 'sein, sich befinden'), false, 'la')
		).toBe('right');
	});

	it('wants every typed meaning to be right', () => {
		expect(checkAnswer('nehmen, fangen', capere, false, 'la')).toBe('right');
		expect(checkAnswer('nehmen, essen', capere, false, 'la')).toBe('wrong');
	});

	it('forgives one wrong letter in longer words', () => {
		expect(checkAnswer('nehmn', capere, false, 'la')).toBe('typo');
		expect(checkAnswer('ergrifen', capere, false, 'la')).toBe('typo');
		expect(checkAnswer('unt', entry('et', 'und'), false, 'la')).toBe('wrong'); // too short to guess
	});

	it('says wrong for wrong or empty answers', () => {
		expect(checkAnswer('essen', capere, false, 'la')).toBe('wrong');
		expect(checkAnswer('', capere, false, 'la')).toBe('wrong');
	});
});

describe('checkAnswer: German → foreign', () => {
	it('Latin: the first form is enough, the whole lemma counts too, macrons optional', () => {
		expect(checkAnswer('capere', capere, true, 'la')).toBe('right');
		expect(checkAnswer('capere, capio, cepi, captum', capere, true, 'la')).toBe('right');
		expect(checkAnswer('cōnsilium', consilium, true, 'la')).toBe('right');
		expect(checkAnswer('capio', capere, true, 'la')).toBe('wrong');
		expect(checkAnswer('caper', capere, true, 'la')).toBe('typo');
	});

	it('English and Spanish: articles do not matter, every listed word counts', () => {
		expect(checkAnswer('dog', entry('the dog', 'der Hund'), true, 'en')).toBe('right');
		expect(checkAnswer('large', entry('big, large', 'groß'), true, 'en')).toBe('right');
		expect(checkAnswer('perro', entry('el perro', 'der Hund'), true, 'es')).toBe('right');
	});
});
