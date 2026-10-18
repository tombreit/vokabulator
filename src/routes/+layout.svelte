<script>
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { migrate } from '#lib/storage.js';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	migrate();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<a href={resolve('/')}>Vokabulator 🧠</a>
</header>

<main>
	{@render children()}
</main>

<style>
	header {
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
