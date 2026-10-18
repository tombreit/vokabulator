<!--
  🎉 A short burst of confetti in the app's colours – for a new record or a perfect round.
  Nothing happens for people who asked their phone for less motion.
-->
<script>
	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();

	$effect(() => {
		if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

		const width = innerWidth;
		const height = innerHeight;
		canvas.width = width * devicePixelRatio;
		canvas.height = height * devicePixelRatio;
		context.scale(devicePixelRatio, devicePixelRatio);

		const style = getComputedStyle(document.documentElement);
		const colors = ['--star', '--accent', '--good', '--scratch', '--bad'].map((name) =>
			style.getPropertyValue(name)
		);
		const pieces = Array.from({ length: 140 }, () => ({
			x: width / 2 + (Math.random() - 0.5) * width * 0.2,
			y: height * 0.3,
			vx: (Math.random() - 0.5) * 14,
			vy: -Math.random() * 14 - 5,
			size: 6 + Math.random() * 6,
			angle: Math.random() * Math.PI,
			spin: (Math.random() - 0.5) * 0.3,
			color: colors[Math.floor(Math.random() * colors.length)]
		}));

		const duration = 2600;
		const start = performance.now();
		let frame = requestAnimationFrame(function draw(now) {
			const progress = (now - start) / duration;
			context.clearRect(0, 0, width, height);
			context.globalAlpha = Math.max(0, 1 - progress ** 3);
			for (const piece of pieces) {
				piece.vy += 0.35; // gravity
				piece.vx *= 0.99; // air
				piece.x += piece.vx;
				piece.y += piece.vy;
				piece.angle += piece.spin;
				context.save();
				context.translate(piece.x, piece.y);
				context.rotate(piece.angle);
				context.fillStyle = piece.color;
				context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
				context.restore();
			}
			if (progress < 1) frame = requestAnimationFrame(draw);
		});

		return () => cancelAnimationFrame(frame);
	});
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 10;
	}
</style>
