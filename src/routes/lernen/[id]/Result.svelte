<!--
  After a round: XP and level, which words moved up a stage, the mistakes
  (mark them as hard), and what to do next.
-->
<script module>
	/**
	 * Numbers of a finished round, worked out by the page.
	 * @typedef {object} Summary
	 * @property {number} planned      cards in the round (when time runs out, not all were answered)
	 * @property {number} points       XP of this round, including the time bonus
	 * @property {number} xpBefore     all XP earned before this round (for the level)
	 * @property {number} timeBonus    ⏱️ XP for time left (0 without clock)
	 * @property {number} bestStreak
	 * @property {number} durationMs
	 * @property {boolean} timeUp      the chess clock ran out
	 * @property {number} previousBest highscore of this unit before this round (0 = none)
	 * @property {number} days         rounds finished on days in a row, including today
	 * @property {import('#lib/learn/advancements.js').Advancement[]} advancements  unlocked in this round
	 */
</script>

<script>
	import { resolve } from '$app/paths';
	import Confetti from '#lib/components/Confetti.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import Sprite from '#lib/components/Sprite.svelte';
	import HardButton from '#lib/components/HardButton.svelte';
	import XpBar from '#lib/components/XpBar.svelte';
	import { phrase, verdict } from '#lib/learn/feedback.js';
	import { STAGES, stageOf } from '#lib/learn/leitner.js';
	import { levelFor } from '#lib/learn/level.js';

	/** @typedef {import('#lib/model.js').Entry} Entry */

	/**
	 * @type {{
	 *   unitId: string,
	 *   summary: Summary,
	 *   challenge?: number,
	 *   share: { title: string, text: string, url: () => Promise<string> },
	 *   answers: { entry: Entry, outcome: import('#lib/learn/check-answer.js').Outcome, before: { box: number } }[],
	 *   boxOf: (entryId: string) => number,
	 *   isHard: (entryId: string) => boolean,
	 *   ontogglehard: (entryId: string) => void,
	 *   onrepeat: (entries: Entry[]) => void,
	 *   onnewround: () => void
	 * }}
	 * boxOf: the word's box now, after the round
	 */
	let {
		unitId,
		summary,
		challenge,
		share,
		answers,
		boxOf,
		isHard,
		ontogglehard,
		onrepeat,
		onnewround
	} = $props();

	const known = $derived(answers.filter((a) => a.outcome !== 'wrong').length);
	const mistakes = $derived(answers.filter((a) => a.outcome === 'wrong').map((a) => a.entry));
	const knownShare = $derived(summary.planned ? known / summary.planned : 0);
	const headline = $derived(verdict(knownShare));
	const timeUpText = phrase('timeUp');
	const isRecord = $derived(summary.points > summary.previousBest && summary.points > 0);
	const seconds = $derived(Math.round(summary.durationMs / 1000));
	const minutes = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);

	const levelBefore = $derived(levelFor(summary.xpBefore).level);
	const levelNow = $derived(levelFor(summary.xpBefore + summary.points).level);

	/** how many words reached which stage, and how many fell back to stage 1 */
	const balance = $derived.by(() => {
		const upgradedTo = STAGES.map(() => 0);
		let fellBack = 0;
		for (const answer of answers) {
			const now = boxOf(answer.entry.id);
			if (now > answer.before.box) upgradedTo[now - 1]++;
			else if (now < answer.before.box) fellBack++;
		}
		return { upgradedTo, upgraded: upgradedTo.reduce((a, b) => a + b, 0), fellBack };
	});
</script>

