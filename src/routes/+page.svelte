<!-- Start page: the list of all learning units on this device. -->
<script>
	import { resolve } from '$app/paths';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import { learnedShare } from '#lib/learn/leitner.js';
	import { LANGS } from '#lib/model.js';
	import { loadProgress, loadUnits } from '#lib/storage.js';

	const units = loadUnits().map((unit) => ({
		...unit,
		learned: learnedShare(unit.entries, loadProgress(unit.id))
	}));
</script>

<h1>Meine Lerneinheiten</h1>

{#if units.length === 0}
	<p class="card">
		Noch nichts da. Leg deine erste Lerneinheit an – z.&nbsp;B. indem du Vokabeln aus dem Buch
		eintippst. 📚
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

<a class="button primary new" href={resolve('/neu')}>＋ Neue Lerneinheit</a>

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

	.new {
		width: 100%;
		margin-top: 1rem;
	}
</style>
