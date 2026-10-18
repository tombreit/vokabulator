<!-- Settings: back up and restore all learning units (e.g. for a new phone). -->
<script>
	import { exportBackup, importBackup, loadUnits } from '#lib/storage.js';

	let unitCount = $state(loadUnits().length);
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
			message = `✅ ${count} Lerneinheiten wiederhergestellt.`;
		} catch (error) {
			message = `❌ ${error instanceof SyntaxError ? 'Die Datei ist kaputt.' : /** @type {Error} */ (error).message}`;
		}
	}
</script>

<h1>Einstellungen</h1>

<section class="card">
	<h2>💾 Sicherung</h2>
	<p>
		Deine {unitCount} Lerneinheiten und dein Lernstand liegen nur auf diesem Gerät. Mit einer Sicherungsdatei
		kannst du sie auf ein neues Handy mitnehmen.
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
	<p class="muted small">
		{persisted
			? '🔒 Der Browser löscht deine Daten nicht von selbst.'
			: 'ℹ️ Tipp: Installiere Vokabulator („Zum Startbildschirm hinzufügen“), dann bleiben deine Daten sicher gespeichert.'}
	</p>
</section>

<style>
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
