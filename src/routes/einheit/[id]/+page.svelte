<!-- One learning unit: how far you got, its words by section, and the way into learning. -->
<script>
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import StarButton from '#lib/components/StarButton.svelte';
	import {
		BOX_COUNT,
		BOX_EMOJI,
		learnedShare,
		progressOf,
		toggleHard
	} from '#lib/learn/leitner.js';
	import { LANGS } from '#lib/model.js';
	import { sharePath } from '#lib/share.js';
	import { deleteUnit, loadProgress, saveProgress } from '#lib/storage.js';

	/** @type {import('./$types').PageProps} */
	let { data } = $props();
	// The page works with the unit as it was when the page opened (it cannot change meanwhile).
	const unit = untrack(() => data.unit);
	const byId = new Map(unit.entries.map((e) => [e.id, e]));

	let progress = $state(loadProgress(unit.id));
	const learned = $derived(learnedShare(unit.entries, progress));
	const hardCount = $derived(unit.entries.filter((e) => progressOf(progress, e.id).hard).length);
	/** how many words sit in box 1, 2, … 5 */
	const perBox = $derived(
		BOX_EMOJI.map(
			(_, i) => unit.entries.filter((e) => progressOf(progress, e.id).box === i + 1).length
		)
	);

	/** @param {string} entryId */
	function toggleStar(entryId) {
		progress[entryId] = toggleHard(progressOf(progress, entryId));
		saveProgress(unit.id, progress);
	}

	/** For units from a Mediencode: load the vocabulary again (progress stays, entry ids are stable). */
	const reloadHref =
		unit.source.type === 'ccbuchner'
			? `${resolve('/neu')}?${new URLSearchParams({ code: unit.source.code, neu: '1' })}`
			: undefined;

	function remove() {
		if (!confirm(`„${unit.title}“ mit allem Lernfortschritt löschen?`)) return;
		deleteUnit(unit.id);
		goto(resolve('/'));
	}
</script>

<h1>{LANGS[unit.lang].flag} {unit.title}</h1>

<div class="card summary">
	<p class="learned">{Math.round(learned * 100)} % gelernt</p>
	<p class="muted">
		{unit.entries.length} Wörter{hardCount ? `, ${hardCount} davon als schwer markiert ⭐` : ''}
	</p>
	<ProgressBar value={learned} label="Anteil gelernter Wörter" />
	<ol class="boxes" aria-label="Wörter je Fach">
		{#each perBox as count, i (i)}
			<li title="Fach {i + 1}"><span>{BOX_EMOJI[i]}</span> {count}</li>
		{/each}
	</ol>
	<p class="muted hint">Jedes gewusste Wort klettert ein Fach höher – vom Ei bis zum Adler.</p>
	<a class="button primary learn" href={resolve('/lernen/[id]', { id: unit.id })}>Lernen 🚀</a>
</div>

{#each unit.sections as section, i (i)}
	<section class="card">
		<h2>{section.title}</h2>
		<ul class="words">
			{#each section.entryIds as entryId (entryId)}
				{@const entry = byId.get(entryId)}
				{@const p = progressOf(progress, entryId)}
				{#if entry}
					<li>
						<div>
							<strong class="foreign">{entry.front}</strong>
							{#if entry.frontInfo}<em>{entry.frontInfo}</em>{/if}
							<br />{entry.back}
						</div>
						<span class="box" title="Fach {p.box} von {BOX_COUNT}">{BOX_EMOJI[p.box - 1]}</span>
						<StarButton hard={p.hard} ontoggle={() => toggleStar(entryId)} />
					</li>
				{/if}
			{/each}
		</ul>
	</section>
{/each}

<div class="actions">
	<ShareButton
		label="📤 Teilen"
		title={unit.title}
		text={`Lern mit mir „${unit.title}“ im Vokabulator 🧠`}
		url={() => sharePath(unit)}
	/>
	{#if reloadHref}
		<a class="button" href={reloadHref}>🔄 Neu laden</a>
	{/if}
	<button class="button danger" onclick={remove}>🗑️ Lerneinheit löschen</button>
</div>

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

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

	.learned {
		font-size: 1.4rem;
		font-weight: 700;
	}

	.boxes {
		display: flex;
		justify-content: space-between;
		list-style: none;
		padding: 0;
		margin: 0.2rem 0 0;
		font-weight: 600;
		font-variant-numeric: tabular-nums;

		span {
			font-size: 1.3rem;
		}
	}

	.hint {
		font-size: 0.85rem;
	}

	.words {
		list-style: none;
		padding: 0;
		margin: 0;

		li {
			display: grid;
			grid-template-columns: 1fr auto auto;
			align-items: center;
			gap: 0.4rem;
			padding: 0.3rem 0;
			border-top: 1px solid var(--line);
		}

		.foreign {
			font-family: var(--font-inscription);
			font-weight: 400;
			font-size: 1.1rem;
		}

		em {
			color: var(--muted);
			margin-left: 0.25em;
		}
	}

	.box {
		font-size: 1.2rem;
	}
</style>
