<!--
  Learning a unit – the round's state machine. The parts live next to this file:

    setup     Setup.svelte          mode, direction, which words, how many
    question  QuestionCard.svelte   + one of Flashcards / Typing / Choice .svelte
              Feedback.svelte       after an answer in "Tippen" / "Auswahl"
    result    Result.svelte         how it went, repeat the mistakes

  Progress (Leitner boxes) is saved after every single answer (storage.saveProgress).
-->
<script>
	import { untrack } from 'svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import StarButton from '#lib/components/StarButton.svelte';
	import { choicesFor } from '#lib/learn/choices.js';
	import { pickRound, progressOf, recordAnswer, toggleHard } from '#lib/learn/leitner.js';
	import { LANGS } from '#lib/model.js';
	import { loadProgress, loadSettings, saveProgress, saveSettings } from '#lib/storage.js';
	import { keepScreenOn } from '#lib/wake-lock.js';
	import Choice from './Choice.svelte';
	import Feedback from './Feedback.svelte';
	import Flashcards from './Flashcards.svelte';
	import QuestionCard from './QuestionCard.svelte';
	import Result from './Result.svelte';
	import Setup from './Setup.svelte';
	import Typing from './Typing.svelte';

	/** @typedef {import('#lib/model.js').Entry} Entry */
	/** @typedef {import('#lib/learn/check-answer.js').Outcome} Outcome */
	/**
	 * A question of the round. reverse = ask the German side; choices only in mode "Auswahl".
	 * @typedef {{ entry: Entry, reverse: boolean, choices: { text: string, right: boolean }[] }} Card
	 */
	/**
	 * An answer of the round; `before` allows undoing it ("Ich lag doch richtig").
	 * @typedef {{ entry: Entry, outcome: Outcome, given: string, before: import('#lib/learn/leitner.js').EntryProgress }} Answer
	 */

	/** @type {import('./$types').PageProps} */
	let { data } = $props();
	// The page works with the unit as it was when the page opened (it cannot change meanwhile).
	const unit = untrack(() => data.unit);
	const lang = LANGS[unit.lang];

	let progress = $state(loadProgress(unit.id));
	const settings = loadSettings();

	// --- setup ---------------------------------------------------------------
	/** @type {import('./Setup.svelte').Options} */
	let options = $state({
		mode: settings.mode,
		direction: settings.direction,
		roundSize: settings.roundSize,
		sections: unit.sections.map((_, i) => i),
		onlyHard: false
	});

	/** all words of the chosen sections, each once */
	const pool = $derived.by(() => {
		const ids = new Set(options.sections.flatMap((i) => unit.sections[i].entryIds));
		return unit.entries.filter(
			(e) => ids.has(e.id) && (!options.onlyHard || progressOf(progress, e.id).hard)
		);
	});

	// --- round ---------------------------------------------------------------
	/** @type {'setup' | 'question' | 'result'} */
	let phase = $state('setup');
	/** @type {Card[]} */
	let cards = $state([]);
	let index = $state(0);
	/** flash cards: solution visible */
	let revealed = $state(false);
	/** @type {Answer[]} */
	let answers = $state([]);
	/** the answer to the current card, while its feedback is shown */
	/** @type {Answer | undefined} */
	let current = $state();

	const card = $derived(cards[index]);

	// No dimming display while thinking about an answer.
	$effect(() => (phase === 'question' ? keepScreenOn() : undefined));

	/**
	 * @param {Entry[]} entries  words to choose from
	 * @param {number} size      number of words, 0 = all
	 */
	function start(entries, size) {
		const { mode, direction, roundSize } = options;
		saveSettings({ ...loadSettings(), mode, direction, roundSize });

		cards = pickRound(entries, progress, size).map((entry) => {
			const reverse = direction === 'back-front' || (direction === 'mixed' && Math.random() < 0.5);
			const choices = mode === 'choice' ? choicesFor(entry, unit.entries, reverse) : [];
			return { entry, reverse, choices };
		});
		index = 0;
		revealed = false;
		answers = [];
		current = undefined;
		phase = 'question';
	}

	/**
	 * @param {Outcome} outcome
	 * @param {string} [given]  what was typed or picked
	 */
	function answer(outcome, given = '') {
		const { entry } = card;
		const before = progressOf(progress, entry.id);
		progress[entry.id] = recordAnswer(before, outcome !== 'wrong');
		saveProgress(unit.id, progress);

		const result = { entry, outcome, given, before };
		answers.push(result);

		if (options.mode === 'cards') next();
		else current = result;
	}

	/** "Ich lag doch richtig": count the last answer as right after all. */
	function override() {
		const last = answers.at(-1);
		if (!last) return;
		progress[last.entry.id] = recordAnswer(last.before, true);
		saveProgress(unit.id, progress);
		last.outcome = 'right';
		current = last;
	}

	function next() {
		current = undefined;
		revealed = false;
		if (index + 1 < cards.length) index++;
		else phase = 'result';
	}

	/** @param {string} entryId */
	function toggleStar(entryId) {
		progress[entryId] = toggleHard(progressOf(progress, entryId));
		saveProgress(unit.id, progress);
	}
</script>

{#if phase === 'setup'}
	<h1>{lang.flag} {unit.title}</h1>
	<Setup
		bind:options
		{unit}
		available={pool.length}
		onstart={() => start(pool, options.roundSize)}
	/>
{:else if phase === 'question' && card}
	<div class="round-bar">
		<button class="button" onclick={() => (phase = 'setup')} aria-label="Runde abbrechen">✕</button>
		<ProgressBar value={index / cards.length} label="Fortschritt der Runde" />
		<span class="muted">{index + 1}/{cards.length}</span>
		<StarButton
			hard={progressOf(progress, card.entry.id).hard}
			ontoggle={() => toggleStar(card.entry.id)}
		/>
	</div>

	<!-- a fresh set of components for every card (empty input, no old choice) -->
	{#key index}
		<QuestionCard
			entry={card.entry}
			reverse={card.reverse}
			langName={lang.name}
			showAnswer={revealed || current !== undefined}
		/>

		{#if current}
			<Feedback
				outcome={current.outcome}
				given={current.given}
				onnext={next}
				onoverride={options.mode === 'typing' ? override : undefined}
			/>
		{:else if options.mode === 'cards'}
			<Flashcards {revealed} onreveal={() => (revealed = true)} onanswer={answer} />
		{:else if options.mode === 'typing'}
			<Typing entry={card.entry} reverse={card.reverse} lang={unit.lang} onanswer={answer} />
		{:else}
			<Choice choices={card.choices} onanswer={answer} />
		{/if}
	{/key}
{:else if phase === 'result'}
	<Result
		unitId={unit.id}
		{answers}
		isHard={(id) => progressOf(progress, id).hard}
		ontogglestar={toggleStar}
		onrepeat={(entries) => start(entries, 0)}
		onnewround={() => (phase = 'setup')}
	/>
{/if}

<style>
	.round-bar {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: var(--gap);
	}
</style>
