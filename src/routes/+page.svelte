<!-- Start page: the list of all learning units on this device. -->
<script>
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import { canScanQr } from '#lib/components/QrScanner.svelte';
	import { learnedShare } from '#lib/learn/leitner.js';
	import { currentDays, localDay } from '#lib/learn/streak.js';
	import { LANGS } from '#lib/model.js';
	import { loadProgress, loadStats, loadUnits } from '#lib/storage.js';

	const stats = loadStats();
	const days = currentDays(stats.days, localDay());
	const units = loadUnits().map((unit) => ({
		...unit,
		learned: learnedShare(unit.entries, loadProgress(unit.id)),
		highscore: stats.highscores[unit.id] ?? 0
	}));
</script>

{#if canScanQr}
	<!-- the main way in: scan the QR code in the book (opens the "Scannen" tab); a small wax tablet -->
	<a class="scan" href={resolve('/neu')}>
		<span class="scan-wax">📷 QR-Code aus dem Buch scannen</span>
	</a>
{/if}

<h1>Meine Lerneinheiten</h1>

{#if days > 0}
	<p class="days">🔥 {days} {days === 1 ? 'Tag' : 'Tage in Folge'} gelernt – bleib dran!</p>
{/if}

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
							{unit.entries.length} Wörter, {Math.round(unit.learned * 100)} % gelernt
						</span>
						<ProgressBar value={unit.learned} label="Anteil gelernter Wörter" />
					</div>
					{#if unit.highscore}
						<span class="highscore" title="Dein Rekord">🏆 {unit.highscore}</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}

<a class="button new" class:primary={!canScanQr} href={resolve('/neu')}>
	＋ {canScanQr ? 'Code, PDF oder Text' : 'Neue Lerneinheit'}
</a>

<style>
	.scan {
		display: block;
		margin: 0.5rem 0 1.75rem;
		padding: 8px;
		border-radius: 12px;
		background:
			repeating-linear-gradient(96deg, rgb(255 255 255 / 0.05) 0 2px, transparent 2px 11px),
			var(--wood);
		box-shadow: 0 8px 16px -10px rgb(60 30 0 / 0.7);
		text-decoration: none;
		transition: transform 0.08s ease-out;

		&:active {
			transform: scale(0.98);
		}
	}

	.scan-wax {
		display: grid;
		place-items: center;
		min-height: 5rem;
		padding: 1rem;
		border-radius: 6px;
		background: var(--wax);
		box-shadow: inset 0 3px 10px rgb(0 0 0 / 0.55);
		color: var(--scratch);
		font-size: 1.2rem;
		font-weight: 600;
		text-align: center;
	}

	.days {
		margin: -0.25rem 0 var(--gap);
		font-weight: 700;
	}

	.highscore {
		align-self: flex-start;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--star) 22%, transparent);
		color: var(--star-ink);
		font-weight: 700;
		font-size: 0.9rem;
		white-space: nowrap;
	}

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

	.new {
		width: 100%;
		margin-top: 1rem;
	}
</style>
