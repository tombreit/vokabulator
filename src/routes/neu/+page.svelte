<!--
  Create a new learning unit.
  Each import method is a component in this folder. Scan, code and a friend's link save the
  unit right away and go on to the round (MediencodeLoader, SharedImport); typed text first
  shows what was recognised (DraftPreview).

  /neu                      → "Scannen" tab (or "Code" where the browser cannot read QR codes)
  /neu?code=40702-229       → "Code" tab, starts loading right away
  /neu?code=40702-229&neu=1 → load again even if the unit already exists ("Neu laden")
  /neu#d=…                  → a unit shared by a friend, words inside the link (SharedImport)
  …&challenge=57&…          → a friend's challenge, shown here and carried on to the learning page
-->
<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { canScanQr } from '#lib/components/QrScanner.svelte';
	import { loadPdfjs } from '#lib/import/pdf-items.js';
	import { readChallenge } from '#lib/share.js';
	import CodeImport from './CodeImport.svelte';
	import ScanImport from './ScanImport.svelte';
	import SharedImport from './SharedImport.svelte';
	import TextImport from './TextImport.svelte';

	const initialCode = page.url.searchParams.get('code') ?? '';
	const reload = page.url.searchParams.has('neu');
	const packed = page.url.hash.startsWith('#d=') ? page.url.hash.slice(3) : '';
	const challenge = readChallenge(page.url.searchParams);

	const methods = [
		...(canScanQr ? [{ id: 'scan', label: 'Scannen' }] : []),
		{ id: 'code', label: 'Code' },
		{ id: 'text', label: 'Text' }
	];
	let activeId = $state(initialCode ? 'code' : methods[0].id);

	// pdf.js (~1 MB) loads while the camera looks for the code, so reading the PDF starts at once.
	onMount(() => {
		if (!packed) loadPdfjs().catch(() => {});
	});
</script>

<h1>{reload ? 'Neu laden' : packed || initialCode ? '📩 Von einem Freund' : 'Neue Lektion'}</h1>

{#if challenge}
	<p class="card challenge">
		🏆 <strong>Challenge:</strong> Schlag {challenge.points} XP!
	</p>
{/if}

{#if packed}
	<SharedImport {packed} />
{:else}
	<div class="tabs" role="tablist">
		{#each methods as method (method.id)}
			<button
				class="button"
				class:primary={method.id === activeId}
				role="tab"
				aria-selected={method.id === activeId}
				onclick={() => (activeId = method.id)}
			>
				{method.label}
			</button>
		{/each}
	</div>

	{#if activeId === 'scan'}
		<ScanImport />
	{:else if activeId === 'code'}
		<CodeImport {initialCode} {reload} />
	{:else}
		<TextImport />
	{/if}
{/if}

<style>
	.challenge {
		margin-bottom: var(--gap);
	}

	/* one row; the chosen tab is green */
	.tabs {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		gap: 6px;
		margin-bottom: var(--gap);

		button {
			gap: 0.35em;
			padding-inline: 0.25rem;
			white-space: nowrap;
		}
	}
</style>