{#if isRecord || knownShare === 1 || levelNow > levelBefore || summary.advancements.length}
	<Confetti />
{/if}

<div class="card result">
	{#if summary.timeUp}<p class="time-up">{timeUpText}</p>{/if}
	<p class="emoji">{headline.emoji}</p>
	<h1>{headline.text}</h1>
	<p class="xp"><Sprite name="xp" size={32} /> +{summary.points} XP</p>
	{#if levelNow > levelBefore}
		<p class="level-up">Level-Up! Du bist jetzt Level {levelNow}.</p>
	{/if}
	{#if isRecord}
		<p class="record">
			{summary.previousBest
				? `Neuer Rekord in dieser Lektion! (vorher ${summary.previousBest} XP)`
				: 'Dein erster Rekord in dieser Lektion!'}
		</p>
	{/if}
	{#if challenge}
		<p class="challenge">
			{summary.points > challenge
				? `🎉 Challenge geschafft – ${challenge} XP geschlagen!`
				: `😤 Noch ${challenge - summary.points + 1} XP bis zum Sieg. Nochmal?`}
		</p>
	{/if}
	<p>{known} von {summary.planned} gewusst</p>
	<ProgressBar value={knownShare} label="Anteil gewusst" />
</div>

<!-- level and stages on dark ground, like the game's screens -->
<div class="level">
	<XpBar xp={summary.xpBefore + summary.points} />
</div>

{#if summary.advancements.length}
	<section class="unlocked">
		<h2>Erfolg freigeschaltet!</h2>
		<ul>
			{#each summary.advancements as advancement (advancement.id)}
				<li>
					<Sprite name={advancement.sprite} size={32} />
					<span
						><strong>{advancement.title}</strong>
						<span class="muted read">{advancement.text}</span></span
					>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if balance.upgraded || balance.fellBack}
	<section class="balance">
		<h2>Aufgestiegen</h2>
		<ul>
			{#each STAGES as stage, i (stage.sprite)}
				{#if balance.upgradedTo[i]}
					<li>
						<Sprite name={stage.sprite} size={32} />
						{balance.upgradedTo[i]}× auf {stage.name}
					</li>
				{/if}
			{/each}
			{#if balance.fellBack}
				<li class="back">
					<Sprite name={STAGES[0].sprite} size={32} />
					{balance.fellBack}× zurück auf {STAGES[0].name}
				</li>
			{/if}
		</ul>
	</section>
{/if}

<dl class="facts">
	<div>
		<dt><Sprite name="clock" size={20} /> Zeit</dt>
		<dd>{minutes}</dd>
	</div>
	<div>
		<dt>🔥 Beste Serie</dt>
		<dd>{summary.bestStreak}</dd>
	</div>
	{#if summary.timeBonus}
		<div>
			<dt>⚡ Zeitbonus</dt>
			<dd>+{summary.timeBonus} XP</dd>
		</div>
	{/if}
	<div>
		<dt><Sprite name="sun" size={20} /> In Folge</dt>
		<dd>{summary.days} {summary.days === 1 ? 'Tag' : 'Tage'}</dd>
	</div>
</dl>

{#if mistakes.length > 0}
	<section class="card mistakes">
		<h2>Die üben wir nochmal</h2>
		<ul>
			{#each mistakes as entry (entry.id)}
				<li>
					<Sprite name={stageOf(boxOf(entry.id)).sprite} size={28} />
					<span class="read"><strong>{entry.front}</strong> – {entry.back}</span>
					<HardButton hard={isHard(entry.id)} ontoggle={() => ontogglehard(entry.id)} />
				</li>
			{/each}
		</ul>
	</section>
{/if}

<div class="actions">
	{#if mistakes.length > 0}
		<button class="button primary big" onclick={() => onrepeat(mistakes)}>
			Nur Fehler nochmal ({mistakes.length})
		</button>
	{/if}
	<button class="button big" onclick={onnewround}>Neue Runde</button>
	{#if summary.points > 0}
		<ShareButton label="Ergebnis teilen" {...share} />
	{/if}
	<a class="button" href={resolve('/einheit/[id]', { id: unitId })}>Zur Lektion</a>
</div>

<style>
	.result {
		display: grid;
		justify-items: center;
		gap: 0.4rem;
		margin-bottom: var(--gap);
		text-align: center;

		p {
			margin: 0;
		}

		:global(.bar) {
			width: 100%;
		}
	}

	.emoji {
		font-size: 3.5rem;
		line-height: 1;
	}

	.xp {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 2rem;
		font-weight: 700;
		color: var(--accent-ink);
	}

	.level-up {
		padding: 0.2rem 0.6rem;
		background: #000;
		color: var(--yellow);
		font-weight: 700;
	}

	.record {
		font-weight: 700;
		color: var(--star-ink);
	}

	.challenge {
		font-weight: 700;
	}

	.time-up {
		font-weight: 700;
		color: var(--bad);
	}

	.level {
		margin-bottom: var(--gap);
	}

	.unlocked {
		margin-bottom: var(--gap);
		padding: 0.6rem 0.8rem;
		border: 2px solid #000;
		background: #212121;
		box-shadow: inset 0 0 0 2px #555;

		h2 {
			color: var(--yellow);
			font-size: 1.1rem;
		}

		ul {
			list-style: none;
			padding: 0;
			margin: 0;
			display: grid;
			gap: 0.4rem;
		}

		li {
			display: flex;
			align-items: center;
			gap: 0.6rem;
		}
	}

	.balance {
		margin-bottom: var(--gap);
		padding: 0.6rem 0.8rem;
		background: rgb(0 0 0 / 0.55);

		h2 {
			font-size: 1.1rem;
		}

		ul {
			list-style: none;
			padding: 0;
			margin: 0;
			display: grid;
			gap: 0.3rem;
		}

		li {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			color: var(--good);
		}

		.back {
			color: var(--bad);
		}
	}

	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
		gap: 4px;
		margin: 0 0 var(--gap);

		div {
			padding: 0.5rem;
			background: rgb(0 0 0 / 0.55);
		}

		dt {
			display: flex;
			align-items: center;
			gap: 0.3rem;
			font-size: 0.85rem;
			color: var(--muted);
		}

		dd {
			margin: 0;
			font-size: 1.2rem;
			font-weight: 700;
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
			display: grid;
			grid-template-columns: auto 1fr auto;
			align-items: center;
			gap: 0.5rem;
			border-top: 2px solid var(--line);
		}
	}

	.actions {
		display: grid;
		gap: 0.6rem;
	}

	.big {
		min-height: 3.75rem;
		font-size: 1.15rem;
	}
</style>
