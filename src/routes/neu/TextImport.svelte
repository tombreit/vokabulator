<!-- Import method "Text einfügen": type or paste one word per line. -->
<script>
	import { parseText } from '#lib/import/text-parser.js';
	import { LANGS } from '#lib/model.js';
	import DraftPreview from './DraftPreview.svelte';

	const id = `txt-${crypto.randomUUID()}`;

	let title = $state('');
	/** @type {import('#lib/model.js').Lang} */
	let lang = $state('la');
	let text = $state('');

	const result = $derived(parseText(text, title.trim() || 'Meine Vokabeln'));
</script>

<form class="card" onsubmit={(event) => event.preventDefault()}>
	<label>
		Titel
		<input bind:value={title} placeholder="z. B. Lektion 12" />
	</label>

	<label>
		Sprache
		<select bind:value={lang}>
			{#each Object.entries(LANGS) as [code, { name, flag }] (code)}
				<option value={code}>{flag} {name}</option>
			{/each}
		</select>
	</label>

	<label>
		Vokabeln – eine pro Zeile
		<textarea
			bind:value={text}
			rows="10"
			placeholder={'# Lektion 12\namicus = der Freund\nservare = retten, bewahren'}></textarea>
	</label>
	<p class="muted hint">
		Trenne Wort und Bedeutung mit <code>=</code>, <code>-</code>, <code>;</code> oder Tab. Eine
		Zeile mit <code>#</code> am Anfang beginnt einen neuen Abschnitt.
	</p>
</form>

{#if result.errors.length > 0}
	<div class="card errors">
		<strong>🤔 Diese Zeilen verstehe ich nicht:</strong>
		<ul>
			{#each result.errors as error (error.lineNumber)}
				<li>Zeile {error.lineNumber}: <code>{error.line}</code></li>
			{/each}
		</ul>
	</div>
{/if}

{#if result.parsed.sections.length > 0}
	<DraftPreview draft={{ id, lang, source: { type: 'text' }, parsed: result.parsed }} />
{/if}

<style>
	form {
		display: grid;
		gap: var(--gap);
	}

	textarea {
		font-family: ui-monospace, monospace;
		font-size: 0.95rem;
	}

	.hint {
		margin: -0.5rem 0 0;
		font-size: 0.9rem;
	}

	.errors {
		margin-top: var(--gap);
		border-color: var(--bad);
	}
</style>
