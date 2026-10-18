<!--
  Camera view that reads QR codes with the browser's built-in BarcodeDetector
  (Chrome on Android – no library needed). Calls `onscan(text)` for every new code
  it sees. The camera is switched off as soon as the component disappears.
-->
<script module>
	/** Can this browser read QR codes from the camera? (false e.g. in Chrome on Linux desktops) */
	export const canScanQr = 'BarcodeDetector' in globalThis && 'mediaDevices' in navigator;
</script>

<script>
	/** @type {{ onscan: (text: string) => void }} */
	let { onscan } = $props();

	/** @type {HTMLVideoElement | undefined} */
	let video = $state();
	let error = $state('');

	$effect(() => {
		let stopped = false;
		let frame = 0;
		let lastText = '';
		/** @type {MediaStream | undefined} */
		let stream;

		start();

		async function start() {
			if (!(await BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
				error = 'Dieser Browser kann leider keine QR-Codes lesen. Tippe den Code einfach ein. 🔢';
				return;
			}
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' }, // the back camera
					audio: false
				});
			} catch (e) {
				error =
					/** @type {Error} */ (e).name === 'NotAllowedError'
						? 'Ohne Kamera-Erlaubnis kann ich nicht scannen. 📷 Erlaube die Kamera in den Einstellungen von Chrome – oder tippe den Code ein.'
						: 'Die Kamera lässt sich gerade nicht starten. 📷 Tippe den Code einfach ein.';
				return;
			}
			if (stopped || !video) return stopCamera();
			video.srcObject = stream;
			await video.play();
			scan(new BarcodeDetector({ formats: ['qr_code'] }));
		}

		/** Look at the current camera frame, then again at the next one. @param {BarcodeDetector} detector */
		async function scan(detector) {
			if (stopped || !video) return;
			const codes = await detector.detect(video).catch(() => []);
			const text = codes[0]?.rawValue;
			if (text && text !== lastText) {
				lastText = text;
				navigator.vibrate(80);
				onscan(text);
			}
			frame = requestAnimationFrame(() => scan(detector));
		}

		function stopCamera() {
			for (const track of stream?.getTracks() ?? []) track.stop();
		}

		return () => {
			stopped = true;
			cancelAnimationFrame(frame);
			stopCamera();
		};
	});
</script>

{#if error}
	<p class="card error" role="alert">{error}</p>
{:else}
	<div class="viewfinder">
		<video bind:this={video} muted playsinline></video>
		<div class="frame" aria-hidden="true"></div>
	</div>
	<p class="muted hint">Halte den QR-Code aus dem Buch in den Rahmen. 📖</p>
{/if}

<style>
	.viewfinder {
		position: relative;
		aspect-ratio: 1;
		border-radius: var(--radius);
		overflow: hidden;
		background: #000;
	}

	video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* a square in the middle that shows where the QR code should go */
	.frame {
		position: absolute;
		inset: 20%;
		border: 4px solid rgb(255 255 255 / 0.85);
		border-radius: calc(var(--radius) * 1.5);
		box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.35);
	}

	.hint {
		text-align: center;
	}

	.error {
		border-color: var(--bad);
	}
</style>
