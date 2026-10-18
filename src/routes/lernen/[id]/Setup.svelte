<!--
  Before a round: the start button first (one tap after an import), below it an
  options screen like in the game – every button shows "Name: value" and switches
  to the next value when tapped.
-->
<script module>
	/**
	 * The choices for a round. The page owns them (they survive "Neue Runde").
	 * @typedef {Pick<import('#lib/storage.js').Settings, 'direction' | 'roundSize' | 'mode' | 'clock'> & { sections: number[], onlyHard: boolean }} Options
	 */
</script>

<script>
	import Sprite from '#lib/components/Sprite.svelte';
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

	/**
	 * Every option: its values in order, each with how it reads.
	 * @type {Record<'mode' | 'direction' | 'roundSize' | 'clock', [string | number, string][]>}
	 */
	const choices = $derived({
		mode: [
			['cards', 'Karteikarte'],
			['typing', 'Tippen'],
			['choice', 'Auswahl']
		],
		direction: [
			['front-back', `${langName} → Deutsch`],
			['back-front', `Deutsch → ${langName}`],
			['mixed', 'Gemischt']
		],
		roundSize: [
			[10, '10'],
			[20, '20'],
			[0, 'Alle']
		],
		clock: [
			[0, 'Aus'],
			[60, '1 Minute'],
			[180, '3 Minuten'],
			[300, '5 Minuten']
		]
	});

	/**
	 * Switch an option to its next value.
	 * @param {keyof typeof choices} key
	 */
	function cycle(key) {
		const list = choices[key];
		const at = list.findIndex(([value]) => value === options[key]);
		/** @type {Record<string, unknown>} */ (options)[key] = list[(at + 1) % list.length][0];
	}

	/** @param {keyof typeof choices} key */
	function label(key) {
		return choices[key].find(([value]) => value === options[key])?.[1] ?? '';
	}

	/** @param {number} i */
	function toggleSection(i) {
		options.sections = options.sections.includes(i)
			? options.sections.filter((s) => s !== i)
			: [...options.sections, i].toSorted((a, b) => a - b);
	}
</script>

{#snippet option(
	/** @type {string} */ name,
	/** @type {string} */ value,
	/** @type {() => void} */ onclick
)}
	<button class="button option" {onclick} aria-label="{name}: {value} – tippen zum Wechseln">
		{name}: <span class="value">{value}</span>
	</button>
{/snippet}

<button class="button primary start" disabled={count === 0} onclick={onstart}>
	<Sprite name="pickaxe" size={32} /> Los geht's ({count})
</button>

<div class="options">
	{@render option('Modus', label('mode'), () => cycle('mode'))}
	{@render option('Richtung', label('direction'), () => cycle('direction'))}
	{@render option('Vokabeln', label('roundSize'), () => cycle('roundSize'))}
	{@render option('Schachuhr', label('clock'), () => cycle('clock'))}
	{@render option('Nur schwere ⭐', options.onlyHard ? 'An' : 'Aus', () => {
		options.onlyHard = !options.onlyHard;
	})}
</div>

{#if unit.sections.length > 1}
	<h2>Abschnitte</h2>
	<div class="options">
		{#each unit.sections as section, i (i)}
			{@render option(
				`${section.title} (${section.entryIds.length})`,
				options.sections.includes(i) ? 'An' : 'Aus',
				() => toggleSection(i)
			)}
		{/each}
	</div>
{/if}

<style>
	/* one column on phones, two on wider screens – like the game's options menu */
	.options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
		gap: 6px;
		margin-bottom: var(--gap);
	}

	.value {
		color: var(--yellow);
	}

	h2 {
		font-size: 1.1rem;
		margin-top: 0.5rem;
	}

	.start {
		width: 100%;
		min-height: 4rem;
		margin-bottom: var(--gap);
		font-size: clamp(1.05rem, 5vw, 1.25rem);
		white-space: nowrap;
	}
</style>
