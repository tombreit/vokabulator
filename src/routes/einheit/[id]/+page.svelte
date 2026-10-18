<!--
  One learning unit ("Welt"): the inventory – how many words are stone, coal, iron,
  gold or diamond – then all words by section, and the way into learning.
-->
<script>
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import Sprite from '#lib/components/Sprite.svelte';
	import StarButton from '#lib/components/StarButton.svelte';
	import { BOX_ORES, learnedShare, oreOf, progressOf, toggleHard } from '#lib/learn/leitner.js';
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
	/** how many words are stone, coal, iron, gold, diamond */
	const perOre = $derived(
		BOX_ORES.map(
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
		if (!confirm(`Welt „${unit.title}“ mit allem Lernfortschritt löschen?`)) return;
		deleteUnit(unit.id);
		goto(resolve('/'));
	}
</script>

<a class="back" href={resolve('/')}>‹ Meine Welten</a>
<h1>{unit.title}</h1>

<div class="card summary">
	<p class="learned">{Math.round(learned * 100)} % gelernt</p>
	<p class="muted">
		{LANGS[unit.lang].name}, {unit.entries.length} Vokabeln{hardCount
			? `, ${hardCount} als schwer markiert`
			: ''}
	</p>
	<ProgressBar value={learned} label="Anteil gelernter Wörter" />

	<!-- the inventory: one slot per ore, the number is the stack size -->
	<ol class="inventory" aria-label="Vokabeln je Erz">
		{#each BOX_ORES as ore, i (ore.sprite)}
			<li class="slot" title="{ore.name}: {perOre[i]}">
				<Sprite name={ore.sprite} size={40} label={ore.name} />
				<span class="count">{perOre[i]}</span>
			</li>
		{/each}
	</ol>
	<p class="muted hint read">
		Jede gewusste Vokabel wird ein Erz besser – von Stein bis Diamant. Falsch? Dann zurück zu Stein.
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
						<Sprite name={oreOf(p.box).sprite} size={32} label={oreOf(p.box).name} />
						<div>
							<strong class="foreign">{entry.front}</strong>
							{#if entry.frontInfo}<span class="tooltip">{entry.frontInfo}</span>{/if}
							<span class="meaning read">{entry.back}</span>
						</div>
						<StarButton hard={p.hard} ontoggle={() => toggleStar(entryId)} />
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
	<button class="button danger" onclick={remove}>Welt löschen</button>
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

	/* inventory slots: sunken grey squares, stack size bottom right in white */
	.inventory {
		display: flex;
		gap: 4px;
		list-style: none;
		padding: 0;
		margin: 0.25rem 0 0;
	}

	.slot {
		position: relative;
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		background: #8b8b8b;
		box-shadow:
			inset 2px 2px 0 #373737,
			inset -2px -2px 0 #ffffff;
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
			grid-template-columns: auto 1fr auto;
			align-items: center;
			gap: 0.6rem;
			padding: 0.4rem 0;
			border-top: 2px solid var(--line);
		}

		.foreign {
			font-size: 1.1rem;
		}

		.meaning {
			display: block;
		}
	}

	/* grammar info in a tooltip box, like item descriptions in the game */
	.tooltip {
		display: inline-block;
		margin-left: 0.35em;
		padding: 0 0.35em;
		border: 2px solid #2a0a5e;
		outline: 1px solid #100010;
		background: #100010;
		color: #fff;
		font-size: 0.85rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
</style>
