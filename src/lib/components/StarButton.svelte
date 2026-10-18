<!-- ⭐ toggle to mark a word as hard (it will then be asked more often). -->
<script>
	/** @type {{ hard: boolean, ontoggle: () => void }} */
	let { hard, ontoggle } = $props();
</script>

<button
	class="star"
	class:hard
	aria-label="Als schwer markieren"
	aria-pressed={hard}
	onclick={ontoggle}
>
	{hard ? '⭐' : '☆'}
</button>

<style>
	.star {
		min-width: var(--tap);
		min-height: var(--tap);
		border: none;
		background: none;
		font-size: 1.5rem;
		line-height: 1;
		color: var(--muted);
		cursor: pointer;
	}
</style>
