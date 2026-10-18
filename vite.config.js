import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// The C.C.Buchner proxy for `pnpm dev` and `pnpm preview` – same path as on the server,
// where static/.htaccess does this (and only lets two URL patterns through).
const proxy = {
	'/proxy/ccbuchner': {
		target: 'https://www.ccbuchner.de',
		changeOrigin: true,
		rewrite: (/** @type {string} */ path) => path.replace(/^\/proxy\/ccbuchner/, '')
	}
};

export default defineConfig({
	server: { proxy },
	preview: { proxy },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Single-page app: every route is rendered in the browser (see src/routes/+layout.js).
			// The server answers unknown paths with 200.html (see static/.htaccess).
			adapter: adapter({ fallback: '200.html' }),
			// Absolute asset URLs (/_app/…): the service worker serves the same cached
			// app shell for every route, so its links must not depend on the page URL.
			paths: { relative: false }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
