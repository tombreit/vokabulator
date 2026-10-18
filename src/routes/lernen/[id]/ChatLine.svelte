<!--
  What Vokabulator says about the last answer, as a chat line like in the game:
  "<Vokabulator> Sheesh! 🔥 +20 XP". It sits below the buttons and stays for a few seconds –
  also when the next card is already there, so it can be read without slowing the round
  down – then fades out. The next answer replaces it.
-->
<script module>
	/**
	 * @typedef {object} Line
	 * @property {number} id      new for every answer (restarts the time on screen)
	 * @property {import('#lib/learn/check-answer.js').Outcome} outcome
	 * @property {string} text    from feedback.js
	 * @property {number} gained  XP
	 */

	/** how long a line stays on screen; it fades out during the last second */
	const SHOWN_MS = 6000;
</script>

<script>
	/** @type {{ line?: Line }} */
	let { line } = $props();

	let gone = $state(false);

	$effect(() => {
		if (!line) return;
		gone = false;
		const timer = setTimeout(() => (gone = true), SHOWN_MS);
		return () => clearTimeout(timer);
	});
</script>

<div class="chat-line" aria-live="polite">
	{#if line && !gone}
		{#key line.id}
			<p class="chat {line.outcome}" style:--shown="{SHOWN_MS}ms">
				<span class="sender">&lt;Vokabulator&gt;</span>
				{line.text}
				{#if line.gained > 0}<span class="xp">+{line.gained} XP</span>{/if}
			</p>
		{/key}
	{/if}
</div>

<style>
	.chat-line {
		margin-top: var(--gap);
	}

	/* translucent black, coloured like the game's chat; pops in, fades out at the end */
	.chat {
		margin: 0;
		padding: 0.35rem 0.6rem;
		background: rgb(0 0 0 / 0.6);
		color: #fff;
		animation:
			chat-in 0.15s ease-out,
			chat-out 1s ease-in calc(var(--shown) - 1s) forwards;

		&.right {
			color: var(--good);
		}
		&.typo {
			color: var(--yellow);
		}
		&.wrong {
			color: var(--bad);
		}
	}

	.sender {
		color: #fff;
	}

	.xp {
		color: var(--xp);
		font-weight: 700;
	}

	@keyframes chat-in {
		from {
			opacity: 0;
			translate: 0 6px;
		}
	}

	@keyframes chat-out {
		to {
			opacity: 0;
		}
	}
</style>
