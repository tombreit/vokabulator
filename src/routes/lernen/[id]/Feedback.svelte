<!--
  After an answer in "Tippen" / "Auswahl": what you typed (when it was not right),
  "Ich lag doch richtig" (typing only) and "Weiter". What Vokabulator says about the
  answer is in ChatLine.svelte below.
-->
<script>
	/**
	 * @type {{
	 *   outcome: import('#lib/learn/check-answer.js').Outcome,
	 *   given: string,
	 *   onnext: () => void,
	 *   onoverride?: () => void
	 * }}
	 * given: what was typed or picked; onoverride: "Ich lag doch richtig" (typing only)
	 */
	let { outcome, given, onnext, onoverride } = $props();

	// Right answers go on by themselves after a moment – wrong ones wait, so the solution can sink in.
	$effect(() => {
		if (outcome !== 'right') return;
		const timer = setTimeout(onnext, 1200);
		return () => clearTimeout(timer);
	});
</script>

<div class="feedback">
	{#if outcome !== 'right' && given}
		<p class="given">Du: „{given}“ – die Lösung steht oben.</p>
	{/if}

	<div class="buttons">
		{#if outcome === 'wrong' && onoverride && given}
			<button class="button" onclick={onoverride}>Ich lag doch richtig</button>
		{/if}
		<!-- svelte-ignore a11y_autofocus: Enter / tap goes on to the next card -->
		<button class="button primary next" onclick={onnext} autofocus>Weiter</button>
	</div>
</div>

<style>
	.feedback {
		display: grid;
		gap: 0.5rem;
	}

	.given {
		margin: 0;
		padding: 0.35rem 0.6rem;
		background: rgb(0 0 0 / 0.6);
		color: var(--muted);
		font-size: 0.9rem;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.next {
		flex: 1;
		min-height: 3.25rem;
	}
</style>
