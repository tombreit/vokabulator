<!-- One learning unit: how far you got, its words by section, and the way into learning. -->
<script>
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import StarButton from '#lib/components/StarButton.svelte';
	import { BOX_COUNT, learnedShare, progressOf, toggleHard } from '#lib/learn/leitner.js';
	import { LANGS } from '#lib/model.js';
	import { deleteUnit, loadProgress, saveProgress } from '#lib/storage.js';

	/** @type {import('./$types').PageProps} */
	let { data } = $props();
	// The page works with the unit as it was when the page opened (it cannot change meanwhile).
	const unit = untrack(() => data.unit);
	const byId = new Map(unit.entries.map((e) => [e.id, e]));

	let progress = $state(loadProgress(unit.id));
	const learned = $derived(learnedShare(unit.entries, progress));
	const hardCount = $derived(unit.entries.filter((e) => progressOf(progress, e.id).hard).length);

	/** @param {string} entryId */
	function toggleStar(entryId) {
		progress[entryId] = toggleHard(progressOf(progress, entryId));
		saveProgress(unit.id, progress);
	}

	function remove() {
		if (!confirm(`„${unit.title}“ mit allem Lernfortschritt löschen?`)) return;
		deleteUnit(unit.id);
		goto(resolve('/'));
	}
</script>

<h1>{LANGS[unit.lang].flag} {unit.title}</h1>

<div class="card summary">
	<p>
		<strong>{Math.round(learned * 100)} % gelernt</strong>
		<span class="muted">· {unit.entries.length} Wörter · {hardCount} ⭐</span>
	</p>
	<ProgressBar value={learned} label="Anteil gelernter Wörter" />
	<a class="button primary learn" href={resolve('/lernen/[id]', { id: unit.id })}>Lernen 🚀</a>
</div>

{#each unit.sections as section, i (i)}
	<section class="card">
		<h2>{section.title}</h2>
		<ul>
			{#each section.entryIds as entryId (entryId)}
				{@const entry = byId.get(entryId)}
				{@const p = progressOf(progress, entryId)}
				{#if entry}
					<li>
						<div>
							<strong>{entry.front}</strong>
							{#if entry.frontInfo}<em>{entry.frontInfo}</em>{/if}
							<br />{entry.back}
						</div>
						<span class="box" title="Fach {p.box} von {BOX_COUNT}">
							{'●'.repeat(p.box)}{'○'.repeat(BOX_COUNT - p.box)}
						</span>
						<StarButton hard={p.hard} ontoggle={() => toggleStar(entryId)} />
					</li>
				{/if}
			{/each}
		</ul>
	</section>
{/each}

<button class="button danger" onclick={remove}>🗑️ Lerneinheit löschen</button>

<style>
	.summary {
		display: grid;
		gap: 0.6rem;
		margin-bottom: var(--gap);

		p {
			margin: 0;
		}
	}

	.learn {
		min-height: 3.5rem;
		font-size: 1.15rem;
	}

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
		grid-template-columns: 1fr auto auto;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0;
		border-top: 1px solid var(--line);

		em {
			color: var(--muted);
			margin-left: 0.25em;
		}
	}

	.box {
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: var(--accent);
	}
</style>
