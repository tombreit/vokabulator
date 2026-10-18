<!-- A horizontal bar, `value` from 0 to 1. -->
<script>
	/** @type {{ value: number, label?: string }} */
	let { value, label = '' } = $props();

	const percent = $derived(Math.round(Math.min(Math.max(value, 0), 1) * 100));
</script>

<div
	class="bar"
	role="progressbar"
	aria-label={label}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={percent}
>
	<div class="fill" style:width="{percent}%"></div>
</div>

<style>
	.bar {
		height: 0.6rem;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: inherit;
		background: var(--accent);
		transition: width 0.3s ease;
	}
</style>
