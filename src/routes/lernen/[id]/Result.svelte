<!-- After a round: how it went, the mistakes (mark them ⭐), and what to do next. -->
<script>
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import StarButton from '#lib/components/StarButton.svelte';

	/** @typedef {import('#lib/model.js').Entry} Entry */

	/**
	 * @type {{
	 *   unitId: string,
	 *   answers: { entry: Entry, outcome: import('#lib/learn/check-answer.js').Outcome }[],
	 *   isHard: (entryId: string) => boolean,
	 *   ontogglestar: (entryId: string) => void,
	 *   onrepeat: (entries: Entry[]) => void,
	 *   onnewround: () => void
	 * }}
	 */
	let { unitId, answers, isHard, ontogglestar, onrepeat, onnewround } = $props();

	const known = $derived(answers.filter((a) => a.outcome !== 'wrong').length);
	const mistakes = $derived(answers.filter((a) => a.outcome === 'wrong').map((a) => a.entry));
	const share = $derived(answers.length ? known / answers.length : 0);
	const verdict = $derived(
		share === 1
			? { emoji: '🏆', text: 'Perfekt!' }
			: share >= 0.8
				? { emoji: '🔥', text: 'Stark!' }
				: share >= 0.5
					? { emoji: '👍', text: 'Läuft!' }
					: { emoji: '💪', text: 'Dranbleiben!' }
	);
</script>

<div class="card result">
	<p class="emoji">{verdict.emoji}</p>
	<h1>{verdict.text}</h1>
	<p>{known} von {answers.length} gewusst</p>
	<ProgressBar value={share} label="Anteil gewusst" />
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
