<!--
  Learning a unit – the round's state machine. The parts live next to this file:

    setup     Setup.svelte          mode, direction, clock, which words, how many
    question  QuestionCard.svelte   + one of Flashcards / Typing / Choice .svelte
              Feedback.svelte       after an answer in "Tippen" / "Auswahl"
    result    Result.svelte         points, record, mistakes

  The rules of the game are in #lib/learn: check-answer.js (is it right?), scoring.js
  (points, combo, jokers), feedback.js (what we say), streak.js (days in a row).
  Progress (Leitner boxes) is saved after every single answer (storage.saveProgress).
-->
<script>
	import { untrack } from 'svelte';
	import ChessClock from '#lib/components/ChessClock.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import StarButton from '#lib/components/StarButton.svelte';
	import { firstLetterTip } from '#lib/learn/check-answer.js';
	import { choicesFor } from '#lib/learn/choices.js';
	import { phrase } from '#lib/learn/feedback.js';
	import { pickRound, progressOf, recordAnswer, toggleHard } from '#lib/learn/leitner.js';
	import { multiplier, newScore, scoreAnswer, timeBonus, useJoker } from '#lib/learn/scoring.js';
	import { localDay, recordDay } from '#lib/learn/streak.js';
	import { LANGS } from '#lib/model.js';
	import {
		loadProgress,
		loadSettings,
		loadStats,
		saveProgress,
		saveSettings,
		saveStats
	} from '#lib/storage.js';
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
	 * An answer of the round. `before` and `scoreBefore` allow undoing it ("Ich lag doch richtig").
	 * @typedef {object} Answer
	 * @property {Entry} entry
	 * @property {Outcome} outcome
	 * @property {string} given    what was typed or picked
	 * @property {boolean} tip     the 💡 joker was used
	 * @property {string} phrase   what we said about it
	 * @property {number} gained   points
	 * @property {import('#lib/learn/leitner.js').EntryProgress} before
	 * @property {import('#lib/learn/scoring.js').Score} scoreBefore
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
		clock: settings.clock,
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
	let phase = $state(/** @type {'setup' | 'question' | 'result'} */ ('setup'));
	/** @type {Card[]} */
	let cards = $state([]);
	let index = $state(0);
	/** @type {Answer[]} */
	let answers = $state([]);
	/** the answer to the current card, while its feedback is shown */
	/** @type {Answer | undefined} */
	let current = $state();
	/** flash cards: solution visible */
	let revealed = $state(false);
	/** 💡 joker used on the current card */
	let tipUsed = $state(false);
	let score = $state(newScore());
	/** ⏱️ milliseconds left on the chess clock */
	let clockLeft = $state(0);
	let startedAt = 0;
	/** flash cards: a short message after rating (the other modes show Feedback.svelte) */
	/** @type {{ phrase: string, gained: number } | undefined} */
	let toast = $state();
	/** @type {import('./Result.svelte').Summary | undefined} */
	let summary = $state();

	const card = $derived(cards[index]);
	const withJokers = $derived(options.mode !== 'cards');
	const clockRunning = $derived(options.clock > 0 && phase === 'question' && !current);
	/** 50:50 joker: only the right answer and one wrong one are left */
	const visibleChoices = $derived(
		tipUsed && card
			? card.choices.filter((c) => c.right || c === card.choices.find((x) => !x.right))
			: (card?.choices ?? [])
	);

	// No dimming display while thinking about an answer.
	$effect(() => (phase === 'question' ? keepScreenOn() : undefined));

	/**
	 * @param {Entry[]} entries  words to choose from
	 * @param {number} size      number of words, 0 = all
	 */
	function start(entries, size) {
		const { mode, direction, roundSize, clock } = options;
		saveSettings({ ...loadSettings(), mode, direction, roundSize, clock });

		cards = pickRound(entries, progress, size).map((entry) => {
			const reverse = direction === 'back-front' || (direction === 'mixed' && Math.random() < 0.5);
			const choices = mode === 'choice' ? choicesFor(entry, unit.entries, reverse) : [];
			return { entry, reverse, choices };
		});
		index = 0;
		answers = [];
		current = undefined;
		revealed = false;
		tipUsed = false;
		score = newScore();
		clockLeft = clock * 1000;
		startedAt = Date.now();
		toast = undefined;
		summary = undefined;
		phase = 'question';
	}

	/**
	 * @param {Outcome} outcome
	 * @param {string} [given]          what was typed or picked
	 * @param {boolean} [byRevealJoker]  the learner used 👀 "Aufdecken"
	 */
	function answer(outcome, given = '', byRevealJoker = false) {
		const { entry } = card;
		const before = progressOf(progress, entry.id);
		progress[entry.id] = recordAnswer(before, outcome !== 'wrong');
		saveProgress(unit.id, progress);

		const scoreBefore = score;
		const result = scoreAnswer(score, outcome, { tip: tipUsed });
		score = result.score;

		const said = byRevealJoker
			? phrase('revealed')
			: outcome === 'wrong'
				? phrase('wrong')
				: result.comboUp
					? phrase('combo', { n: multiplier(score.streak) })
					: phrase(outcome);

		/** @type {Answer} */
		const answered = {
			entry,
			outcome,
			given,
			tip: tipUsed,
			phrase: said,
			gained: result.gained,
			before,
			scoreBefore
		};
		answers.push(answered);

		if (options.mode === 'cards') {
			toast = { phrase: said, gained: result.gained };
			next();
		} else {
			current = answered;
		}
	}

	/** "Ich lag doch richtig": count the last answer as right after all. */
	function override() {
		const last = answers.at(-1);
		if (!last) return;
		progress[last.entry.id] = recordAnswer(last.before, true);
		saveProgress(unit.id, progress);
		const result = scoreAnswer(last.scoreBefore, 'right', { tip: last.tip });
		score = result.score;
		Object.assign(last, { outcome: 'right', gained: result.gained, phrase: phrase('right') });
		current = last;
	}

	/** 💡 first letter (typing) or 50:50 (multiple choice) – costs a joker and 3 points */
	function useTip() {
		if (score.jokers === 0 || tipUsed) return;
		score = useJoker(score);
		tipUsed = true;
	}

	/** 👀 show the solution – costs a joker, the word counts as not known */
	function useReveal() {
		if (score.jokers === 0) return;
		score = useJoker(score);
		answer('wrong', '', true);
	}

	function next() {
		current = undefined;
		revealed = false;
		tipUsed = false;
		if (index + 1 < cards.length) index++;
		else finish(false);
	}

	/** @param {boolean} timeUp  the chess clock ran out */
	function finish(timeUp) {
		const bonus = timeUp || !options.clock ? 0 : timeBonus(clockLeft);
		score = { ...score, points: score.points + bonus };

		const stats = loadStats();
		const previousBest = stats.highscores[unit.id] ?? 0;
		stats.highscores[unit.id] = Math.max(previousBest, score.points);
		stats.days = recordDay(stats.days, localDay());
		saveStats(stats);

		summary = {
			planned: cards.length,
			points: score.points,
			timeBonus: bonus,
			bestStreak: score.bestStreak,
			durationMs: Date.now() - startedAt,
			timeUp,
			previousBest,
			days: stats.days.days
		};
		phase = 'result';
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

	<div class="status">
		<span class="points" aria-label="Punkte">🏅 {score.points}</span>
		{#if multiplier(score.streak) > 1}
			<span class="combo">🔥 ×{multiplier(score.streak)}</span>
		{/if}
		{#if options.clock}
			<ChessClock
				bind:left={clockLeft}
				total={options.clock * 1000}
				running={clockRunning}
				ontimeout={() => finish(true)}
			/>
		{/if}
	</div>

	{#if toast}
		{#key answers.length}
			<p class="toast" role="status">
				{toast.phrase}
				{#if toast.gained}<strong>+{toast.gained}</strong>{/if}
			</p>
		{/key}
	{/if}

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
				phrase={current.phrase}
				gained={current.gained}
				given={current.given}
				onnext={next}
				onoverride={options.mode === 'typing' ? override : undefined}
			/>
		{:else if options.mode === 'cards'}
			<Flashcards {revealed} onreveal={() => (revealed = true)} onanswer={answer} />
		{:else if options.mode === 'typing'}
			<Typing
				entry={card.entry}
				reverse={card.reverse}
				lang={unit.lang}
				tip={tipUsed ? firstLetterTip(card.entry, card.reverse, unit.lang) : ''}
				onanswer={answer}
			/>
		{:else}
			<Choice choices={visibleChoices} onanswer={answer} />
		{/if}

		{#if withJokers && !current}
			<div class="jokers">
				<span class="muted" aria-label="Joker übrig">Joker: {'💡'.repeat(score.jokers) || '–'}</span
				>
				<button class="button" onclick={useTip} disabled={score.jokers === 0 || tipUsed}>
					💡 {options.mode === 'choice' ? '50:50' : 'Erster Buchstabe'} <small>(−3)</small>
				</button>
				<button class="button" onclick={useReveal} disabled={score.jokers === 0}
					>👀 Aufdecken</button
				>
			</div>
		{/if}
	{/key}
{:else if phase === 'result' && summary}
	<Result
		unitId={unit.id}
		{summary}
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
		margin-bottom: 0.5rem;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: var(--gap);
		font-weight: 700;

		:global(.clock) {
			margin-left: auto;
		}
	}

	.combo {
		color: var(--bad);
	}

	.toast {
		margin: 0 0 0.6rem;
		text-align: center;
		font-weight: 700;
		animation: fade 1.6s ease-out forwards;

		strong {
			color: var(--good);
		}
	}

	@keyframes fade {
		0%,
		60% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	.jokers {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: var(--gap);

		span {
			flex-basis: 100%;
			font-size: 0.9rem;
		}

		button {
			flex: 1;
			min-height: 2.75rem;
			font-weight: 600;
		}
	}
</style>
