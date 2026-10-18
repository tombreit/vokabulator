<!--
  ⏱️ Chess clock: a time budget for the whole round that only runs while a question
  is open (`running`), like a chess clock that stops when it is not your turn.
  `left` (milliseconds) is bound by the page, which turns what is left into bonus points.
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

	const seconds = $derived(Math.ceil(left / 1000));
	const text = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
</script>

<div class="clock" class:hurry={seconds <= 10} class:paused={!running} title="Restzeit der Runde">
	⏱️ <span>{text}</span>
	<div class="bar" style:width="{(left / total) * 100}%"></div>
</div>

<style>
	.clock {
		position: relative;
		overflow: hidden;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: var(--surface-2);
		font-weight: 700;
		font-variant-numeric: tabular-nums;

		span {
			position: relative;
			z-index: 1;
		}

		.bar {
			position: absolute;
			inset: 0 auto 0 0;
			background: color-mix(in srgb, var(--accent) 25%, transparent);
			transition: width 0.1s linear;
		}

		&.hurry {
			color: var(--bad);
			animation: pulse 1s ease-in-out infinite;
		}

		&.paused {
			opacity: 0.6;
			animation: none;
		}
	}

	@keyframes pulse {
		50% {
			transform: scale(1.08);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.clock.hurry {
			animation: none;
		}
	}
</style>
