<!--
  Optionen (settings): sounds on/off, and the chest – back up and restore all worlds, progress,
  XP and advancements (e.g. for a new phone).
-->
<script>
	import Sprite from '#lib/components/Sprite.svelte';
	import { play } from '#lib/sound.js';
	import {
		exportBackup,
		importBackup,
		loadSettings,
		loadUnits,
		saveSettings
	} from '#lib/storage.js';

	let unitCount = $state(loadUnits().length);
	let sound = $state(loadSettings().sound);

	function toggleSound() {
		sound = !sound;
		saveSettings({ ...loadSettings(), sound });
		play('xp'); // a sample – only audible when switched on
	}
	let message = $state('');
	let persisted = $state(false);
	navigator.storage.persisted().then((value) => (persisted = value));

	function download() {
		const json = JSON.stringify(exportBackup(), null, 2);
		const link = document.createElement('a');
		link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
		link.download = `vokabulator-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(link.href);
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	async function restore(event) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = ''; // allow choosing the same file again
		if (!file) return;
		try {
			const count = importBackup(JSON.parse(await file.text()));
			unitCount = loadUnits().length;
			message = `✅ ${count} ${count === 1 ? 'Lektion' : 'Lektionen'} wiederhergestellt.`;
		} catch (error) {
			message = `❌ ${error instanceof SyntaxError ? 'Die Datei ist kaputt.' : /** @type {Error} */ (error).message}`;
		}
	}
</script>

<h1>Optionen</h1>

<button
	class="button option"
	onclick={toggleSound}
	aria-label="Sounds: {sound ? 'An' : 'Aus'} – tippen zum Wechseln"
>
	Sounds: <span class="value">{sound ? 'An' : 'Aus'}</span>
</button>

<section class="card">
	<h2><Sprite name="chest" size={32} /> Sicherung</h2>
	<p class="read">
		Deine {unitCount}
		{unitCount === 1 ? 'Lektion' : 'Lektionen'}, dein Lernstand, deine XP und Erfolge liegen nur auf
		diesem Gerät. Mit einer Sicherungsdatei nimmst du alles auf ein neues Handy mit.
	</p>
	<div class="buttons">
		<button class="button" onclick={download} disabled={unitCount === 0}>
			Sicherung speichern
		</button>
		<label class="button">
			Sicherung laden
			<input type="file" accept="application/json,.json" onchange={restore} />
		</label>
	</div>
	{#if message}<p role="status">{message}</p>{/if}
	<p class="muted small read">
		{persisted
			? '🔒 Der Browser löscht deine Daten nicht von selbst.'
			: 'ℹ️ Tipp: Installiere Vokabulator („Zum Startbildschirm hinzufügen“), dann bleiben deine Daten sicher gespeichert.'}
	</p>
</section>

<style>
	.option {
		width: 100%;
		margin-bottom: var(--gap);
	}

	.value {
		color: var(--yellow);
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	label.button {
		font-weight: 600;

		input {
			display: none;
		}
	}

	.small {
		font-size: 0.9rem;
	}
</style>
