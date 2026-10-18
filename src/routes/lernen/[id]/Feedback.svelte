<!-- After an answer in "Tippen"/"Auswahl": right or not, and on to the next card. -->
<script>
	/**
	 * @type {{
	 *   outcome: import('#lib/learn/check-answer.js').Outcome,
	 *   phrase: string,
	 *   gained: number,
	 *   given: string,
	 *   onnext: () => void,
	 *   onoverride?: () => void
	 * }}
	 * phrase: from feedback.js; given: what was typed or picked;
	 * onoverride: "Ich lag doch richtig" (typing only)
	 */
	let { outcome, phrase, gained, given, onnext, onoverride } = $props();

	// Right answers go on by themselves after a moment – wrong ones wait, so the solution can sink in.
	$effect(() => {
		if (outcome !== 'right') return;
		const timer = setTimeout(onnext, 1200);
		return () => clearTimeout(timer);
	});
</script>

<div class="card feedback {outcome}" role="status">
	<p class="message">
		{phrase}
		{#if gained > 0}<span class="points">+{gained}</span>{/if}
	</p>
	{#if outcome !== 'right' && given}
		<p class="muted">Deine Antwort: „{given}“ – die Lösung steht oben auf der Karte.</p>
	{/if}
	<div class="buttons">
		{#if outcome === 'wrong' && onoverride && given}
			<button class="button" onclick={onoverride}>🙋 Ich lag doch richtig</button>
		{/if}
		<!-- svelte-ignore a11y_autofocus: Enter / tap goes on to the next card -->
		<button class="button primary next" onclick={onnext} autofocus>Weiter →</button>
	</div>
</div>

<style>
	.feedback {
		display: grid;
		gap: 0.5rem;
		border-width: 2px;

		&.right {
			border-color: var(--good);
		}
		&.typo {
			border-color: var(--star);
		}
		&.wrong {
			border-color: var(--bad);
		}

		p {
			margin: 0;
		}
	}

	.message {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.points {
		color: var(--good);
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 0.4rem;
	}

	.next {
		flex: 1;
		min-height: 3.25rem;
	}
</style>
