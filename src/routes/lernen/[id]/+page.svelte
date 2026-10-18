<!--
  Learning a unit. One page, three phases:
    setup    → choose direction, sections and number of words
    question → one card after another: reveal it, then rate yourself
    result   → how it went, repeat the mistakes
  Progress is saved after every single answer (storage.saveProgress).
-->
<script>
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import StarButton from '#lib/components/StarButton.svelte';
	import { pickRound, progressOf, recordAnswer, toggleHard } from '#lib/learn/leitner.js';
	import { LANGS } from '#lib/model.js';
	import { loadProgress, loadSettings, saveProgress, saveSettings } from '#lib/storage.js';

	/** @typedef {import('#lib/model.js').Entry} Entry */
	/** A question. `reverse` = ask the German side, answer the foreign one.
	 * @typedef {{ entry: Entry, reverse: boolean }} Card */

	/** @type {import('./$types').PageProps} */
	let { data } = $props();
	// The page works with the unit as it was when the page opened (it cannot change meanwhile).
	const unit = untrack(() => data.unit);
	const lang = LANGS[unit.lang];

	// --- learner's state, loaded once -----------------------------------------
	let progress = $state(loadProgress(unit.id));
	const settings = loadSettings();

	// --- setup phase ----------------------------------------------------------
	let direction = $state(settings.direction);
	let roundSize = $state(settings.roundSize);
	/** indices of the chosen sections */
	let chosenSections = $state(unit.sections.map((_, i) => i));
	let onlyHard = $state(false);

	/** all words of the chosen sections, each once */
	const pool = $derived.by(() => {
		const ids = new Set(chosenSections.flatMap((i) => unit.sections[i].entryIds));
		return unit.entries.filter(
			(e) => ids.has(e.id) && (!onlyHard || progressOf(progress, e.id).hard)
		);
	});

	// --- question phase -------------------------------------------------------
	/** @type {'setup' | 'question' | 'result'} */
	let phase = $state('setup');
	/** @type {Card[]} */
	let cards = $state([]);
	let index = $state(0);
	let revealed = $state(false);
	/** @type {{ card: Card, known: boolean }[]} */
	let answers = $state([]);

	const card = $derived(cards[index]);

	/**
	 * @param {Entry[]} entries  words to choose from
	 * @param {number} size      number of words, 0 = all
	 */
	function start(entries, size) {
		saveSettings({ ...loadSettings(), direction, roundSize });
		cards = pickRound(entries, progress, size).map((entry) => ({
			entry,
			reverse: direction === 'back-front' || (direction === 'mixed' && Math.random() < 0.5)
		}));
		index = 0;
		revealed = false;
		answers = [];
		phase = 'question';
	}

	/** @param {boolean} known */
	function rate(known) {
		const id = card.entry.id;
		progress[id] = recordAnswer(progressOf(progress, id), known);
		saveProgress(unit.id, progress);
		answers.push({ card, known });
		revealed = false;
		if (index + 1 < cards.length) index++;
		else phase = 'result';
	}

	/** @param {string} entryId */
	function toggleStar(entryId) {
		progress[entryId] = toggleHard(progressOf(progress, entryId));
		saveProgress(unit.id, progress);
	}

	// --- result phase ---------------------------------------------------------
	const knownCount = $derived(answers.filter((a) => a.known).length);
	const mistakes = $derived(answers.filter((a) => !a.known).map((a) => a.card.entry));
	const verdict = $derived(rateRound(answers.length ? knownCount / answers.length : 0));

	/** @param {number} share  0..1 */
	function rateRound(share) {
		if (share === 1) return { emoji: '🏆', text: 'Perfekt!' };
		if (share >= 0.8) return { emoji: '🔥', text: 'Stark!' };
		if (share >= 0.5) return { emoji: '👍', text: 'Läuft!' };
		return { emoji: '💪', text: 'Dranbleiben!' };
	}
</script>

