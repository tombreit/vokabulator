<!-- One learning unit: its words by section, plus the way into learning. -->
<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { LANGS } from '#lib/model.js';
	import { deleteUnit } from '#lib/storage.js';

	/** @type {import('./$types').PageProps} */
	let { data } = $props();

	const unit = $derived(data.unit);
	const byId = $derived(new Map(unit.entries.map((e) => [e.id, e])));

	function remove() {
		if (!confirm(`„${unit.title}“ mit allem Lernfortschritt löschen?`)) return;
		deleteUnit(unit.id);
		goto(resolve('/'));
	}
</script>

<h1>{LANGS[unit.lang].flag} {unit.title}</h1>
<p class="muted">{unit.entries.length} Wörter</p>

{#each unit.sections as section, i (i)}
	<section class="card">
		<h2>{section.title}</h2>
		<ul>
			{#each section.entryIds as entryId (entryId)}
				{@const entry = byId.get(entryId)}
				{#if entry}
					<li>
						<span class="front">
							<strong>{entry.front}</strong>
							{#if entry.frontInfo}<em>{entry.frontInfo}</em>{/if}
						</span>
						<span>{entry.back}</span>
					</li>
				{/if}
			{/each}
		</ul>
	</section>
{/each}

<button class="button danger" onclick={remove}>🗑️ Lerneinheit löschen</button>

<style>
	section {
		margin-bottom: var(--gap);
	}

	h2 {
		font-size: 1.1rem;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		display: grid;
		gap: 0.1rem;
		padding: 0.5rem 0;
		border-top: 1px solid var(--line);
	}

	.front em {
		color: var(--muted);
		margin-left: 0.25em;
	}
</style>
