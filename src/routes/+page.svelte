<!-- Start page: the list of all learning units on this device. -->
<script>
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import { canScanQr } from '#lib/components/QrScanner.svelte';
	import { learnedShare } from '#lib/learn/leitner.js';
	import { LANGS } from '#lib/model.js';
	import { loadProgress, loadUnits } from '#lib/storage.js';

	const units = loadUnits().map((unit) => ({
		...unit,
		learned: learnedShare(unit.entries, loadProgress(unit.id))
	}));
</script>

{#if canScanQr}
	<!-- the main way in: scan the QR code in the book (opens the "Scannen" tab) -->
	<a class="button primary scan" href={resolve('/neu')}>📷 QR-Code scannen</a>
{/if}

<h1>Meine Lerneinheiten</h1>

{#if units.length === 0}
	<p class="card">
		Noch nichts da. {canScanQr
			? 'Scanne den QR-Code neben den Vokabeln in deinem Buch'
			: 'Gib den Mediencode aus deinem Buch ein'} – und los geht's. 📚
	</p>
{:else}
	<ul class="units">
		{#each units as unit (unit.id)}
			<li>
				<a class="card" href={resolve('/einheit/[id]', { id: unit.id })}>
					<span class="flag">{LANGS[unit.lang].flag}</span>
					<div class="info">
						<strong>{unit.title}</strong>
						<span class="muted">
							{unit.entries.length} Wörter · {Math.round(unit.learned * 100)} % gelernt
						</span>
						<ProgressBar value={unit.learned} label="Anteil gelernter Wörter" />
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<a class="button new" class:primary={!canScanQr} href={resolve('/neu')}>
	＋ {canScanQr ? 'Code, PDF oder Text' : 'Neue Lerneinheit'}
</a>

<style>
	.units {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.6rem;

		a {
			display: flex;
			gap: 0.8rem;
			align-items: center;
			color: inherit;
			text-decoration: none;
		}
	}

	.flag {
		font-size: 1.8rem;
	}

	.info {
		flex: 1;
		display: grid;
		gap: 0.2rem;
	}

	.scan {
		width: 100%;
		min-height: 4.5rem;
		margin-bottom: 1.5rem;
		font-size: 1.3rem;
	}

	.new {
		width: 100%;
		margin-top: 1rem;
	}
</style>
