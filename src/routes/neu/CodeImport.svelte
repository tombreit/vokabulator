<!--
  Import method "Code": type the Mediencode printed next to the QR code in the book.
  Also used for links like /neu?code=40702-229 (e.g. shared by a friend).
-->
<script>
	import { onMount } from 'svelte';
	import { parseMediencode } from '#lib/import/ccbuchner.js';
	import MediencodeLoader from './MediencodeLoader.svelte';

	/**
	 * @type {{ initialCode?: string, reload?: boolean }}
	 * initialCode: start loading right away; reload: load again even if the unit exists
	 */
	let { initialCode = '', reload = false } = $props();

	let input = $state('');
	/** the code being loaded */
	let code = $state('');
	let invalid = $state(false);

	onMount(() => {
		if (initialCode) {
			input = initialCode;
			open();
		}
	});

	function open() {
		const parsed = parseMediencode(input);
		invalid = !parsed;
		if (parsed) code = parsed;
	}
</script>

<form
	class="card form"
	onsubmit={(event) => {
		event.preventDefault();
		open();
	}}
>
	<label>
		Mediencode aus dem Buch
		<input
			bind:value={input}
			placeholder="z. B. 40702-229"
			inputmode="numeric"
			autocomplete="off"
			aria-invalid={invalid}
		/>
	</label>
	{#if invalid}
		<p class="hint bad">Ein Mediencode sieht so aus: <code>40702-229</code> 🙂</p>
	{:else}
		<p class="hint muted">Steht im Buch neben dem QR-Code.</p>
	{/if}
	<button class="button primary">Vokabeln laden 🚀</button>
</form>

{#if code}
	<MediencodeLoader {code} {reload} />
{/if}

<style>
	.form {
		display: grid;
		gap: var(--gap);
	}

	input {
		font-size: 1.3rem;
		letter-spacing: 0.05em;
	}

	.hint {
		margin: -0.5rem 0 0;
		font-size: 0.9rem;
	}

	.bad {
		color: var(--bad);
	}

	button {
		min-height: 3.5rem;
		font-size: 1.1rem;
	}
</style>
