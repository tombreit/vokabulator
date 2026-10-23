// @ts-check
/**
 * The data model of Vokabulator: what a learning unit ("Lerneinheit") looks like.
 *
 * Every importer (pasted text, C.C.Buchner code, a file like an Anki deck) ends with a
 * `UnitDraft`, and `buildUnit()` turns that into a `Unit`, which is what gets stored.
 * Importers that read tables (Anki decks) get there through the shared step in import/table.js.
 * Learning progress is kept separately per unit (see storage.js / learn/leitner.js),
 * so re-importing a unit does not lose progress.
 */

/** @typedef {'la' | 'en' | 'es' | 'fr'} Lang */

/** Languages the app knows about; the "back" side is always German. */
export const LANGS = /** @type {const} */ ({
	la: { name: 'Latein', flag: '🏛️' },
	en: { name: 'Englisch', flag: '🇬🇧' },
	es: { name: 'Spanisch', flag: '🇪🇸' },
	fr: { name: 'Französisch', flag: '🇫🇷' }
});

/**
 * One vocabulary item as it comes out of an importer.
 * @typedef {object} EntryDraft
 * @property {string} front      foreign side, e.g. "capere, capiō, cēpī, captum"
 * @property {string} [frontInfo] grammar hints belonging to the front, e.g. "m" or "Dat. von egō"
 * @property {string} back       German meaning(s), e.g. "nehmen, ergreifen, fangen; erobern"
 * @property {string} [refs]     textbook chapter references, e.g. "6. 10. Ü1"
 */

/**
 * A stored vocabulary item.
 * @typedef {Required<EntryDraft> & { id: string }} Entry
 */

/** @typedef {{ title: string, entries: EntryDraft[] }} ParsedSection */
/** @typedef {{ title: string, sections: ParsedSection[] }} ParsedUnit */

/**
 * Everything an importer delivers; `buildUnit()` turns it into a Unit.
 * @typedef {{ id: string, lang: Lang, source: Source, parsed: ParsedUnit }} UnitDraft
 */

/** @typedef {{ title: string, entryIds: string[] }} Section */

/**
 * Where a unit came from (used for re-import and sharing). "pdf-file" is no longer made
 * (PDF upload was removed in batch 12), but older units may still have it.
 * @typedef {{ type: 'text' } | { type: 'file', name: string } | { type: 'pdf-file', name: string } | { type: 'ccbuchner', code: string, pdfUrl: string }} Source
 */

/**
 * @typedef {object} Unit
 * @property {string} id         e.g. "ccb-40702-229", "txt-<uuid>" or "anki-<deck>-<note type>[-<part>]"
 * @property {string} title
 * @property {Lang} lang
 * @property {Source} source
 * @property {string} createdAt  ISO timestamp
 * @property {Section[]} sections
 * @property {Entry[]} entries   every word exactly once, even if it appears in several sections
 */

/**
 * Turn text into a readable, URL-safe id: "capere, capiō" -> "capere-capio".
 * @param {string} text
 */
export function slugify(text) {
	return text
		.normalize('NFD')
		.replace(/\p{M}/gu, '') // drop accents and macrons
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Build a storable unit from importer output.
 *
 * Entries get a stable id derived from their front side (+ grammar info), so the
 * same word in two sections is stored once and shares its learning progress.
 * Two different words that happen to share a front (e.g. English "right" =
 * "richtig" / "rechts") are kept apart with a numeric suffix.
 *
 * @param {UnitDraft} draft
 * @returns {Unit}
 */
export function buildUnit({ id, lang, source, parsed }) {
	/** @type {Map<string, Entry>} */
	const byId = new Map();

	const sections = parsed.sections.map((section) => {
		/** @type {string[]} */
		const entryIds = [];
		for (const draft of section.entries) {
			const entry = toEntry(draft, byId);
			byId.set(entry.id, entry);
			if (!entryIds.includes(entry.id)) entryIds.push(entry.id);
		}
		return { title: section.title, entryIds };
	});

	return {
		id,
		title: parsed.title,
		lang,
		source,
		createdAt: new Date().toISOString(),
		sections: sections.filter((s) => s.entryIds.length > 0),
		entries: [...byId.values()]
	};
}

/**
 * @param {EntryDraft} draft
 * @param {Map<string, Entry>} existing
 * @returns {Entry}
 */
function toEntry(draft, existing) {
	const entry = {
		front: draft.front.trim(),
		frontInfo: (draft.frontInfo ?? '').trim(),
		back: draft.back.trim(),
		refs: (draft.refs ?? '').trim()
	};
	const baseId = slugify(`${entry.front} ${entry.frontInfo}`) || 'wort';

	for (let n = 1; ; n++) {
		const id = n === 1 ? baseId : `${baseId}-${n}`;
		const other = existing.get(id);
		if (!other || (other.back === entry.back && other.frontInfo === entry.frontInfo)) {
			return { id, ...entry };
		}
	}
}
