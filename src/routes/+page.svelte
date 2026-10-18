<!--
  Start page: days in a row and level, the big scan button, and "Meine Lektionen" –
  every unit with how much of it is learned (the name and splash text sit in +layout.svelte).
-->
<script>
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import { canScanQr } from '#lib/components/QrScanner.svelte';
	import Sprite from '#lib/components/Sprite.svelte';
	import XpBar from '#lib/components/XpBar.svelte';
	import { BOX_COUNT, learnedShare, progressOf } from '#lib/learn/leitner.js';
	import { currentDays, localDay } from '#lib/learn/streak.js';
	import { LANGS } from '#lib/model.js';
	import { loadProgress, loadStats, loadUnits } from '#lib/storage.js';

	const stats = loadStats();
	const days = currentDays(stats.days, localDay());

	const units = loadUnits().map((unit) => {
		const progress = loadProgress(unit.id);
		return {
			...unit,
			learned: learnedShare(unit.entries, progress),
			/** words on the last stage (the diamond) */
			mastered: unit.entries.filter((e) => progressOf(progress, e.id).box === BOX_COUNT).length,
			highscore: stats.highscores[unit.id] ?? 0
		};
	});
</script>

<div class="status">
	<span class="days">
		<Sprite name="sun" size={32} />
		{days > 0 ? `${days} ${days === 1 ? 'Tag' : 'Tage'} in Folge` : 'Tag 1 – leg los!'}
	</span>
	<div class="level"><XpBar xp={stats.xp} /></div>
</div>

<a class="button primary scan" href={resolve('/neu')}>
	<Sprite name="pickaxe" size={32} />
	{canScanQr ? 'QR-Code scannen' : 'Neue Lektion anlegen'}
</a>

<h1>Meine Lektionen</h1>

{#if units.length === 0}
	<p class="card read">
		Noch keine Lektion. {canScanQr
			? 'Scanne den QR-Code neben den Vokabeln in deinem Buch'
			: 'Gib den Mediencode aus deinem Buch ein'} – dann kannst du sofort loslegen.
	</p>
{:else}
	<ul class="units">
		{#each units as unit (unit.id)}
			<li>
				<a class="unit" href={resolve('/einheit/[id]', { id: unit.id })}>
					<Sprite name="book" size={48} />
					<span class="info">
						<strong>{unit.title}</strong>
						<span class="details">
							{LANGS[unit.lang].name}, {unit.entries.length} Vokabeln
						</span>
						<span class="details">
							<span class="detail"
								><Sprite name="diamond" size={16} /> {unit.mastered} sicher gelernt</span
							>
							{#if unit.highscore}
								<span class="detail"><Sprite name="xp" size={16} /> Rekord {unit.highscore} XP</span
								>
							{/if}
						</span>
						<ProgressBar value={unit.learned} label="Anteil gelernter Wörter" />
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	/* --- status ---------------------------------------------------------------------- */
	/* days and level side by side – the level bar takes its own line on small screens */
	.status {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.5rem 1rem;
		margin-bottom: var(--gap);
	}

	.level {
		flex: 1 1 9rem;
	}

	.days {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 600;
	}

	.scan {
		width: 100%;
		min-height: 4rem;
		margin-bottom: 1.5rem;
		font-size: clamp(1.05rem, 5vw, 1.3rem);
		white-space: nowrap;
	}

	/* --- lesson list ------------------------------------------------------------------ */
	.units {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.5rem;
	}

	.unit {
		display: flex;
		gap: 0.8rem;
		align-items: center;
		padding: 0.5rem;
		border: 2px solid transparent;
		background: rgb(0 0 0 / 0.55);
		color: inherit;
		text-decoration: none;

		&:hover,
		&:focus-visible {
			border-color: #fff;
		}
	}

	.info {
		flex: 1;
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}

	.details {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.2rem 0.8rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.detail {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
</style>
