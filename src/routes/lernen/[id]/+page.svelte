<!--
  Learning a unit – the round's state machine. The parts live next to this file:

    setup     Setup.svelte          mode, direction, clock, which words, how many
    question  QuestionCard.svelte   + one of Flashcards / Typing / Choice .svelte
              Feedback.svelte       after an answer in "Tippen" / "Auswahl"
    result    Result.svelte         points, record, mistakes, share the result as a challenge

  /lernen/<id>?challenge=57&mode=…  a friend's challenge (see #lib/share.js): same rules, beat the points

  The rules of the game are in #lib/learn: check-answer.js (is it right?), scoring.js
  (points, combo, jokers), feedback.js (what we say), streak.js (days in a row).
  Progress (Leitner boxes) is saved after every single answer (storage.saveProgress).
-->
<script>
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChessClock from '#lib/components/ChessClock.svelte';
	import { nav } from '#lib/components/NavBar.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import Sprite from '#lib/components/Sprite.svelte';
	import StarButton from '#lib/components/StarButton.svelte';
	import { firstLetterTip } from '#lib/learn/check-answer.js';
	import { newAdvancements } from '#lib/learn/advancements.js';
	import { choicesFor } from '#lib/learn/choices.js';
	import { phrase } from '#lib/learn/feedback.js';
	import { pickRound, progressOf, recordAnswer, toggleHard } from '#lib/learn/leitner.js';
	import { levelFor } from '#lib/learn/level.js';
	import {
		JOKERS_PER_ROUND,
		multiplier,
		newScore,
		scoreAnswer,
		timeBonus,
		useJoker
	} from '#lib/learn/scoring.js';
	import { localDay, recordDay } from '#lib/learn/streak.js';
	import { readChallenge, sharePath } from '#lib/share.js';
	import {
		loadProgress,
		loadSettings,
		loadStats,
		saveProgress,
		saveSettings,
		saveStats
	} from '#lib/storage.js';
	import { play } from '#lib/sound.js';
	import { showToast } from '#lib/toasts.svelte.js';
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

	let progress = $state(loadProgress(unit.id));
	const settings = loadSettings();

	// --- setup ---------------------------------------------------------------
	/** @type {import('./Setup.svelte').Options} */
	/** a friend's challenge from the link – it also sets the rules, so it is fair */
	const challenge = readChallenge(page.url.searchParams);

	let options = $state({
		mode: challenge?.mode ?? settings.mode,
		direction: challenge?.direction ?? settings.direction,
		roundSize: challenge?.roundSize ?? settings.roundSize,
		clock: challenge?.clock ?? settings.clock,
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
	/** all XP earned before this round – the bar shows this plus the round's XP */
	let xpBefore = $state(0);
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

	// Nothing but the word during a round: the navigation goes away.
	$effect(() => {
		nav.hidden = phase === 'question';
		return () => (nav.hidden = false);
	});

	// Flash cards: after rating, the card shows its ore change for a moment, then the next one comes.
	$effect(() => {
		if (!current || options.mode !== 'cards') return;
		const timer = setTimeout(next, 1000);
		return () => clearTimeout(timer);
	});

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
		xpBefore = loadStats().xp;
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

		// a short buzz for right, a double one for wrong (Android; Firefox and iPhone have no vibrate)
		navigator.vibrate?.(outcome === 'wrong' ? [60, 50, 60] : 25);

		const scoreBefore = score;
		const result = scoreAnswer(score, outcome, { tip: tipUsed });
		score = result.score;

		play(outcome === 'wrong' ? 'wrong' : 'xp');
		const levelNow = levelFor(xpBefore + score.points).level;
		if (levelNow > levelFor(xpBefore + scoreBefore.points).level) {
			play('levelUp');
			showToast({ sprite: 'xp', title: 'Level-Up!', text: `Du bist jetzt Level ${levelNow}.` });
		}

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
		current = answered;
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

	/** 🔥 torch: first letter (typing) or 50:50 (multiple choice) – costs a joker and 3 XP */
	function useTip() {
		if (score.jokers === 0 || tipUsed) return;
		score = useJoker(score);
		tipUsed = true;
	}

	/** 🔭 spyglass: show the solution – costs a joker, the word counts as not known */
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
		stats.xp += score.points;

		// Erfolge (advancements): what did this round unlock?
		const known = answers.filter((a) => a.outcome !== 'wrong').length;
		const unlocked = newAdvancements(
			{
				known,
				planned: cards.length,
				bestStreak: score.bestStreak,
				usedJokers: score.jokers < JOKERS_PER_ROUND,
				timeUp,
				clockShareLeft: options.clock ? clockLeft / (options.clock * 1000) : 0,
				beatRecord: previousBest > 0 && score.points > previousBest,
				boxes: unit.entries.map((e) => progressOf(progress, e.id).box),
				xpTotal: stats.xp,
				days: stats.days.days
			},
			stats.advancements
		);
		for (const advancement of unlocked) {
			stats.advancements[advancement.id] = localDay();
			showToast({
				sprite: advancement.sprite,
				title: 'Erfolg freigeschaltet!',
				text: advancement.title
			});
		}
		saveStats(stats);

		summary = {
			advancements: unlocked,
			planned: cards.length,
			points: score.points,
			xpBefore,
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
	<a class="back" href={resolve('/einheit/[id]', { id: unit.id })}>‹ Zur Lektion</a>
	<h1>{unit.title}</h1>
	{#if challenge}
		<p class="card challenge">
			🏆 <strong>Challenge:</strong> Schlag {challenge.points} XP! Die Regeln deines Freundes sind schon
			eingestellt.
		</p>
	{/if}
	<Setup
		bind:options
		{unit}
		available={pool.length}
		onstart={() => start(pool, options.roundSize)}
	/>
{:else if phase === 'question' && card}
	<!-- two slim lines above the card: leave, how far, mark as hard – then XP, combo, clock -->
	<div class="round-bar">
		<button class="leave" onclick={() => (phase = 'setup')} aria-label="Runde abbrechen">✕</button>
		<ProgressBar value={index / cards.length} label="Fortschritt der Runde" />
		<span class="count">{index + 1}/{cards.length}</span>
		<StarButton
			hard={progressOf(progress, card.entry.id).hard}
			ontoggle={() => toggleStar(card.entry.id)}
		/>
	</div>
	<div class="round-stats">
		<span class="round-xp"><Sprite name="xp" size={16} /> +{score.points} XP</span>
		{#if multiplier(score.streak) > 1}
			<span class="combo" title="Serie: {multiplier(score.streak)}-fache XP"
				>×{multiplier(score.streak)}</span
			>
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

	<!-- a fresh set of components for every card (empty input, no old choice) -->
	{#key index}
		<QuestionCard
			entry={card.entry}
			reverse={card.reverse}
			lang={unit.lang}
			showAnswer={revealed || current !== undefined}
			box={current ? current.before.box : progressOf(progress, card.entry.id).box}
			newBox={current ? progressOf(progress, card.entry.id).box : undefined}
			enchanted={multiplier(score.streak) > 1}
		/>

		{#if current}
			<!-- flash cards go on by themselves (see the $effect above), the others wait for "Weiter" -->
			<Feedback
				outcome={current.outcome}
				phrase={current.phrase}
				gained={current.gained}
				given={current.given}
				onnext={options.mode === 'cards' ? undefined : next}
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
			<!-- the hotbar: jokers as items -->
			<div class="hotbar">
				<button
					class="slot"
					onclick={useTip}
					disabled={score.jokers === 0 || tipUsed}
					aria-label="Joker: {options.mode === 'choice'
						? '50:50'
						: 'erster Buchstabe'}, kostet 3 XP"
				>
					<Sprite name="torch" size={32} />
					<span>{options.mode === 'choice' ? '50:50' : 'Tipp'}</span>
				</button>
				<button
					class="slot"
					onclick={useReveal}
					disabled={score.jokers === 0}
					aria-label="Joker: Lösung aufdecken"
				>
					<Sprite name="spyglass" size={32} />
					<span>Aufdecken</span>
				</button>
				<span class="jokers-left">Noch {score.jokers} Joker</span>
			</div>
		{/if}
	{/key}
{:else if phase === 'result' && summary}
	<Result
		unitId={unit.id}
		{summary}
		challenge={challenge?.points}
		share={{
			title: unit.title,
			text: `Ich hab ${summary.points} XP bei „${unit.title}“ geholt ⛏️ Schaffst du mehr?`,
			url: () =>
				sharePath(unit, {
					points: summary?.points ?? 0,
					mode: options.mode,
					roundSize: options.roundSize,
					direction: options.direction,
					clock: options.clock
				})
		}}
		{answers}
		boxOf={(id) => progressOf(progress, id).box}
		isHard={(id) => progressOf(progress, id).hard}
		ontogglestar={toggleStar}
		onrepeat={(entries) => start(entries, 0)}
		onnewround={() => (phase = 'setup')}
	/>
{/if}

<style>
	.challenge {
		border-color: var(--star);
		border-width: 2px;
		margin-bottom: var(--gap);
	}

	.round-bar {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: 0.5rem;
		margin-top: -0.5rem;
	}

	.leave {
		min-width: var(--tap);
		min-height: var(--tap);
		margin-left: -0.75rem;
		border: none;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 1.1rem;
		cursor: pointer;
	}

	.count {
		color: var(--muted);
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}

	.round-stats {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2rem;
		margin-bottom: 0.6rem;
		font-size: 0.9rem;
		font-weight: 700;

		:global(.clock) {
			margin-left: auto;
		}
	}

	.round-xp {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--xp);
	}

	.combo {
		color: #d7a6ff;
	}

	/* the hotbar: dark slots like at the bottom of the game screen */
	.hotbar {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: var(--gap);
	}

	.slot {
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 0.3rem 0.6rem;
		border: 2px solid #000;
		background: rgb(0 0 0 / 0.55);
		box-shadow: inset 0 0 0 2px #8b8b8b;
		color: #fff;
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;

		&:hover:not(:disabled) {
			box-shadow: inset 0 0 0 2px #fff;
		}
		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
		}
	}

	.jokers-left {
		margin-left: auto;
		color: var(--muted);
		font-size: 0.8rem;
		white-space: nowrap;
	}
</style>
