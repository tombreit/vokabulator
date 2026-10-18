<!--
  Learning a unit – the round's state machine. The parts live next to this file:

    setup     Setup.svelte          mode, direction, time per word, which words, how many
    question  QuestionCard.svelte   + one of Flashcards / Typing / Choice .svelte
              Feedback.svelte       after an answer in "Tippen" / "Auswahl" ("Weiter")
              ChatLine.svelte       what Vokabulator says about the last answer
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
	import { nav } from '#lib/components/NavBar.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import Sprite from '#lib/components/Sprite.svelte';
	import WordTimer from '#lib/components/WordTimer.svelte';
	import HardButton from '#lib/components/HardButton.svelte';
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
		speedBonus,
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
	import ChatLine from './ChatLine.svelte';
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
	 * @property {number} gained   points, including the speed bonus
	 * @property {number} bonus    ⏱️ speed bonus in it
	 * @property {number} speedShare  of the time for this word left when answering (0 without time)
	 * @property {boolean} timeUp  the time for this word ran out
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
	/** @type {import('./ChatLine.svelte').Line | undefined} what Vokabulator said last */
	let chatLine = $state();
	let chatId = 0;
	/** 💡 joker used on the current card */
	let tipUsed = $state(false);
	let score = $state(newScore());
	/** ⏱️ milliseconds left for the current word (with a time per word) */
	let clockLeft = $state(0);
	let startedAt = 0;
	/** all XP earned before this round – the bar shows this plus the round's XP */
	let xpBefore = $state(0);
	/** @type {import('./Result.svelte').Summary | undefined} */
	let summary = $state();

	const card = $derived(cards[index]);
	const withJokers = $derived(options.mode !== 'cards');
	/** the time runs while the question is open – for flash cards until the solution is shown */
	const clockRunning = $derived(options.clock > 0 && phase === 'question' && !current && !revealed);
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

	// Flash cards: after rating, the card shows its new stage for a moment, then the next one comes.
	// When the time ran out, the learner sees the solution only now – so it stays a bit longer.
	$effect(() => {
		if (!current || options.mode !== 'cards') return;
		const timer = setTimeout(next, current.timeUp ? 2500 : 1000);
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
		chatLine = undefined;
		score = newScore();
		clockLeft = clock * 1000;
		startedAt = Date.now();
		xpBefore = loadStats().xp;
		summary = undefined;
		phase = 'question';
	}

	/**
	 * @param {Outcome} outcome
	 * @param {string} [given]  what was typed or picked
	 * @param {'reveal' | 'timeUp'} [cause]  why it counts as not known without an answer:
	 *   the "Aufdecken" joker, or the time for the word ran out
	 */
	function answer(outcome, given = '', cause) {
		const { entry } = card;
		const before = progressOf(progress, entry.id);
		progress[entry.id] = recordAnswer(before, outcome !== 'wrong');
		saveProgress(unit.id, progress);

		// a short buzz for right, a double one for wrong (Android; Firefox and iPhone have no vibrate)
		navigator.vibrate?.(outcome === 'wrong' ? [60, 50, 60] : 25);

		// ⏱️ the faster, the more bonus (only with a time per word)
		const speedShare = options.clock && !cause ? clockLeft / (options.clock * 1000) : 0;
		const bonus = outcome === 'wrong' ? 0 : speedBonus(speedShare);

		const scoreBefore = score;
		const result = scoreAnswer(score, outcome, { tip: tipUsed, bonus });
		score = result.score;

		play(outcome === 'wrong' ? 'wrong' : 'xp');
		const levelNow = levelFor(xpBefore + score.points).level;
		if (levelNow > levelFor(xpBefore + scoreBefore.points).level) {
			play('levelUp');
			showToast({ sprite: 'xp', title: 'Level-Up!', text: `Du bist jetzt Level ${levelNow}.` });
		}

		const said = cause
			? phrase(cause === 'reveal' ? 'revealed' : 'timeUp')
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
			bonus,
			speedShare,
			timeUp: cause === 'timeUp',
			before,
			scoreBefore
		};
		answers.push(answered);
		current = answered;
		chatLine = { id: ++chatId, outcome, text: said, gained: result.gained };
	}

	/** "Ich lag doch richtig": count the last answer as right after all. */
	function override() {
		const last = answers.at(-1);
		if (!last) return;
		progress[last.entry.id] = recordAnswer(last.before, true);
		saveProgress(unit.id, progress);
		const bonus = speedBonus(last.speedShare);
		const result = scoreAnswer(last.scoreBefore, 'right', { tip: last.tip, bonus });
		score = result.score;
		Object.assign(last, {
			outcome: 'right',
			gained: result.gained,
			bonus,
			phrase: phrase('right')
		});
		current = last;
		chatLine = { id: ++chatId, outcome: 'right', text: last.phrase, gained: last.gained };
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
		answer('wrong', '', 'reveal');
	}

	/** ⏱️ the time for this word ran out: it counts as not known, the solution shows */
	function timeUp() {
		revealed = true;
		answer('wrong', '', 'timeUp');
	}

	function next() {
		current = undefined;
		revealed = false;
		tipUsed = false;
		clockLeft = options.clock * 1000;
		if (index + 1 < cards.length) index++;
		else finish();
	}

	function finish() {
		const timeouts = answers.filter((a) => a.timeUp).length;

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
				timed: options.clock > 0,
				timeouts,
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
			speedBonus: answers.reduce((sum, a) => sum + a.bonus, 0),
			timeouts,
			bestStreak: score.bestStreak,
			durationMs: Date.now() - startedAt,
			previousBest,
			days: stats.days.days
		};
		phase = 'result';
	}

	/** @param {string} entryId */
	function toggleHardWord(entryId) {
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
	<!-- two slim lines above the card: leave, how far, mark as hard – then XP and series -->
	<div class="round-bar">
		<button class="leave" onclick={() => (phase = 'setup')} aria-label="Runde abbrechen">✕</button>
		<ProgressBar value={index / cards.length} label="Fortschritt der Runde" />
		<span class="count">{index + 1}/{cards.length}</span>
		<HardButton
			hard={progressOf(progress, card.entry.id).hard}
			ontoggle={() => toggleHardWord(card.entry.id)}
		/>
	</div>
	<div class="round-stats">
		<span class="round-xp"><Sprite name="xp" size={16} /> +{score.points} XP</span>
		{#if multiplier(score.streak) > 1}
			<span class="combo" title="Serie: {multiplier(score.streak)}-fache XP"
				>×{multiplier(score.streak)}</span
			>
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
		>
			{#if options.clock}
				<WordTimer
					bind:left={clockLeft}
					total={options.clock * 1000}
					running={clockRunning}
					ontimeout={timeUp}
				/>
			{/if}
		</QuestionCard>

		{#if options.mode === 'cards'}
			<!-- after rating, flash cards go on by themselves (see the $effect above) -->
			<Flashcards
				{revealed}
				chosen={current?.outcome}
				onreveal={() => (revealed = true)}
				onanswer={answer}
			/>
		{:else if current}
			<Feedback
				outcome={current.outcome}
				given={current.given}
				onnext={next}
				onoverride={options.mode === 'typing' ? override : undefined}
			/>
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

	<!-- outside the {#key}: the line stays while the next card comes -->
	<ChatLine line={chatLine} />
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
		ontogglehard={toggleHardWord}
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
