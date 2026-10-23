<!--
  Import method "Datei": an Anki deck (.apkg), e.g. downloaded from ankiweb.net.
  The file is read right here on the device (#lib/import/files.js), nothing goes to a server.
  The learner chooses the part of the deck and which fields are word and meaning
  (#lib/import/table.js), DraftPreview shows the result and saves it – like typed text, a deck
  from somewhere needs a look before it becomes a lesson.
-->
<script>
	import { readFile } from '#lib/import/files.js';
	import { ImportError } from '#lib/import/import-error.js';
	import { guessColumns, scopesOf, tableToDraft } from '#lib/import/table.js';
	import DraftPreview from './DraftPreview.svelte';

	/** @typedef {import('#lib/import/table.js').ImportTable} ImportTable */

	let reading = $state(false);
	let error = $state('');
	/** what the file contains – an Anki deck has one table per note type */
	let tables = $state.raw(/** @type {ImportTable[]} */ ([]));
	/** notes of the file that fit in no table, e.g. cloze cards */
	let skipped = $state(0);

	// The learner's choices. They get good defaults when a file or a table is chosen (in the
	// event handlers, not in an effect – an effect writing what it reads runs again and again).
	let tableIndex = $state(0);
	let scopeIndex = $state(0);
	let front = $state(0);
	let back = $state(1);

	const table = $derived(tables.at(tableIndex));
	const scopes = $derived(table ? scopesOf(table) : []);
	const result = $derived(
		table && tableToDraft(table, { front, back, scope: scopes[scopeIndex]?.path ?? [] })
	);

	/** counts the files chosen: if a second one is chosen while the first is read, it wins */
	let chosen = 0;

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	async function choose(event) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = ''; // allow choosing the same file again
		if (!file) return;
		const ticket = ++chosen;
		reading = true;
		error = '';
		tables = [];
		try {
			const read = await readFile(file);
			if (ticket !== chosen) return;
			tables = read.tables;
			skipped = read.skipped;
			pickTable(0);
		} catch (e) {
			if (ticket !== chosen) return;
			if (!(e instanceof ImportError)) console.error(e);
			error = e instanceof ImportError ? e.message : 'Diese Datei konnte ich nicht lesen. 😕';
		} finally {
			if (ticket === chosen) reading = false;
		}
	}

	/** @param {number} index */
	function pickTable(index) {
		tableIndex = index;
		scopeIndex = 0;
		({ front, back } = guessColumns(tables[index]));
	}

	/**
	 * A column's name with its first text, so it is clear what is in it: "Vorderseite – avus".
	 * @param {ImportTable} table
	 * @param {number} column
	 */
	function columnLabel(table, column) {
		const text = table.rows.find((row) => row.cells[column])?.cells[column] ?? '';
		const short = text.length > 24 ? `${text.slice(0, 23)}…` : text;
		return short ? `${table.columns[column]} – ${short}` : table.columns[column];
	}
</script>

<div class="card form">
	<label class="button primary pick">
		Anki-Deck wählen 📂
		<!-- No "accept": iOS greys out files with unknown endings like .apkg, Android does not
		     filter by them anyway, and a list of known types alone would grey out the decks.
		     files.js recognises the format by the content. -->
		<input type="file" onchange={choose} disabled={reading} />
	</label>
	<p class="hint muted">
		Fertige Decks gibt es z. B. auf
		<a href="https://ankiweb.net/shared/decks" target="_blank" rel="noopener">ankiweb.net</a> – herunterladen
		und hier auswählen.
	</p>
</div>

{#if reading}
	<p class="card status" role="status">⏳ Lese die Datei …</p>
{:else if error}
	<p class="card error" role="alert">{error}</p>
{/if}

{#if table && result}
	<form class="card form choices" onsubmit={(event) => event.preventDefault()}>
		{#if tables.length > 1}
			<label>
				Karten
				<select
					value={tableIndex}
					onchange={(event) => pickTable(Number(event.currentTarget.value))}
				>
					{#each tables as { id, title, rows }, i (id)}
						<option value={i}>{title} ({rows.length})</option>
					{/each}
				</select>
			</label>
		{/if}

		{#if scopes.length > 1}
			<label>
				Teil des Decks
				<select bind:value={scopeIndex}>
					{#each scopes as { path, count }, i (i)}
						<!-- indented by level, like the deck list in Anki -->
						<option value={i}>
							{path.length ? `${'  '.repeat(path.length - 1)}${path.at(-1)}` : 'Ganzes Deck'} ({count})
						</option>
					{/each}
				</select>
			</label>
		{/if}

		<div class="columns">
			<label>
				Vokabel
				<select bind:value={front}>
					{#each table.columns as _, i (i)}
						<option value={i}>{columnLabel(table, i)}</option>
					{/each}
				</select>
			</label>
			<label>
				Bedeutung
				<select bind:value={back}>
					{#each table.columns as _, i (i)}
						<option value={i}>{columnLabel(table, i)}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if skipped > 0}
			<p class="hint muted">
				🙈 {skipped}
				{skipped === 1 ? 'Karte kann' : 'Karten kann'} ich nicht abfragen (Lückentext oder Bild).
			</p>
		{/if}
		{#if result.empty > 0}
			<p class="hint muted">
				{result.empty}
				{result.empty === 1 ? 'Karte hat' : 'Karten haben'} keine Vokabel oder Bedeutung und
				{result.empty === 1 ? 'fehlt' : 'fehlen'}.
			</p>
		{/if}
	</form>

	<!-- a new deck starts with its own guess of the language; another part keeps the choice -->
	{#key table.id}
		<DraftPreview draft={result.draft} />
	{/key}
{/if}

<style>
	.form {
		display: grid;
		gap: var(--gap);
	}

	/* one line down to 280 px */
	.pick {
		min-height: 3.5rem;
		font-size: clamp(0.75rem, 4.4vw, 1.1rem);
		white-space: nowrap;

		input {
			display: none;
		}
	}

	.hint {
		margin: -0.5rem 0 0;
		font-size: 0.9rem;
	}

	.status,
	.error,
	.choices {
		margin-top: var(--gap);
	}

	.status {
		text-align: center;
	}

	/* word and meaning side by side where there is room */
	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
		gap: var(--gap);
	}
</style>
