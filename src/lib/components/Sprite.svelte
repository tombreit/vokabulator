<!-- A pixel-art picture from #lib/pixel/sprites.js, drawn crisp at any size. -->
<script>
	import { spriteRuns } from '#lib/pixel/sprites.js';

	/**
	 * @type {{ name: string, size?: number, label?: string }}
	 * size: in CSS pixels (multiples of 16 look sharpest); label: for screen readers, else decorative
	 */
	let { name, size = 32, label = '' } = $props();

	const runs = $derived(spriteRuns(name));
</script>

<svg
	class="sprite"
	viewBox="0 0 16 16"
	width={size}
	height={size}
	shape-rendering="crispEdges"
	role={label ? 'img' : undefined}
	aria-label={label || undefined}
	aria-hidden={label ? undefined : 'true'}
>
	{#each runs as run, i (i)}
		<rect x={run.x} y={run.y} width={run.width} height="1" fill={run.color} />
	{/each}
</svg>

<style>
	.sprite {
		display: inline-block;
		flex-shrink: 0;
		vertical-align: middle;
	}
</style>
