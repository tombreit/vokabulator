<!-- A horizontal bar, `value` from 0 to 1 – a black-framed slot that fills with grass green. -->
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
		height: 12px;
		border: 2px solid #000;
		background: var(--surface-2);
	}

	.fill {
		height: 100%;
		background: linear-gradient(#6fbf4a 0 35%, var(--accent) 35%);
		transition: width 0.3s ease-out;
	}
</style>
