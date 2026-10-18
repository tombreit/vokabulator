import { describe, expect, it } from 'vitest';
import { parseText } from './text-parser.js';

describe('parseText', () => {
	it('reads one word per line with the supported separators', () => {
		const text = [
			'amicus = der Freund',
			'the dog ; der Hund',
			'el perro\tder Hund',
			'puella - das Mädchen',
			'servus – der Sklave'
		].join('\n');

		const { parsed, errors } = parseText(text, 'Test');

		expect(errors).toEqual([]);
		expect(parsed.title).toBe('Test');
		expect(parsed.sections).toHaveLength(1);
		expect(parsed.sections[0].title).toBe('Alle Wörter');
		expect(parsed.sections[0].entries).toEqual([
			{ front: 'amicus', back: 'der Freund' },
			{ front: 'the dog', back: 'der Hund' },
			{ front: 'el perro', back: 'der Hund' },
			{ front: 'puella', back: 'das Mädchen' },
			{ front: 'servus', back: 'der Sklave' }
		]);
	});

	it('keeps semicolons in the meaning when an earlier separator matched', () => {
		const { parsed } = parseText('capere = nehmen, ergreifen; erobern', 'T');
		expect(parsed.sections[0].entries[0]).toEqual({
			front: 'capere',
			back: 'nehmen, ergreifen; erobern'
		});
	});

	it('starts a new section at lines beginning with #', () => {
		const { parsed } = parseText('# Lektion 1\na = b\n\n## Lektion 2\nc = d', 'T');
		expect(parsed.sections.map((s) => s.title)).toEqual(['Lektion 1', 'Lektion 2']);
		expect(parsed.sections[1].entries).toEqual([{ front: 'c', back: 'd' }]);
	});

	it('reports lines it cannot understand, with line numbers', () => {
		const { parsed, errors } = parseText('a = b\nnur ein Wort\n = leer', 'T');
		expect(parsed.sections[0].entries).toHaveLength(1);
		expect(errors).toEqual([
			{ lineNumber: 2, line: 'nur ein Wort' },
			{ lineNumber: 3, line: '= leer' }
		]);
	});
});
