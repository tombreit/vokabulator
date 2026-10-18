<!--
  Create a new learning unit.
  Each import method is a component in this folder. All of them end in
  DraftPreview.svelte, which shows what was recognised and saves the unit.
-->
<script>
	import PdfImport from './PdfImport.svelte';
	import TextImport from './TextImport.svelte';

	const methods = [
		{ id: 'pdf', label: '📄 PDF-Datei', component: PdfImport },
		{ id: 'text', label: '✍️ Text eintippen', component: TextImport }
	];
	let activeId = $state(methods[0].id);
	const active = $derived(methods.find((m) => m.id === activeId) ?? methods[0]);
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

<active.component />

<style>
	.tabs {
		display: flex;
		gap: 0.4rem;
		margin-bottom: var(--gap);
		overflow-x: auto;

		button {
			flex: 1;
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