{#snippet foreign(/** @type {Entry} */ entry)}
	<p class="word">{entry.front}</p>
	{#if entry.frontInfo}<p class="info">{entry.frontInfo}</p>{/if}
{/snippet}

{#snippet german(/** @type {Entry} */ entry)}
	<p class="word">{entry.back}</p>
{/snippet}

{#if phase === 'setup'}
	<h1>{lang.flag} {unit.title}</h1>

	<div class="card setup">
		<fieldset class="pills">
			<legend>Richtung</legend>
			<label
				><input type="radio" bind:group={direction} value="front-back" />{lang.name} → Deutsch</label
			>
			<label
				><input type="radio" bind:group={direction} value="back-front" />Deutsch → {lang.name}</label
			>
			<label><input type="radio" bind:group={direction} value="mixed" />Gemischt 🔀</label>
		</fieldset>

		<fieldset class="pills">
			<legend>Wie viele Wörter?</legend>
			{#each [10, 20, 0] as size (size)}
				<label><input type="radio" bind:group={roundSize} value={size} />{size || 'Alle'}</label>
			{/each}
		</fieldset>

		{#if unit.sections.length > 1}
			<fieldset>
				<legend>Abschnitte</legend>
				{#each unit.sections as section, i (i)}
					<label class="check">
						<input type="checkbox" bind:group={chosenSections} value={i} />
						{section.title} <span class="muted">({section.entryIds.length})</span>
					</label>
				{/each}
			</fieldset>
		{/if}

		<label class="check">
			<input type="checkbox" bind:checked={onlyHard} /> Nur ⭐ schwere Wörter
		</label>
	</div>

	<button
		class="button primary big"
		disabled={pool.length === 0}
		onclick={() => start(pool, roundSize)}
	>
		Los geht's 🚀
		<span class="count">({roundSize ? Math.min(roundSize, pool.length) : pool.length} Wörter)</span>
	</button>
{:else if phase === 'question' && card}
	<div class="round-bar">
		<button class="button" onclick={() => (phase = 'setup')} aria-label="Runde abbrechen">✕</button>
		<ProgressBar value={index / cards.length} label="Fortschritt der Runde" />
		<span class="muted">{index + 1}/{cards.length}</span>
	</div>

	<div class="card flashcard">
		<div class="star">
			<StarButton
				hard={progressOf(progress, card.entry.id).hard}
				ontoggle={() => toggleStar(card.entry.id)}
			/>
		</div>

		<p class="side muted">{card.reverse ? 'Deutsch' : lang.name}</p>
		{@render (card.reverse ? german : foreign)(card.entry)}

		{#if revealed}
			<hr />
			<p class="side muted">{card.reverse ? lang.name : 'Deutsch'}</p>
			{@render (card.reverse ? foreign : german)(card.entry)}
		{/if}
	</div>

	<div class="actions">
		{#if !revealed}
			<button class="button primary big" onclick={() => (revealed = true)}>Aufdecken 👀</button>
		{:else}
			<button class="button big bad" onclick={() => rate(false)}>Nicht gewusst ❌</button>
			<button class="button big good" onclick={() => rate(true)}>Gewusst ✅</button>
		{/if}
	</div>
{:else if phase === 'result'}
	<div class="card result">
		<p class="emoji">{verdict.emoji}</p>
		<h1>{verdict.text}</h1>
		<p>{knownCount} von {answers.length} gewusst</p>
		<ProgressBar value={knownCount / answers.length} label="Anteil gewusst" />
	</div>

	{#if mistakes.length > 0}
		<section class="card mistakes">
			<h2>Die üben wir nochmal 💪</h2>
			<ul>
				{#each mistakes as entry (entry.id)}
					<li>
						<span><strong>{entry.front}</strong> → {entry.back}</span>
						<StarButton
							hard={progressOf(progress, entry.id).hard}
							ontoggle={() => toggleStar(entry.id)}
						/>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<div class="actions column">
		{#if mistakes.length > 0}
			<button class="button primary big" onclick={() => start(mistakes, 0)}>
				🔁 Nur Fehler nochmal ({mistakes.length})
			</button>
		{/if}
		<button class="button big" onclick={() => (phase = 'setup')}>Neue Runde</button>
		<a class="button" href={resolve('/einheit/[id]', { id: unit.id })}>Zur Lerneinheit</a>
	</div>
{/if}

<style>
	.setup {
		display: grid;
		gap: var(--gap);
		margin-bottom: var(--gap);
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.4rem;
	}

	legend {
		font-weight: 700;
		margin-bottom: 0.4rem;
	}

	/* Radio buttons shown as tappable pills */
	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;

		label {
			display: block;
			padding: 0.6rem 0.9rem;
			border: 1px solid var(--line);
			border-radius: 999px;
			font-weight: 600;
			cursor: pointer;

			&:has(input:checked) {
				background: var(--accent);
				border-color: var(--accent);
				color: var(--accent-text);
			}
		}

		input {
			position: absolute;
			opacity: 0;
			pointer-events: none;
		}
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 400;
		min-height: 2.5rem;

		input {
			width: 1.3rem;
			height: 1.3rem;
		}
	}

	.big {
		width: 100%;
		min-height: 3.75rem;
		font-size: 1.15rem;
	}

	.count {
		font-weight: 400;
		opacity: 0.85;
	}

	.round-bar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: var(--gap);
	}

	.flashcard {
		position: relative;
		min-height: 14rem;
		display: grid;
		align-content: center;
		text-align: center;
		padding: 2rem 1rem;
		margin-bottom: var(--gap);

		.star {
			position: absolute;
			top: 0.25rem;
			right: 0.25rem;
		}

		hr {
			width: 100%;
			border: none;
			border-top: 1px dashed var(--line);
			margin: 1.25rem 0;
		}
	}

	.side {
		margin: 0 0 0.25rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.word {
		margin: 0;
		font-size: 1.6rem;
		font-weight: 700;
	}

	.info {
		margin: 0.25rem 0 0;
		font-style: italic;
		color: var(--muted);
	}

	.actions {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 0.6rem;

		&.column {
			grid-auto-flow: row;
		}
	}

	.good {
		background: var(--good);
		border-color: var(--good);
		color: white;
	}

	.bad {
		background: var(--bad);
		border-color: var(--bad);
		color: white;
	}

	.result {
		text-align: center;
		margin-bottom: var(--gap);

		.emoji {
			font-size: 4rem;
			margin: 0;
		}
	}

	.mistakes {
		margin-bottom: var(--gap);

		ul {
			list-style: none;
			padding: 0;
			margin: 0;
		}

		li {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 0.5rem;
			border-top: 1px solid var(--line);
		}
	}
</style>
