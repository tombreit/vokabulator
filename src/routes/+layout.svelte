<script>
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Sprite from '#lib/components/Sprite.svelte';
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

	// Page changes cross-fade (View Transitions API; timing in app.css).
	onNavigate((navigation) => {
		return new Promise((resolveTransition) => {
			document.startViewTransition(async () => {
				resolveTransition();
				await navigation.complete;
			});
		});
	});

	/** the start page shows the big logo itself */
	const onStartPage = $derived(page.url.pathname === resolve('/'));
</script>

<div class="grass" aria-hidden="true"></div>

<header>
	{#if onStartPage}
		<span></span>
	{:else}
		<!-- "VOKABVLATOR": Roman inscriptions write U as V -->
		<a class="wordmark" href={resolve('/')} aria-label="Vokabulator – Startseite">VOKABVLATOR</a>
	{/if}
	<a class="settings" href={resolve('/einstellungen')} aria-label="Einstellungen">
		<Sprite name="chest" size={32} />
	</a>
</header>

<main>
	{@render children()}
</main>

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

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 40rem;
		margin-inline: auto;
		padding: 0.5rem 1rem 0.25rem;

		a {
			color: inherit;
			text-decoration: none;
		}
	}

	.wordmark {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.settings {
		display: grid;
		place-items: center;
		min-width: var(--tap);
		min-height: var(--tap);
	}

	main {
		max-width: 40rem;
		margin-inline: auto;
		padding: 0 1rem 3rem;
	}
</style>
