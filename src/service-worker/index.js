// @ts-check
/**
 * Service worker: makes Vokabulator work offline (e.g. in flight mode).
 *
 * SvelteKit bundles and registers this file automatically – in production builds
 * only (`pnpm build` / `pnpm preview`), not in `pnpm dev`.
 *
 * - install:  put all files of this build (JS, CSS, static/) plus the app shell
 *             into a cache named after the build version.
 *             The app shell is the HTML page every route starts with; we fetch it
 *             from the root URL (on Apache that is 200.html, see DirectoryIndex).
 * - activate: delete the caches of older versions.
 * - fetch:    app files            → from the cache (they never change within a version)
 *             page navigations     → network first; offline: the cached app shell
 *             everything else      → untouched, e.g. /proxy/… (always live from the publisher)
 *
 * The vocabulary itself is not in here – it lives in localStorage.
 */
import { self } from '$app/service-worker';
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';

const CACHE = `vokabulator-${version}`;

/** @param {string} path  relative to the app's base URL */
const url = (path) => new URL(path, self.registration.scope).href;

const SHELL = self.registration.scope;
const APP_FILES = new Set([...immutable, ...assets].map((file) => url(file.path)));

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([SHELL, ...APP_FILES]))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	if (APP_FILES.has(request.url)) {
		event.respondWith(fromCache(request));
	} else if (request.mode === 'navigate') {
		event.respondWith(networkOrShell(request));
	}
});

// ignoreVary: servers often send "Vary: Origin", and module scripts are requested
// with an Origin header – the cached copy is still the right file.
const MATCH = { ignoreVary: true };

/** @param {Request} request */
async function fromCache(request) {
	const cached = await caches.match(request, MATCH);
	return cached ?? fetch(request);
}

/** @param {Request} request */
async function networkOrShell(request) {
	try {
		return await fetch(request);
	} catch {
		const shell = await caches.match(SHELL, MATCH);
		if (shell) return shell;
		throw new Error('Offline and no cached app shell');
	}
}
