<script>
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import NavBar from '#lib/components/NavBar.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { splash } from '#lib/learn/feedback.js';
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

	/** the start page shows the name big, with a yellow splash text like a game's title screen */
	const onStartPage = $derived(page.url.pathname === resolve('/'));
	const splashText = splash();
</script>

<div class="grass" aria-hidden="true"></div>

<!-- the app's name on every page, in stone; it leads back to the start page -->
<header class:big={onStartPage}>
	<a class="logo" href={resolve('/')}>Vokabulator</a>
	{#if onStartPage}<p class="splash" aria-hidden="true">{splashText}</p>{/if}
</header>

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

	header {
		position: relative;
		max-width: 40rem;
		margin-inline: auto;
		padding: 0.6rem 1rem 0;

		&.big {
			margin-bottom: 1.75rem;
			text-align: center;
		}
	}

	.logo {
		font-size: 1.4rem;
		font-weight: 700;
		text-decoration: none;
		text-transform: uppercase;
		/* stone texture inside the letters, a dark block edge below them */
		background: var(--stone) 0 0 / 32px 32px;
		background-clip: text;
		color: transparent;
		text-shadow: none;
		filter: drop-shadow(0 2px 0 #3a3a3a) drop-shadow(0 2px 0 #1c1c1c) drop-shadow(2px 2px 0 #000);

		.big & {
			font-size: clamp(1.8rem, 9vw, 3rem);
			filter: drop-shadow(0 3px 0 #3a3a3a) drop-shadow(0 3px 0 #1c1c1c) drop-shadow(2px 2px 0 #000);
		}
	}

	.splash {
		position: absolute;
		right: 1rem;
		bottom: -1.3rem;
		margin: 0;
		color: var(--yellow);
		font-weight: 700;
		font-size: clamp(0.8rem, 3.6vw, 1rem);
		text-shadow: 2px 2px 0 #3f3f15;
		transform: rotate(-12deg);
		animation: splash 0.45s ease-in-out infinite alternate;
	}

	@keyframes splash {
		to {
			transform: rotate(-12deg) scale(1.08);
		}
	}

	/* room at the bottom for the navigation (NavBar.svelte) */
	main {
		max-width: 40rem;
		margin-inline: auto;
		padding: 0.75rem 1rem calc(6rem + env(safe-area-inset-bottom));
	}
</style>
