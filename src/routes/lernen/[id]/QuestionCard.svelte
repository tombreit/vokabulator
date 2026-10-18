<!--
  The question as a wax tablet (tabula cerata): dark wax in a wooden frame.
  Once answered or revealed, the solution is "scratched in" below the question.
  The foreign word is set in the inscription face, German in the reading face –
  so the type alone tells which language you are looking at.
-->
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
	<p class="side">{langName}</p>
	<p class="word foreign" lang={langName === 'Latein' ? 'la' : undefined}>{entry.front}</p>
	{#if entry.frontInfo}<p class="info">{entry.frontInfo}</p>{/if}
{/snippet}

{#snippet german()}
	<p class="side">Deutsch</p>
	<p class="word german">{entry.back}</p>
{/snippet}

<div class="tablet">
	<div class="wax">
		{@render (reverse ? german : foreign)()}

		{#if showAnswer}
			<div class="answer">
				<hr />
				{@render (reverse ? foreign : german)()}
			</div>
		{/if}
	</div>
</div>

<style>
	/* the wooden frame */
	.tablet {
		padding: 10px;
		margin-bottom: var(--gap);
		border-radius: 12px;
		background:
			repeating-linear-gradient(96deg, rgb(255 255 255 / 0.05) 0 2px, transparent 2px 11px),
			var(--wood);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.25),
			0 8px 16px -10px rgb(60 30 0 / 0.7);
	}

	/* the wax, sitting a little deeper than the frame */
	.wax {
		min-height: 12rem;
		display: grid;
		align-content: center;
		padding: 1.75rem 1rem;
		border-radius: 6px;
		background: var(--wax);
		box-shadow: inset 0 3px 10px rgb(0 0 0 / 0.55);
		color: var(--scratch);
		text-align: center;
		overflow-wrap: anywhere;
	}

	.side {
		margin: 0 0 0.3rem;
		font-size: 0.85rem;
		color: var(--scratch-muted);
	}

	.word {
		margin: 0;
		line-height: 1.2;
	}

	.foreign {
		font-family: var(--font-inscription);
		font-size: clamp(1.7rem, 7.5vw, 2.4rem);
		letter-spacing: 0.01em;
	}

	.german {
		font-weight: 600;
		font-size: clamp(1.2rem, 5.5vw, 1.55rem);
	}

	.info {
		margin: 0.3rem 0 0;
		font-style: italic;
		color: var(--scratch-muted);
	}

	hr {
		width: 70%;
		margin: 1.25rem auto;
		border: none;
		border-top: 2px dotted var(--scratch-muted);
		opacity: 0.6;
	}

	/* the solution appears from left to right, as if written with the stylus */
	.answer {
		animation: scratch-in 0.55s cubic-bezier(0.3, 0.7, 0.4, 1);
	}

	@keyframes scratch-in {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}
</style>
