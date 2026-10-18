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
		<button class="button primary big" onclick={onreveal}>Aufdecken</button>
	{:else}
		<button class="button danger big" onclick={() => onanswer('wrong')}>Noch nicht</button>
		<button class="button primary big" onclick={() => onanswer('right')}>Gewusst</button>
	{/if}
</div>

<style>
	.actions {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 0.6rem;
	}

	/* "Noch nicht" stays on one line, also on small phones */
	.big {
		min-height: 3.5rem;
		padding-inline: 0.5rem;
		white-space: nowrap;
	}
</style>
