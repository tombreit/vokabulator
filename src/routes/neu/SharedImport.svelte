<!-- A unit a friend shared: its words are inside the link (after "#d="), see #lib/share.js. -->
<script>
	import { unpackUnit } from '#lib/share.js';
	import DraftPreview from './DraftPreview.svelte';

	/** @type {{ packed: string }} the text after "#d=" */
	let { packed } = $props();
</script>

{#await unpackUnit(packed)}
	<p class="card" role="status">⏳ Packe die Vokabeln aus …</p>
{:then draft}
	<DraftPreview {draft} />
{:catch}
	<p class="card error" role="alert">
		🙈 Dieser Link ist leider kaputt – vielleicht wurde er beim Kopieren abgeschnitten.
	</p>
{/await}

<style>
	.error {
		border-color: var(--bad);
	}
</style>
