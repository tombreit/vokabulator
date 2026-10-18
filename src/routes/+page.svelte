<!--
  Start page, like the title screen of the game: logo with a yellow splash text,
  the learner's level and days survived, the big scan button, and "Meine Welten" –
  every learning unit is a world, shown with the best ore found in it so far.
-->
<script>
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import { canScanQr } from '#lib/components/QrScanner.svelte';
	import Sprite from '#lib/components/Sprite.svelte';
	import XpBar from '#lib/components/XpBar.svelte';
	import { ADVANCEMENTS } from '#lib/learn/advancements.js';
	import { splash } from '#lib/learn/feedback.js';
	import { BOX_COUNT, learnedShare, oreOf, progressOf } from '#lib/learn/leitner.js';
	import { currentDays, localDay } from '#lib/learn/streak.js';
	import { LANGS } from '#lib/model.js';
	import { loadProgress, loadStats, loadUnits } from '#lib/storage.js';

	const stats = loadStats();
	const days = currentDays(stats.days, localDay());
	const splashText = splash();
	const unlocked = ADVANCEMENTS.filter((a) => stats.advancements[a.id]).length;

	const worlds = loadUnits().map((unit) => {
		const progress = loadProgress(unit.id);
		const boxes = unit.entries.map((e) => progressOf(progress, e.id).box);
		return {
			...unit,
			learned: learnedShare(unit.entries, progress),
			bestOre: oreOf(Math.max(1, ...boxes)),
			diamonds: boxes.filter((box) => box === BOX_COUNT).length,
			highscore: stats.highscores[unit.id] ?? 0
		};
	});
</script>

<section class="title">
	<!-- "VOKABVLATOR": Roman inscriptions write U as V -->
	<h1 class="logo" aria-label="Vokabulator">VOKABVLATOR</h1>
	<p class="splash" aria-hidden="true">{splashText}</p>
</section>

<div class="status">
	<span class="days">
		<Sprite name="sun" size={32} />
		{days > 0 ? `${days} ${days === 1 ? 'Tag' : 'Tage'} überlebt` : 'Tag 1 – leg los!'}
	</span>
	<div class="level"><XpBar xp={stats.xp} /></div>
</div>

<a class="button primary scan" href={resolve('/neu')}>
	<Sprite name="pickaxe" size={32} />
	{canScanQr ? 'QR-Code scannen' : 'Neue Welt anlegen'}
</a>

<h2>Meine Welten</h2>

{#if worlds.length === 0}
	<p class="card read">
		Noch keine Welt. {canScanQr
			? 'Scanne den QR-Code neben den Vokabeln in deinem Buch'
			: 'Gib den Mediencode aus deinem Buch ein'} – und aus jeder Vokabel wird mit der Zeit ein Diamant.
	</p>
{:else}
	<ul class="worlds">
		{#each worlds as world (world.id)}
			<li>
				<a class="world" href={resolve('/einheit/[id]', { id: world.id })}>
					<Sprite name={world.bestOre.sprite} size={56} label="Bestes Erz: {world.bestOre.name}" />
					<span class="info">
						<strong>{world.title}</strong>
						<span class="details">
							{LANGS[world.lang].name}, {world.entries.length} Vokabeln
						</span>
						<span class="details">
							<Sprite name="diamond" size={16} />
							{world.diamonds}
							{world.diamonds === 1 ? 'Diamant' : 'Diamanten'}
							{#if world.highscore}
								<Sprite name="xp" size={16} /> Rekord {world.highscore} XP
							{/if}
						</span>
						<ProgressBar value={world.learned} label="Anteil gelernter Wörter" />
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<div class="more">
	{#if canScanQr}
		<a class="button" href={resolve('/neu')}>Code, PDF oder Text</a>
	{/if}
	<a class="button" href={resolve('/fortschritte')}>
		<Sprite name="book" size={24} /> Fortschritte {unlocked}/{ADVANCEMENTS.length}
	</a>
</div>

<style>
	/* --- title: stone logo + splash ------------------------------------------------ */
	.title {
		position: relative;
		margin: 0.5rem 0 2.5rem;
		text-align: center;
	}

	.logo {
		margin: 0;
		font-size: clamp(1.9rem, 9.5vw, 3rem);
		font-weight: 700;
		letter-spacing: 0;
		/* stone texture inside the letters, a dark block edge below them */
		background: var(--stone) 0 0 / 32px 32px;
		background-clip: text;
		color: transparent;
		text-shadow: none;
		filter: drop-shadow(0 3px 0 #3a3a3a) drop-shadow(0 3px 0 #1c1c1c) drop-shadow(2px 2px 0 #000);
	}

	.splash {
		position: absolute;
		right: 0;
		bottom: -1.1rem;
		margin: 0;
		color: var(--yellow);
		font-weight: 700;
		font-size: 1rem;
		text-shadow: 2px 2px 0 #3f3f15;
		transform: rotate(-12deg);
		animation: splash 0.45s ease-in-out infinite alternate;
	}

	@keyframes splash {
		to {
			transform: rotate(-12deg) scale(1.08);
		}
	}

	/* --- status ---------------------------------------------------------------------- */
	.status {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: end;
		gap: 1rem;
		margin-bottom: var(--gap);
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
		font-size: 1.3rem;
	}

	/* --- world list: like the world selection of the game -------------------------- */
	.worlds {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.5rem;
	}

	.world {
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
		gap: 0.3rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.more {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;

		.button {
			flex: 1;
		}
	}
</style>
