<script>
	import '../app.css';
	import { resolve } from '$app/paths';
	import { migrate } from '#lib/storage.js';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	migrate();
	// Ask the browser not to clear our localStorage when space gets low.
	// Chrome grants this silently, e.g. once the app is installed.
	navigator.storage.persist();
</script>

<header>
	<a href={resolve('/')}>Vokabulator 🧠</a>
	<a href={resolve('/einstellungen')} aria-label="Einstellungen">⚙️</a>
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
		padding: 0.75rem 1rem;
		font-weight: 800;
		font-size: 1.15rem;

		a {
			color: inherit;
			text-decoration: none;
		}
	}

	main {
		max-width: 40rem;
		margin-inline: auto;
		padding: 0 1rem 3rem;
	}
</style>
