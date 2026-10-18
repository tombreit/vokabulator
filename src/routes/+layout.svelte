<script>
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { migrate } from '#lib/storage.js';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	migrate();
	// Ask the browser not to clear our localStorage when space gets low.
	// Chrome grants this silently, e.g. once the app is installed.
	navigator.storage.persist();

	// Page changes cross-fade (View Transitions API; timing in app.css).
	onNavigate((navigation) => {
		return new Promise((resolveTransition) => {
			document.startViewTransition(async () => {
				resolveTransition();
				await navigation.complete;
			});
		});
	});
</script>

<header>
	<!-- "VOKABVLATOR": Roman inscriptions write U as V -->
	<a class="wordmark" href={resolve('/')} aria-label="Vokabulator – Startseite">VOKABVLATOR</a>
	<a class="settings" href={resolve('/einstellungen')} aria-label="Einstellungen">⚙️</a>
</header>

<main>
	{@render children()}
</main>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 40rem;
		margin-inline: auto;
		padding: 0.9rem 1rem 0.6rem;

		a {
			color: inherit;
			text-decoration: none;
		}
	}

	.wordmark {
		font-family: var(--font-inscription);
		font-size: 1.2rem;
		letter-spacing: 0.14em;
	}

	.settings {
		display: grid;
		place-items: center;
		min-width: var(--tap);
		min-height: var(--tap);
		font-size: 1.3rem;
	}

	main {
		max-width: 40rem;
		margin-inline: auto;
		padding: 0 1rem 3rem;
	}
</style>
