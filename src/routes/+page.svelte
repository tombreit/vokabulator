<!-- Start page: the list of all learning units on this device. -->
<script>
	import { resolve } from '$app/paths';
	import { LANGS } from '#lib/model.js';
	import { loadUnits } from '#lib/storage.js';

	const units = loadUnits();
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
					<span>
						<strong>{unit.title}</strong><br />
						<span class="muted">{unit.entries.length} Wörter</span>
					</span>
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

	.new {
		width: 100%;
		margin-top: 1rem;
	}
</style>
