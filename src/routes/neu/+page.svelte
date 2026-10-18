<!--
  Create a new learning unit.
  Each import method is a component in this folder. All of them end in
  DraftPreview.svelte, which shows what was recognised and saves the unit.

  /neu                      → "Scannen" tab (or "Code" where the browser cannot read QR codes)
  /neu?code=40702-229       → "Code" tab, starts loading right away
  /neu?code=40702-229&neu=1 → load again even if the unit already exists ("Neu laden")
  /neu#d=…                  → a unit shared by a friend, words inside the link (SharedImport)
  …&challenge=57&…          → a friend's challenge, shown here and carried on to the learning page
-->
<script>
	import { page } from '$app/state';
	import { canScanQr } from '#lib/components/QrScanner.svelte';
	import { readChallenge } from '#lib/share.js';
	import CodeImport from './CodeImport.svelte';
	import PdfImport from './PdfImport.svelte';
	import ScanImport from './ScanImport.svelte';
	import SharedImport from './SharedImport.svelte';
	import TextImport from './TextImport.svelte';

	const initialCode = page.url.searchParams.get('code') ?? '';
	const reload = page.url.searchParams.has('neu');
	const packed = page.url.hash.startsWith('#d=') ? page.url.hash.slice(3) : '';
	const challenge = readChallenge(page.url.searchParams);

	const methods = [
		...(canScanQr ? [{ id: 'scan', label: '📷 Scannen' }] : []),
		{ id: 'code', label: '🔢 Code' },
		{ id: 'pdf', label: '📄 PDF' },
		{ id: 'text', label: '✍️ Text' }
	];
	let activeId = $state(initialCode ? 'code' : methods[0].id);
</script>

<h1>{packed || initialCode ? '📩 Von einem Freund' : 'Neue Welt'}</h1>

{#if challenge}
	<p class="card challenge">
		🏆 <strong>Challenge:</strong> Schlag {challenge.points} Punkte! Speicher die Einheit und leg los.
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
	{:else if activeId === 'pdf'}
		<PdfImport />
	{:else}
		<TextImport />
	{/if}
{/if}

<style>
	.challenge {
		margin-bottom: var(--gap);
	}

	/* 2 × 2 on phones, one row on wider screens; the chosen tab is green */
	.tabs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
		gap: 6px;
		margin-bottom: var(--gap);

		button {
			white-space: nowrap;
		}
	}
</style>
