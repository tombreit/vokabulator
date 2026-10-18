<!-- After a round: points and how it went, the mistakes (mark them ⭐), and what to do next. -->
<script module>
	/**
	 * Numbers of a finished round, worked out by the page.
	 * @typedef {object} Summary
	 * @property {number} planned      cards in the round (when time runs out, not all were answered)
	 * @property {number} points       including the time bonus
	 * @property {number} timeBonus    ⏱️ points for time left (0 without clock)
	 * @property {number} bestStreak
	 * @property {number} durationMs
	 * @property {boolean} timeUp      the chess clock ran out
	 * @property {number} previousBest highscore of this unit before this round (0 = none)
	 * @property {number} days         rounds finished on days in a row, including today
	 */
</script>

<script>
	import { resolve } from '$app/paths';
	import Confetti from '#lib/components/Confetti.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ShareButton from '#lib/components/ShareButton.svelte';
	import StarButton from '#lib/components/StarButton.svelte';
	import { phrase, verdict } from '#lib/learn/feedback.js';

	/** @typedef {import('#lib/model.js').Entry} Entry */

	/**
	 * @type {{
	 *   unitId: string,
	 *   summary: Summary,
	 *   challenge?: number,
	 *   share: { title: string, text: string, url: () => Promise<string> },
	 *   answers: { entry: Entry, outcome: import('#lib/learn/check-answer.js').Outcome }[],
	 *   isHard: (entryId: string) => boolean,
	 *   ontogglestar: (entryId: string) => void,
	 *   onrepeat: (entries: Entry[]) => void,
	 *   onnewround: () => void
	 * }}
	 */
	let { unitId, summary, challenge, share, answers, isHard, ontogglestar, onrepeat, onnewround } =
		$props();

	const known = $derived(answers.filter((a) => a.outcome !== 'wrong').length);
	const mistakes = $derived(answers.filter((a) => a.outcome === 'wrong').map((a) => a.entry));
	const knownShare = $derived(summary.planned ? known / summary.planned : 0);
	const headline = $derived(verdict(knownShare));
	const timeUpText = phrase('timeUp');
	const isRecord = $derived(summary.points > summary.previousBest && summary.points > 0);
	const seconds = $derived(Math.round(summary.durationMs / 1000));
	const minutes = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
</script>

{#if isRecord || knownShare === 1}
	<Confetti />
{/if}

<div class="card result">
	{#if summary.timeUp}<p class="time-up">{timeUpText}</p>{/if}
	<p class="emoji">{headline.emoji}</p>
	<h1>{headline.text}</h1>
	<p class="points">{summary.points} Punkte</p>
	{#if isRecord}
		<p class="record">
			🏆 {summary.previousBest
				? `Neuer Rekord! (vorher ${summary.previousBest})`
				: 'Dein erster Rekord!'}
		</p>
	{/if}
	{#if challenge}
		<p class="challenge">
			{summary.points > challenge
				? `🎉 Challenge geschafft – ${challenge} Punkte geschlagen!`
				: `😤 Noch ${challenge - summary.points + 1} Punkte bis zum Sieg. Nochmal?`}
		</p>
	{/if}
	<p>{known} von {summary.planned} gewusst</p>
	<ProgressBar value={knownShare} label="Anteil gewusst" />

	<dl class="facts">
		<div>
			<dt>⏱️ Zeit</dt>
			<dd>{minutes}</dd>
		</div>
		<div>
			<dt>🔥 Beste Serie</dt>
			<dd>{summary.bestStreak}</dd>
		</div>
		{#if summary.timeBonus}<div>
				<dt>⚡ Zeitbonus</dt>
				<dd>+{summary.timeBonus}</dd>
			</div>{/if}
		<div>
			<dt>📅 Tage in Folge</dt>
			<dd>{summary.days}</dd>
		</div>
	</dl>
</div>

{#if mistakes.length > 0}
	<section class="card mistakes">
		<h2>Die üben wir nochmal 💪</h2>
		<ul>
			{#each mistakes as entry (entry.id)}
				<li>
					<span><strong>{entry.front}</strong> → {entry.back}</span>
					<StarButton hard={isHard(entry.id)} ontoggle={() => ontogglestar(entry.id)} />
				</li>
			{/each}
		</ul>
	</section>
{/if}

<div class="actions">
	{#if mistakes.length > 0}
		<button class="button primary big" onclick={() => onrepeat(mistakes)}>
			🔁 Nur Fehler nochmal ({mistakes.length})
		</button>
	{/if}
	<button class="button big" onclick={onnewround}>Neue Runde</button>
	{#if summary.points > 0}
		<ShareButton label="📤 Ergebnis teilen" {...share} />
	{/if}
	<a class="button" href={resolve('/einheit/[id]', { id: unitId })}>Zur Lerneinheit</a>
</div>

<style>
	.result {
		text-align: center;
		margin-bottom: var(--gap);

		.emoji {
			font-size: 4rem;
			margin: 0;
		}

		.points {
			font-size: 2.2rem;
			font-weight: 800;
			margin: 0.25rem 0;
			color: var(--accent-ink);
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
	}

	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
		gap: 0.5rem;
		margin: var(--gap) 0 0;

		div {
			background: var(--surface-2);
			border-radius: calc(var(--radius) / 1.5);
			padding: 0.5rem;
		}

		dt {
			font-size: 0.8rem;
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
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 0.5rem;
			border-top: 1px solid var(--line);
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
