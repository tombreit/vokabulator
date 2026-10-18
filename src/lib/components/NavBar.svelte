<!--
  The areas of the app, always at the bottom of the screen – drawn like the hotbar
  in the game: four slots, the area you are in has the white selection frame.
  Rendered once, in +layout.svelte. During a round the learning page hides it
  (nav.hidden), so that nothing but the word is on screen.
-->
<script module>
	/** set by the learning page while a round runs */
	export const nav = $state({ hidden: false });
</script>

<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { canScanQr } from './QrScanner.svelte';
	import Sprite from './Sprite.svelte';

	/** each area with the pages that belong to it */
	const areas = [
		{
			href: resolve('/'),
			sprite: 'book',
			label: 'Lektionen',
			pages: ['/', '/einheit/', '/lernen/']
		},
		{ href: resolve('/neu'), sprite: 'qr', label: canScanQr ? 'Scannen' : 'Neu', pages: ['/neu'] },
		{ href: resolve('/erfolge'), sprite: 'trophy', label: 'Erfolge', pages: ['/erfolge'] },
		{ href: resolve('/optionen'), sprite: 'gear', label: 'Optionen', pages: ['/optionen'] }
	];

	/** @param {string[]} pages  "/" matches only the start page, "/einheit/" every unit page */
	function isCurrent(pages) {
		const path = page.url.pathname;
		return pages.some((p) => (p === '/' ? path === resolve('/') : path.startsWith(p)));
	}
</script>

{#if !nav.hidden}
	<nav aria-label="Bereiche">
		<ul>
			{#each areas as area (area.href)}
				<li>
					<a href={area.href} aria-current={isCurrent(area.pages) ? 'page' : undefined}>
						<Sprite name={area.sprite} size={28} />
						{area.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	nav {
		position: fixed;
		inset: auto 0 0;
		z-index: 10;
		padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
		border-top: 2px solid #000;
		background: #1e1e1e;
		box-shadow: inset 0 2px 0 #3a3a3a;
	}

	ul {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 4px;
		max-width: 40rem;
		margin: 0 auto;
		padding: 0;
		list-style: none;
	}

	/* a slot: dark, grey frame – the current one gets the white selection frame */
	a {
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 5px 0 3px;
		border: 2px solid #555;
		background: rgb(0 0 0 / 0.35);
		color: var(--muted);
		/* "Lektionen" still fits on a 280 px screen */
		font-size: min(0.72rem, 3.7vw);
		text-decoration: none;
		white-space: nowrap;

		&:hover {
			color: #fff;
		}

		&[aria-current='page'] {
			border-color: #fff;
			outline: 2px solid #000;
			background: rgb(255 255 255 / 0.1);
			color: #fff;
		}
	}
</style>
