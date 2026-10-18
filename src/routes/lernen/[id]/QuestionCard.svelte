<!-- The card with the question – and, once answered or revealed, the solution below it. -->
<script>
	/**
	 * @type {{
	 *   entry: import('#lib/model.js').Entry,
	 *   reverse: boolean,
	 *   langName: string,
	 *   showAnswer: boolean
	 * }}
	 * reverse: ask the German side, answer the foreign one
	 */
	let { entry, reverse, langName, showAnswer } = $props();
</script>

{#snippet foreign()}
	<p class="word">{entry.front}</p>
	{#if entry.frontInfo}<p class="info">{entry.frontInfo}</p>{/if}
{/snippet}

{#snippet german()}
	<p class="word">{entry.back}</p>
{/snippet}

<div class="card question">
	<p class="side muted">{reverse ? 'Deutsch' : langName}</p>
	{@render (reverse ? german : foreign)()}

	{#if showAnswer}
		<hr />
		<p class="side muted">{reverse ? langName : 'Deutsch'}</p>
		{@render (reverse ? foreign : german)()}
	{/if}
</div>

<style>
	.question {
		min-height: 12rem;
		display: grid;
		align-content: center;
		text-align: center;
		padding: 2rem 1rem;
		margin-bottom: var(--gap);

		hr {
			width: 100%;
			border: none;
			border-top: 1px dashed var(--line);
			margin: 1.25rem 0;
		}
	}

	.side {
		margin: 0 0 0.25rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.word {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.info {
		margin: 0.25rem 0 0;
		font-style: italic;
		color: var(--muted);
	}
</style>
