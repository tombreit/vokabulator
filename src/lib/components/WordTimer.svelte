<!--
  ⏱️ Time for one word: a thin bar along the bottom of the question card that runs down
  while the question is open (`running`). It turns red in the last third.
  `left` (milliseconds) is bound by the page, which resets it for every word and turns
  what is left into a speed bonus.
-->
<script>
	/**
	 * @type {{ left: number, total: number, running: boolean, ontimeout: () => void }}
	 */
	let { left = $bindable(), total, running, ontimeout } = $props();

	$effect(() => {
		if (!running) return;
		let last = performance.now();
		const timer = setInterval(() => {
			const now = performance.now();
			left = Math.max(0, left - (now - last));
			last = now;
			if (left === 0) {
				clearInterval(timer);
				ontimeout();
			}
		}, 100);
		return () => clearInterval(timer);
	});

	const share = $derived(total ? left / total : 0);
</script>

<div
	class="timer"
	class:hurry={share < 1 / 3}
	role="progressbar"
	aria-label="Zeit für diese Vokabel"
	aria-valuemin="0"
	aria-valuemax={total / 1000}
	aria-valuenow={Math.ceil(left / 1000)}
>
	<div class="fill" style:width="{share * 100}%"></div>
</div>

<style>
	.timer {
		position: absolute;
		inset: auto 0 0;
		height: 6px;
		background: rgb(0 0 0 / 0.12);
	}

	.fill {
		height: 100%;
		background: var(--accent);
		transition: width 0.1s linear;

		.hurry & {
			background: #c0392b;
		}
	}
</style>
