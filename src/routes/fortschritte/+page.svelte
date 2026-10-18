<!-- All advancements: the unlocked ones with their date, the others greyed out as goals. -->
<script>
	import Sprite from '#lib/components/Sprite.svelte';
	import XpBar from '#lib/components/XpBar.svelte';
	import { ADVANCEMENTS } from '#lib/learn/advancements.js';
	import { loadStats } from '#lib/storage.js';

	const stats = loadStats();
	const unlockedCount = ADVANCEMENTS.filter((a) => stats.advancements[a.id]).length;

	/** "2026-10-18" → "18.10.2026" */
	const date = (/** @type {string} */ day) => day.split('-').reverse().join('.');
</script>

<h1>Fortschritte</h1>
<p class="muted">{unlockedCount} von {ADVANCEMENTS.length} erzielt</p>

<div class="level"><XpBar xp={stats.xp} /></div>

<ul class="advancements">
	{#each ADVANCEMENTS as advancement (advancement.id)}
		{@const day = stats.advancements[advancement.id]}
		<li class:locked={!day}>
			<span class="icon"><Sprite name={advancement.sprite} size={40} /></span>
			<span class="info">
				<strong>{advancement.title}</strong>
				<span class="read">{advancement.text}</span>
				{#if day}<span class="day">erzielt am {date(day)}</span>{/if}
			</span>
		</li>
	{/each}
</ul>

<style>
	.level {
		margin-bottom: var(--gap);
	}

	.advancements {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 6px;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.6rem;
		border: 2px solid #000;
		background: #212121;
		box-shadow: inset 0 0 0 2px #555;

		&.locked {
			background: rgb(0 0 0 / 0.45);
			box-shadow: inset 0 0 0 2px #333;
			color: var(--muted);

			.icon {
				filter: grayscale(1) brightness(0.55);
			}
			strong {
				color: var(--muted);
			}
		}
	}

	.info {
		display: grid;
		gap: 0.1rem;
	}

	strong {
		color: var(--yellow);
	}

	.read {
		font-size: 0.9rem;
	}

	.day {
		font-size: 0.8rem;
		color: var(--xp);
	}
</style>
