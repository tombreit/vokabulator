<!-- Mode "Auswahl": pick the right answer out of four. -->
<script>
	/**
	 * @type {{
	 *   choices: { text: string, right: boolean }[],
	 *   onanswer: (outcome: import('#lib/learn/check-answer.js').Outcome, given: string) => void
	 * }}
	 */
	let { choices, onanswer } = $props();
</script>

<div class="choices">
	{#each choices as choice (choice.text)}
		<button class="button" onclick={() => onanswer(choice.right ? 'right' : 'wrong', choice.text)}>
			{choice.text}
		</button>
	{/each}
</div>

<style>
	.choices {
		display: grid;
		gap: 0.6rem;
	}

	button {
		min-height: 3.5rem;
		font-weight: 500;
		text-align: left;
		justify-content: flex-start;
	}
</style>
