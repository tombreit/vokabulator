<!--
  Shows what an importer recognised and saves it as a learning unit.
  Used by every import method on the /neu page.
-->
<script>
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { buildUnit, LANGS } from '#lib/model.js';
	import { withChallenge } from '#lib/share.js';
	import { getUnit, saveUnit } from '#lib/storage.js';

	/** @type {{ draft: import('#lib/model.js').UnitDraft }} */
	let { draft } = $props();

	// The learner can correct the language; it is kept while the draft changes (e.g. while typing).
	let lang = $state(untrack(() => draft.lang));

	const unit = $derived(buildUnit({ ...draft, lang }));
	const byId = $derived(new Map(unit.entries.map((e) => [e.id, e])));
	const replaces = $derived(getUnit(unit.id) !== undefined);

	/** @param {'/lernen/[id]' | '/einheit/[id]'} next  where to go after saving */
	function save(next) {
		saveUnit(unit);
		// a challenge from a shared link goes along to the learning page
		goto(
			next === '/lernen/[id]'
				? withChallenge(resolve(next, { id: unit.id }), page.url)
				: resolve(next, { id: unit.id })
		);
	}
</script>

<section class="card preview">
	<h2>{LANGS[unit.lang].flag} {unit.title}</h2>
	<p class="muted">
		{unit.entries.length} Wörter in {unit.sections.length}
		{unit.sections.length === 1 ? 'Abschnitt' : 'Abschnitten'}
	</p>

	<label class="lang">
		Sprache
		<select bind:value={lang}>
			{#each Object.entries(LANGS) as [code, { name, flag }] (code)}
				<option value={code}>{flag} {name}</option>
			{/each}
		</select>
	</label>

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

	{#if replaces}
		<p class="muted">
			♻️ Diese Lerneinheit hast du schon – sie wird aktualisiert, dein Lernstand bleibt.
		</p>
	{/if}

	<div class="buttons">
		<button
			class="button primary go"
			onclick={() => save('/lernen/[id]')}
			disabled={unit.entries.length === 0}
		>
			Speichern & loslegen 🚀
		</button>
		<button
			class="button"
			onclick={() => save('/einheit/[id]')}
			disabled={unit.entries.length === 0}
		>
			Nur speichern
		</button>
	</div>
</section>

<style>
	.preview {
		margin-top: var(--gap);
	}

	.lang {
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
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

	.buttons {
		display: grid;
		gap: 0.6rem;
		margin-top: var(--gap);
	}

	.go {
		min-height: 3.75rem;
		font-size: 1.15rem;
	}
</style>
