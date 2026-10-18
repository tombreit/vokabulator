<!--
  Create a new learning unit.
  Each import method is a component in this folder. All of them end in
  DraftPreview.svelte, which shows what was recognised and saves the unit.

  /neu                      → "Scannen" tab (or "Code" where the browser cannot read QR codes)
  /neu?code=40702-229       → "Code" tab, starts loading right away
  /neu?code=40702-229&neu=1 → load again even if the unit already exists ("Neu laden")
-->
<script>
	import { page } from '$app/state';
	import { canScanQr } from '#lib/components/QrScanner.svelte';
	import CodeImport from './CodeImport.svelte';
	import PdfImport from './PdfImport.svelte';
	import ScanImport from './ScanImport.svelte';
	import TextImport from './TextImport.svelte';

	const initialCode = page.url.searchParams.get('code') ?? '';
	const reload = page.url.searchParams.has('neu');

	const methods = [
		...(canScanQr ? [{ id: 'scan', label: '📷 Scannen' }] : []),
		{ id: 'code', label: '🔢 Code' },
		{ id: 'pdf', label: '📄 PDF' },
		{ id: 'text', label: '✍️ Text' }
	];
	let activeId = $state(initialCode ? 'code' : methods[0].id);
</script>

<h1>Neue Lerneinheit</h1>

<div class="tabs" role="tablist">
	{#each methods as method (method.id)}
		<button
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

<style>
	/* 2 × 2 on phones, one row on wider screens */
	.tabs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
		gap: 0.4rem;
		margin-bottom: var(--gap);

		button {
			min-height: var(--tap);
			padding: 0.5rem 0.8rem;
			border: 1px solid var(--line);
			border-radius: 999px;
			background: var(--surface);
			color: inherit;
			font: inherit;
			font-weight: 600;
			white-space: nowrap;
			cursor: pointer;

			&[aria-selected='true'] {
				background: var(--accent);
				border-color: var(--accent);
				color: var(--accent-text);
			}
		}
	}
</style>
