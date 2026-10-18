<!-- Before a round: how to learn (mode, direction), which words and how many. -->
<script module>
	/**
	 * The choices for a round. The page owns them (they survive "Neue Runde").
	 * @typedef {Pick<import('#lib/storage.js').Settings, 'direction' | 'roundSize' | 'mode'> & { sections: number[], onlyHard: boolean }} Options
	 */
</script>

<script>
	import { LANGS } from '#lib/model.js';

	/**
	 * @type {{
	 *   options: Options,
	 *   unit: import('#lib/model.js').Unit,
	 *   available: number,
	 *   onstart: () => void
	 * }}
	 * available: how many words the chosen sections (and "only hard") contain
	 */
	let { options = $bindable(), unit, available, onstart } = $props();

	const langName = $derived(LANGS[unit.lang].name);
	const count = $derived(options.roundSize ? Math.min(options.roundSize, available) : available);
</script>

<div class="card setup">
	<fieldset class="pills">
		<legend>Wie willst du üben?</legend>
		<label><input type="radio" bind:group={options.mode} value="cards" />🃏 Karteikarte</label>
		<label><input type="radio" bind:group={options.mode} value="typing" />⌨️ Tippen</label>
		<label><input type="radio" bind:group={options.mode} value="choice" />🔘 Auswahl</label>
	</fieldset>

	<fieldset class="pills">
		<legend>Richtung</legend>
		<label>
			<input type="radio" bind:group={options.direction} value="front-back" />{langName} → Deutsch
		</label>
		<label>
			<input type="radio" bind:group={options.direction} value="back-front" />Deutsch → {langName}
		</label>
		<label><input type="radio" bind:group={options.direction} value="mixed" />Gemischt 🔀</label>
	</fieldset>

	<fieldset class="pills">
		<legend>Wie viele Wörter?</legend>
		{#each [10, 20, 0] as size (size)}
			<label
				><input type="radio" bind:group={options.roundSize} value={size} />{size || 'Alle'}</label
			>
		{/each}
	</fieldset>

	{#if unit.sections.length > 1}
		<fieldset>
			<legend>Abschnitte</legend>
			{#each unit.sections as section, i (i)}
				<label class="check">
					<input type="checkbox" bind:group={options.sections} value={i} />
					{section.title} <span class="muted">({section.entryIds.length})</span>
				</label>
			{/each}
		</fieldset>
	{/if}

	<label class="check">
		<input type="checkbox" bind:checked={options.onlyHard} /> Nur ⭐ schwere Wörter
	</label>
</div>

<button class="button primary big" disabled={count === 0} onclick={onstart}>
	Los geht's 🚀 <span class="count">({count} Wörter)</span>
</button>

<style>
	.setup {
		display: grid;
		gap: var(--gap);
		margin-bottom: var(--gap);
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.4rem;
	}

	legend {
		font-weight: 700;
		margin-bottom: 0.4rem;
	}

	/* Radio buttons shown as tappable pills */
	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;

		label {
			display: block;
			padding: 0.6rem 0.9rem;
			border: 1px solid var(--line);
			border-radius: 999px;
			font-weight: 600;
			cursor: pointer;

			&:has(input:checked) {
				background: var(--accent);
				border-color: var(--accent);
				color: var(--accent-text);
			}
		}

		input {
			position: absolute;
			opacity: 0;
			pointer-events: none;
		}
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 400;
		min-height: 2.5rem;

		input {
			width: 1.3rem;
			height: 1.3rem;
		}
	}

	.big {
		width: 100%;
		min-height: 3.75rem;
		font-size: 1.15rem;
	}

	.count {
		font-weight: 400;
		opacity: 0.85;
	}
</style>
