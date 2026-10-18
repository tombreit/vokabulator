<!--
  Loads the vocabulary of one C.C.Buchner Mediencode and shows the preview.
  Used by the "Code" tab – and later by the QR scanner.
-->
<script>
	import { importMediencode } from '#lib/import/ccbuchner.js';
	import DraftPreview from './DraftPreview.svelte';

	/** @type {{ code: string }} e.g. "40702-229" */
	let { code } = $props();
</script>

{#await importMediencode(code)}
	<p class="card loading" role="status">⏳ Lade die Vokabeln zu {code} …</p>
{:then draft}
	<DraftPreview {draft} />
{:catch error}
	<p class="card error" role="alert">{error.message}</p>
{/await}

<style>
	.loading {
		margin-top: var(--gap);
		text-align: center;
	}

	.error {
		margin-top: var(--gap);
		border-color: var(--bad);
	}
</style>
