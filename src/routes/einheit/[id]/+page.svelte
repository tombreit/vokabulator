<!--
  One learning unit (a "Lektion"): how many words are on which stage (1 = new … 5 = learned
  for sure, see STAGES in #lib/learn/leitner.js), then all words by section, and the way into learning.
-->
<script>
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import Sprite from '#lib/components/Sprite.svelte';
	import HardButton from '#lib/components/HardButton.svelte';
	import { STAGES, learnedShare, progressOf, stageOf, toggleHard } from '#lib/learn/leitner.js';
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
	/** how many words are on stage 1, 2, … 5 */
	const perStage = $derived(
		STAGES.map(
			(_, i) => unit.entries.filter((e) => progressOf(progress, e.id).box === i + 1).length
		)
	);

	/** @param {string} entryId */
	function toggleHardWord(entryId) {
		progress[entryId] = toggleHard(progressOf(progress, entryId));
		saveProgress(unit.id, progress);
	}

	/** For units from a Mediencode: load the vocabulary again (progress stays, entry ids are stable). */
	const reloadHref =
		unit.source.type === 'ccbuchner'
			? `${resolve('/neu')}?${new URLSearchParams({ code: unit.source.code, neu: '1' })}`
			: undefined;

	function remove() {
		if (!confirm(`Lektion „${unit.title}“ mit allem Lernfortschritt löschen?`)) return;
		deleteUnit(unit.id);
		goto(resolve('/'));
	}
</script>

<a class="back" href={resolve('/')}>‹ Meine Lektionen</a>
<h1>{unit.title}</h1>

<div class="card summary">
	<p class="learned">{Math.round(learned * 100)} % gelernt</p>
	<p class="muted">
		{LANGS[unit.lang].name}, {unit.entries.length} Vokabeln{hardCount
			? `, ${hardCount} als schwer markiert`
			: ''}
	</p>
	<ProgressBar value={learned} label="Anteil gelernter Wörter" />

	<!-- one inventory slot per stage, the number is how many words are on it -->
	<ol class="stages" aria-label="Vokabeln je Stufe">
		{#each STAGES as stage, i (stage.sprite)}
			<li class="slot" title="{stage.name} ({stage.item}): {perStage[i]} Vokabeln">
				<Sprite name={stage.sprite} size={32} label="{stage.name} ({stage.item})" />
				<span class="count">{perStage[i]}</span>
			</li>
		{/each}
	</ol>
	<p class="muted hint read">
		Jede gewusste Vokabel steigt eine Stufe auf – vom Stein bis zum Diamanten, dann sitzt sie
		sicher. Falsch? Zurück auf Stufe 1. Schwere Vokabeln markierst du mit dem Amboss, sie kommen
		öfter dran.
	</p>
	<a class="button primary learn" href={resolve('/lernen/[id]', { id: unit.id })}>
		<Sprite name="pickaxe" size={32} /> Lernen
	</a>
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
						<Sprite
							name={stageOf(p.box).sprite}
							size={24}
							label="{stageOf(p.box).name} ({stageOf(p.box).item})"
						/>
						<div>
							<strong class="foreign">{entry.front}</strong>
							{#if entry.frontInfo}<span class="info read">{entry.frontInfo}</span>{/if}
							<span class="meaning read">{entry.back}</span>
						</div>
						<HardButton hard={p.hard} ontoggle={() => toggleHardWord(entryId)} />
					</li>
				{/if}
			{/each}
		</ul>
	</section>
{/each}

<div class="actions">
	<ShareButton
		label="Teilen"
		title={unit.title}
		text={`Lern mit mir „${unit.title}“ im Vokabulator ⛏️`}
		url={() => sharePath(unit)}
	/>
	{#if reloadHref}
		<a class="button" href={reloadHref}>Neu laden</a>
	{/if}
	<button class="button danger" onclick={remove}>Lektion löschen</button>
</div>

<style>
	.summary {
		display: grid;
		gap: 0.6rem;
		margin-bottom: var(--gap);

		p {
			margin: 0;
		}
	}

	.learned {
		font-size: 1.5rem;
		font-weight: 700;
	}

	/* inventory slots: sunken grey squares, stack size bottom right in white –
	   they shrink with the screen, so all five always fit */
	.stages {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 56px));
		gap: 4px;
		list-style: none;
		padding: 0;
		margin: 0.25rem 0 0;
	}

	.slot {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		background: #8b8b8b;
		box-shadow:
			inset 2px 2px 0 #373737,
			inset -2px -2px 0 #ffffff;
	}

	.slot :global(.sprite) {
		width: 70%;
		height: 70%;
	}

	.count {
		position: absolute;
		right: 2px;
		bottom: 0;
		color: #fff;
		font-size: 0.8rem;
		font-weight: 700;
		text-shadow: 2px 2px 0 #3f3f3f;
	}

	.hint {
		font-size: 0.85rem;
	}

	.learn {
		min-height: 3.5rem;
		font-size: 1.2rem;
	}

	section {
		margin-bottom: var(--gap);
	}

	.words {
		list-style: none;
		padding: 0;
		margin: 0;

		li {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			align-items: center;
			gap: 0.6rem;
			padding: 0.4rem 0;
			border-top: 2px solid var(--line);
		}

		.foreign {
			font-size: 1.1rem;
			overflow-wrap: anywhere;
		}

		.meaning {
			display: block;
		}
	}

	/* grammar ("m", "Adv.") – quiet, like on the question card */
	.info {
		margin-left: 0.35em;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
</style>
