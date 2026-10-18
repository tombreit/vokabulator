<!-- ⭐ toggle to mark a word as hard (it will then be asked more often). -->
<script>
	import Sprite from './Sprite.svelte';

	/** @type {{ hard: boolean, ontoggle: () => void }} */
	let { hard, ontoggle } = $props();
</script>

<button class="star" aria-label="Als schwer markieren" aria-pressed={hard} onclick={ontoggle}>
	<Sprite name={hard ? 'star' : 'star_off'} size={28} />
</button>

<style>
	.star {
		display: grid;
		place-items: center;
		min-width: var(--tap);
		min-height: var(--tap);
		border: none;
		background: none;
		cursor: pointer;
	}
</style>
