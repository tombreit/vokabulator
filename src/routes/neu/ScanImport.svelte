<!--
  Import method "Scannen": point the camera at the QR code in the book.
  A C.C.Buchner QR code contains https://ccbuchner.de/clip_code/<Mediencode>/;
  once one is recognised, the camera stops and the vocabulary is loaded.
-->
<script>
	import QrScanner from '#lib/components/QrScanner.svelte';
	import { parseMediencode } from '#lib/import/ccbuchner.js';
	import MediencodeLoader from './MediencodeLoader.svelte';

	/** the recognised Mediencode – while empty, the camera is on */
	let code = $state('');
	/** text of a QR code that is not a Mediencode */
	let foreign = $state('');

	/** @param {string} text */
	function scanned(text) {
		const parsed = parseMediencode(text);
		if (parsed) code = parsed;
		else foreign = text;
	}

	function scanAgain() {
		code = '';
		foreign = '';
	}
</script>

{#if code}
	<MediencodeLoader {code} />
	<button class="button again" onclick={scanAgain}>📷 Anderen Code scannen</button>
{:else}
	<QrScanner onscan={scanned} />
	{#if foreign}
		<p class="card notice" role="alert">
			🤔 Das ist kein Vokabel-Code von C.C.Buchner.<br />
			<span class="muted">Gelesen: {foreign}</span>
		</p>
	{/if}
{/if}

<style>
	.again {
		width: 100%;
		margin-top: var(--gap);
	}

	.notice {
		margin-top: var(--gap);
		border-color: var(--star);
		overflow-wrap: anywhere;
	}
</style>
