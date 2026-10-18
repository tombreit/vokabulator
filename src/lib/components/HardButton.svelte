<!--
  Mark a word as hard – heavy as an anvil. Hard words are asked more often and can be
  practised on their own ("Nur schwere"). Not marked: the anvil is only a faint outline.
-->
<script>
	import Sprite from './Sprite.svelte';

	/** @type {{ hard: boolean, ontoggle: () => void }} */
	let { hard, ontoggle } = $props();
</script>

<button
	class="hard"
	aria-label="Als schwer markieren"
	title={hard ? 'Schwer – kommt öfter dran' : 'Als schwer markieren'}
	aria-pressed={hard}
	onclick={ontoggle}
>
	<Sprite name="anvil" size={28} />
</button>

<style>
	.hard {
		display: grid;
		place-items: center;
		min-width: var(--tap);
		min-height: var(--tap);
		border: none;
		background: none;
		cursor: pointer;

		&[aria-pressed='false'] :global(.sprite) {
			opacity: 0.3;
			filter: grayscale(1);
		}
	}
</style>
