<!--
  Shows what an importer recognised and saves it as a learning unit.
  Used by every import method on the /neu page.
-->
<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { buildUnit, LANGS } from '#lib/model.js';
	import { saveUnit } from '#lib/storage.js';

	/** @type {{ draft: import('#lib/model.js').UnitDraft }} */
	let { draft } = $props();

	const unit = $derived(buildUnit(draft));
	const byId = $derived(new Map(unit.entries.map((e) => [e.id, e])));

	function save() {
		saveUnit(unit);
		goto(resolve('/einheit/[id]', { id: unit.id }));
	}
</script>

<section class="card preview">
	<h2>{LANGS[unit.lang].flag} {unit.title}</h2>
	<p class="muted">
		{unit.entries.length} Wörter in {unit.sections.length}
		{unit.sections.length === 1 ? 'Abschnitt' : 'Abschnitten'}
	</p>

	{#each unit.sections as section, i (i)}
		<details>
			<summary>{section.title} <span class="muted">({section.entryIds.length})</span></summary>
			<ul>
				{#each section.entryIds as entryId (entryId)}
					{@const entry = byId.get(entryId)}
					{#if entry}
						<li>
							<strong>{entry.front}</strong>
							{#if entry.frontInfo}<em>{entry.frontInfo}</em>{/if}
							→ {entry.back}
						</li>
					{/if}
				{/each}
			</ul>
		</details>
	{/each}

	<button class="button primary save" onclick={save} disabled={unit.entries.length === 0}>
		💾 Lerneinheit speichern
	</button>
</section>

<style>
	.preview {
		margin-top: var(--gap);
	}

	summary {
		cursor: pointer;
		padding: 0.4rem 0;
		font-weight: 600;
	}

	ul {
		padding-left: 1.2rem;
		margin: 0 0 0.5rem;
	}

	.save {
		width: 100%;
		margin-top: var(--gap);
	}
</style>
