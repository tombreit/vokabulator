<script>
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import NavBar from '#lib/components/NavBar.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { spriteDataUri } from '#lib/pixel/sprites.js';
	import { migrate } from '#lib/storage.js';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	migrate();
	// Ask the browser not to clear our localStorage when space gets low.
	// Chrome grants this silently, e.g. once the app is installed.
	navigator.storage.persist();

	// The pixel textures used by app.css (dirt background, grass edge, stone logo).
	for (const name of ['dirt', 'grass', 'stone']) {
		document.documentElement.style.setProperty(`--${name}`, `url("${spriteDataUri(name)}")`);
	}

	// Page changes cross-fade (View Transitions API; timing in app.css). Browsers without it
	// (e.g. Firefox ESR) simply change the page.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolveTransition) => {
			document.startViewTransition(async () => {
				resolveTransition();
				await navigation.complete;
			});
		});
	});
</script>

<div class="grass" aria-hidden="true"></div>

<main>
	{@render children()}
</main>

<NavBar />
<Toasts />

<style>
	/* the edge of the world: a strip of grass along the top */
	.grass {
		height: 20px;
		background-image: var(--grass);
		background-size: 64px 64px;
		image-rendering: pixelated;
		border-bottom: 2px solid #000;
	}

	/* room at the bottom for the navigation (NavBar.svelte) */
	main {
		max-width: 40rem;
		margin-inline: auto;
		padding: 0.75rem 1rem calc(6rem + env(safe-area-inset-bottom));
	}
</style>
