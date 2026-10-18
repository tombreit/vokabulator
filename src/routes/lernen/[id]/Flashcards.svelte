<!-- Mode "Karteikarte": reveal the solution, then say honestly whether you knew it. -->
<script>
	/**
	 * @type {{
	 *   revealed: boolean,
	 *   onreveal: () => void,
	 *   onanswer: (outcome: import('#lib/learn/check-answer.js').Outcome) => void
	 * }}
	 */
	let { revealed, onreveal, onanswer } = $props();
</script>

<div class="actions">
	{#if !revealed}
		<button class="button primary big" onclick={onreveal}>Aufdecken 👀</button>
	{:else}
		<button class="button big bad" onclick={() => onanswer('wrong')}>❌ Noch nicht</button>
		<button class="button big good" onclick={() => onanswer('right')}>✅ Gewusst</button>
	{/if}
</div>

<style>
	.actions {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 0.6rem;
	}

	.big {
		min-height: 3.75rem;
		font-size: 1.1rem;
	}

	.good {
		background: var(--good-fill);
		border-color: var(--good-fill);
		color: white;
	}

	.bad {
		background: var(--bad-fill);
		border-color: var(--bad-fill);
		color: white;
	}
</style>
