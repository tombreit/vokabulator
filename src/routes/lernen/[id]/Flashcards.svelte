<!--
  Mode "Karteikarte": reveal the solution, then say honestly whether you knew it.
  Right after that (`chosen`) the buttons stay where they are but rest for a moment –
  the chosen one stays bright – while the card shows the new stage.
-->
<script>
	/**
	 * @type {{
	 *   revealed: boolean,
	 *   chosen?: import('#lib/learn/check-answer.js').Outcome,
	 *   onreveal: () => void,
	 *   onanswer: (outcome: import('#lib/learn/check-answer.js').Outcome) => void
	 * }}
	 */
	let { revealed, chosen, onreveal, onanswer } = $props();
</script>

<div class="actions" inert={chosen !== undefined}>
	{#if !revealed}
		<button class="button primary big" onclick={onreveal}>Aufdecken</button>
	{:else}
		<button
			class="button danger big"
			class:faded={chosen === 'right'}
			onclick={() => onanswer('wrong')}>Noch nicht</button
		>
		<button
			class="button primary big"
			class:faded={chosen === 'wrong'}
			onclick={() => onanswer('right')}>Gewusst</button
		>
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

	/* after rating: the chosen button stays bright, the other one steps back */
	.faded {
		opacity: 0.35;
	}
</style>
