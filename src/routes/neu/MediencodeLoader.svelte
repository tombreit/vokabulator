<!--
  Imports the vocabulary of one C.C.Buchner Mediencode – no preview, no extra tap:
  load, save, say so ("Vokabeln importiert!") and go straight to the round setup.
  A code that was imported before simply continues that unit (progress included).
  Used by the "Scannen" and "Code" tabs and for links like /neu?code=40702-229.
  Such a link is only a step on the way: it is replaced in the history, so "Back" does not
  land on it again (and import and jump forward at once).
-->
<script>
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { importMediencode } from '#lib/import/ccbuchner.js';
	import { buildUnit } from '#lib/model.js';
	import { withChallenge } from '#lib/share.js';
	import { getUnit, saveUnit } from '#lib/storage.js';
	import { showToast } from '#lib/toasts.svelte.js';

	/**
	 * @type {{ code: string, reload?: boolean }}
	 * code: e.g. "40702-229"; reload: load again even if the unit exists ("Neu laden")
	 */
	let { code, reload = false } = $props();

	let error = $state('');

	/** the round setup of a unit – a friend's challenge from the link goes along */
	const learn = (/** @type {string} */ id) =>
		withChallenge(
			resolve('/lernen/[id]', { id }),
			untrack(() => page.url)
		);

	/** opened by a link (/neu?code=…) – not a code scanned or typed on /neu */
	const replaceState = untrack(() => page.url.searchParams.has('code'));

	$effect(() => {
		const existing = reload ? undefined : getUnit(`ccb-${code}`);
		if (existing) {
			showToast({
				sprite: 'chest',
				title: 'Kenn ich schon!',
				text: `Weiter in „${existing.title}“.`
			});
			goto(learn(existing.id), { replaceState });
			return;
		}

		let cancelled = false;
		error = '';
		importMediencode(code)
			.then((draft) => {
				if (cancelled) return;
				const unit = buildUnit(draft);
				saveUnit(unit);
				showToast({
					sprite: 'chest',
					title: reload ? 'Neu geladen!' : 'Vokabeln importiert!',
					text: `${unit.entries.length} Vokabeln: „${unit.title}“`
				});
				goto(reload ? resolve('/einheit/[id]', { id: unit.id }) : learn(unit.id), { replaceState });
			})
			.catch((/** @type {Error} */ e) => {
				if (!cancelled) error = e.message;
			});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if error}
	<p class="card error" role="alert">{error}</p>
{:else}
	<p class="card status" role="status">⏳ Lade die Vokabeln zu {code} …</p>
{/if}

<style>
	.status {
		margin-top: var(--gap);
		text-align: center;
	}

	.error {
		margin-top: var(--gap);
	}
</style>
