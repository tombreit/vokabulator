<!-- Mode "Tippen": type the answer; check-answer.js decides how right it is. -->
<script>
	import { checkAnswer } from '#lib/learn/check-answer.js';

	/**
	 * @type {{
	 *   entry: import('#lib/model.js').Entry,
	 *   reverse: boolean,
	 *   lang: import('#lib/model.js').Lang,
	 *   onanswer: (outcome: import('#lib/learn/check-answer.js').Outcome, given: string) => void
	 * }}
	 */
	let { entry, reverse, lang, onanswer } = $props();

	let given = $state('');

	/** @param {SubmitEvent} event */
	function submit(event) {
		event.preventDefault();
		onanswer(checkAnswer(given, entry, reverse, lang), given.trim());
	}
</script>

<form onsubmit={submit}>
	<!-- svelte-ignore a11y_autofocus: the learner came here to type -->
	<input
		bind:value={given}
		placeholder={reverse ? 'Das Wort in der Fremdsprache …' : 'Was heißt das auf Deutsch?'}
		aria-label="Deine Antwort"
		autocomplete="off"
		autocapitalize="off"
		spellcheck="false"
		enterkeyhint="send"
		autofocus
	/>
	<button class="button primary">Prüfen ✔️</button>
</form>

<style>
	form {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.6rem;
	}

	input {
		font-size: 1.2rem;
		min-height: 3.5rem;
	}

	button {
		min-height: 3.5rem;
	}
</style>
