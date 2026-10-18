<!--
  Camera view that reads QR codes. Calls `onscan(text)` for every new code it sees.
  The camera is switched off as soon as the component disappears.

  The reader: the browser's own BarcodeDetector where it can read QR codes (Chrome on
  Android, macOS), everywhere else (Firefox, iPhone, Windows, Linux) the same interface
  from the barcode-detector package – ZXing compiled to WebAssembly, loaded only then
  and served from our own server.
-->
<script module>
	/** Can this browser use a camera at all? (true in every current browser over HTTPS) */
	export const canScanQr = 'mediaDevices' in navigator;

	/** @typedef {{ detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> }} QrReader */

	/** @returns {Promise<QrReader>} */
	async function qrReader() {
		if (
			'BarcodeDetector' in globalThis &&
			(await BarcodeDetector.getSupportedFormats()).includes('qr_code')
		) {
			return new BarcodeDetector({ formats: ['qr_code'] });
		}
		const [{ BarcodeDetector: ZXingDetector, prepareZXingModule }, { default: wasmUrl }] =
			await Promise.all([
				import('barcode-detector/ponyfill'),
				import('zxing-wasm/reader/zxing_reader.wasm?url')
			]);
		// load the .wasm from our own server (the package would fetch it from a CDN)
		prepareZXingModule({
			overrides: {
				locateFile: (/** @type {string} */ path, /** @type {string} */ prefix) =>
					path.endsWith('.wasm') ? wasmUrl : prefix + path
			}
		});
		return new ZXingDetector({ formats: ['qr_code'] });
	}
</script>

<script>
	/** @type {{ onscan: (text: string) => void }} */
	let { onscan } = $props();

	/** @type {HTMLVideoElement | undefined} */
	let video = $state();
	let error = $state('');

	$effect(() => {
		let stopped = false;
		let timer = 0;
		let lastText = '';
		/** @type {MediaStream | undefined} */
		let stream;

		start();

		async function start() {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' }, // the back camera on phones
					audio: false
				});
			} catch (e) {
				const name = /** @type {Error} */ (e).name;
				error =
					name === 'NotAllowedError'
						? 'Ohne Kamera-Erlaubnis kann ich nicht scannen. 📷 Erlaube die Kamera in den Browser-Einstellungen – oder tippe den Code ein.'
						: name === 'NotFoundError'
							? 'Hier gibt es keine Kamera. 📷 Tippe den Code einfach ein.'
							: 'Die Kamera lässt sich gerade nicht starten. 📷 Tippe den Code einfach ein.';
				return;
			}
			if (stopped || !video) return stopCamera();
			video.srcObject = stream;
			try {
				await video.play();
			} catch {
				return stopCamera(); // the learner left the page while the camera was starting
			}

			let reader;
			try {
				reader = await qrReader();
			} catch {
				stopCamera();
				error = 'Der QR-Leser lässt sich gerade nicht laden. 📡 Tippe den Code einfach ein.';
				return;
			}
			scan(reader);
		}

		/** Look at the current camera frame, then again a moment later. @param {QrReader} reader */
		async function scan(reader) {
			if (stopped || !video) return;
			const codes = await reader.detect(video).catch(() => []);
			const text = codes[0]?.rawValue;
			if (text && text !== lastText) {
				lastText = text;
				navigator.vibrate?.(80);
				onscan(text);
			}
			timer = window.setTimeout(() => scan(reader), 100); // ~10 looks per second is plenty
		}

		function stopCamera() {
			for (const track of stream?.getTracks() ?? []) track.stop();
		}

		return () => {
			stopped = true;
			clearTimeout(timer);
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
		border: 2px solid #000;
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
		box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.35);
	}

	.hint {
		text-align: center;
	}
</style>
