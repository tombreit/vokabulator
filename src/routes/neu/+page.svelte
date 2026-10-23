<!--
  Create a new learning unit.
  Each import method is a component in this folder. Scan, code and a friend's link save the
  unit right away and go on to the round (MediencodeLoader, SharedImport); typed text and a
  file (e.g. an Anki deck) first show what was recognised (DraftPreview).

  /neu                      → "Scannen" tab (or "Code" where the browser cannot read QR codes)
  /neu?code=40702-229       → "Code" tab, starts loading right away
  /neu?code=40702-229&neu=1 → load again even if the unit already exists ("Neu laden")
  /neu#d=…                  → a unit shared by a friend, words inside the link (SharedImport)
  …&challenge=57&…          → a friend's challenge, shown here and carried on to the learning page
-->
<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { canScanQr } from '#lib/components/QrScanner.svelte';
	import { loadPdfjs } from '#lib/import/pdf-items.js';
	import { readChallenge } from '#lib/share.js';
	import CodeImport from './CodeImport.svelte';
	import FileImport from './FileImport.svelte';
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
		{ id: 'text', label: 'Text' },
		{ id: 'file', label: 'Datei' }
	];
	let activeId = $state(initialCode ? 'code' : methods[0].id);

	// pdf.js (~1 MB) loads while the camera looks for the code, so reading the PDF starts at once.
	onMount(() => {
		if (!packed) loadPdfjs().catch(() => {});
	});
</script>

<a class="back" href={resolve('/')}>‹ Meine Lektionen</a>
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
	{:else if activeId === 'text'}
		<TextImport />
	{:else}
		<FileImport />
	{/if}
{/if}

<style>
	.challenge {
		margin-bottom: var(--gap);
	}

	/* One row; the chosen tab is green. Monocraft is wide (about 0.67em a letter): four tabs fit
	   down to 280 px only if each is as wide as its label needs and the font shrinks a little
	   below about 370 px. */
	.tabs {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: auto;
		gap: 6px;
		margin-bottom: var(--gap);

		button {
			gap: 0.35em;
			padding-inline: 0.25rem;
			font-size: clamp(0.75em, 4.6vw, 1em);
			white-space: nowrap;
		}
	}
</style>
