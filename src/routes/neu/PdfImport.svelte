<!-- Import method "PDF-Datei": choose a vocabulary PDF, e.g. one downloaded from C.C.Buchner. -->
<script>
	import { loadPdfjs, readPdf } from '#lib/import/pdf-items.js';
	import { parseLexikon } from '#lib/import/pdf-lexikon.js';
	import { slugify } from '#lib/model.js';
	import DraftPreview from './DraftPreview.svelte';

	/** @type {{ parsed: import('#lib/model.js').ParsedUnit, fileName: string } | undefined} */
	let result = $state();
	let busy = $state(false);
	let error = $state('');

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	async function choose(event) {
		const file = event.currentTarget.files?.[0];
		if (!file) return;
		busy = true;
		error = '';
		result = undefined;
		try {
			const pages = await readPdf(new Uint8Array(await file.arrayBuffer()), await loadPdfjs());
			const parsed = parseLexikon(pages);
			if (parsed.sections.length === 0) {
				error =
					'In diesem PDF habe ich keine Vokabeln gefunden. 🤔 Probier es mit „Text eintippen“.';
			} else {
				result = { parsed, fileName: file.name };
			}
		} catch {
			error = 'Diese Datei konnte ich nicht lesen. Ist es wirklich ein PDF? 🙈';
		} finally {
			busy = false;
		}
	}
</script>

<div class="card form">
	<label class="button primary pick">
		{busy ? '⏳ Lese PDF …' : '📄 PDF auswählen'}
		<input type="file" accept="application/pdf,.pdf" onchange={choose} disabled={busy} />
	</label>
	<p class="muted hint">
		Funktioniert mit den Vokabel-PDFs von C.C.Buchner (fett = Vokabel, normal = Bedeutung).
	</p>
</div>

{#if error}
	<p class="card error" role="alert">{error}</p>
{/if}

{#if result}
	<!-- The id comes from the title, so importing the same PDF again keeps the learning progress. -->
	<DraftPreview
		draft={{
			id: `pdf-${slugify(result.parsed.title)}`,
			lang: 'la',
			source: { type: 'pdf-file', name: result.fileName },
			parsed: result.parsed
		}}
	/>
{/if}

<style>
	.form {
		display: grid;
		gap: var(--gap);
	}

	.pick {
		min-height: 3.5rem;

		input {
			display: none;
		}
	}

	.hint {
		margin: -0.5rem 0 0;
		font-size: 0.9rem;
	}

	.error {
		margin-top: var(--gap);
		border-color: var(--bad);
	}
</style>
