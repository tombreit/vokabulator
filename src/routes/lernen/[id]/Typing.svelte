<!-- Mode "Tippen": type the answer; check-answer.js decides how right it is. -->
<script>
	import { checkAnswer } from '#lib/learn/check-answer.js';
	import { LANGS } from '#lib/model.js';

	/**
	 * @type {{
	 *   entry: import('#lib/model.js').Entry,
	 *   reverse: boolean,
	 *   lang: import('#lib/model.js').Lang,
	 *   tip?: string,
	 *   onanswer: (outcome: import('#lib/learn/check-answer.js').Outcome, given: string) => void
	 * }}
	 * tip: shown after the 💡 joker, e.g. "n…"
	 */
	let { entry, reverse, lang, tip = '', onanswer } = $props();

	let given = $state('');

	/** @param {SubmitEvent} event */
	function submit(event) {
		event.preventDefault();
		onanswer(checkAnswer(given, entry, reverse, lang), given.trim());
	}
</script>

{#if tip}
	<p class="tip">💡 Fängt an mit <strong>{tip}</strong></p>
{/if}

<form onsubmit={submit}>
	<!-- svelte-ignore a11y_autofocus: the learner came here to type -->
	<input
		bind:value={given}
		placeholder={reverse ? `Auf ${LANGS[lang].name} …` : 'Auf Deutsch …'}
		aria-label="Deine Antwort"
		autocomplete="off"
		autocapitalize="off"
		spellcheck="false"
		enterkeyhint="send"
		autofocus
	/>
	<button class="button primary">Prüfen</button>
</form>

<style>
	form {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.6rem;
	}

	.tip {
		margin: 0 0 0.6rem;
		text-align: center;
	}

	input {
		min-width: 0;
		font-size: 1.2rem;
		min-height: 3.5rem;
	}

	button {
		min-height: 3.5rem;
		padding-inline: 0.75rem;
	}
</style>
