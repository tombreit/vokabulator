<!--
  Loads the vocabulary of one C.C.Buchner Mediencode and shows the preview.
  If this code was imported before, it simply opens that unit (learning progress included).
  Used by the "Scannen" and "Code" tabs.
-->
<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { importMediencode } from '#lib/import/ccbuchner.js';
	import { getUnit } from '#lib/storage.js';
	import DraftPreview from './DraftPreview.svelte';

	/**
	 * @type {{ code: string, reload?: boolean }}
	 * code: e.g. "40702-229"; reload: load again even if the unit exists ("Neu laden")
	 */
	let { code, reload = false } = $props();

	const existing = $derived(reload ? undefined : getUnit(`ccb-${code}`));

	$effect(() => {
		if (existing) goto(resolve('/einheit/[id]', { id: existing.id }));
	});
</script>

{#if existing}
	<p class="card status" role="status">📖 Kenn ich schon – ich öffne „{existing.title}“ …</p>
{:else}
	{#await importMediencode(code)}
		<p class="card status" role="status">⏳ Lade die Vokabeln zu {code} …</p>
	{:then draft}
		<DraftPreview {draft} />
	{:catch error}
		<p class="card error" role="alert">{error.message}</p>
	{/await}
{/if}

<style>
	.status {
		margin-top: var(--gap);
		text-align: center;
	}

	.error {
		margin-top: var(--gap);
		border-color: var(--bad);
	}
</style>
