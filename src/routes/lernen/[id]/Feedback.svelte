<!--
  After an answer: what Vokabulator says, as a chat message like in the game –
  "<Vokabulator> Sheesh! 🔥 +20 XP" – plus "Weiter" (and "Ich lag doch richtig" when typing).
  Flash cards pass no `onnext`: they go on by themselves.
-->
<script>
	/**
	 * @type {{
	 *   outcome: import('#lib/learn/check-answer.js').Outcome,
	 *   phrase: string,
	 *   gained: number,
	 *   given: string,
	 *   onnext?: () => void,
	 *   onoverride?: () => void
	 * }}
	 * phrase: from feedback.js; given: what was typed or picked;
	 * onoverride: "Ich lag doch richtig" (typing only)
	 */
	let { outcome, phrase, gained, given, onnext, onoverride } = $props();

	// Right answers go on by themselves after a moment – wrong ones wait, so the solution can sink in.
	$effect(() => {
		if (outcome !== 'right' || !onnext) return;
		const timer = setTimeout(onnext, 1200);
		return () => clearTimeout(timer);
	});
</script>

<div class="feedback" role="status">
	<p class="chat {outcome}">
		<span class="sender">&lt;Vokabulator&gt;</span>
		{phrase}
		{#if gained > 0}<span class="xp">+{gained} XP</span>{/if}
	</p>
	{#if outcome !== 'right' && given}
		<p class="chat given">Du: „{given}“ – die Lösung steht oben.</p>
	{/if}

	{#if onnext}
		<div class="buttons">
			{#if outcome === 'wrong' && onoverride && given}
				<button class="button" onclick={onoverride}>Ich lag doch richtig</button>
			{/if}
			<!-- svelte-ignore a11y_autofocus: Enter / tap goes on to the next card -->
			<button class="button primary next" onclick={onnext} autofocus>Weiter</button>
		</div>
	{/if}
</div>

<style>
	.feedback {
		display: grid;
		gap: 4px;
	}

	/* chat lines: translucent black, coloured like the game's chat */
	.chat {
		margin: 0;
		padding: 0.35rem 0.6rem;
		background: rgb(0 0 0 / 0.6);
		color: #fff;

		&.right {
			color: var(--good);
		}
		&.typo {
			color: var(--yellow);
		}
		&.wrong {
			color: var(--bad);
		}
		&.given {
			color: var(--muted);
			font-size: 0.9rem;
		}
	}

	.sender {
		color: #fff;
	}

	.xp {
		color: var(--xp);
		font-weight: 700;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 0.5rem;
	}

	.next {
		flex: 1;
		min-height: 3.25rem;
	}
</style>
