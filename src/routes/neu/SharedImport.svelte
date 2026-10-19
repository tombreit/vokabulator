<!--
  A unit a friend shared: its words are inside the link (after "#d="), see #lib/share.js.
  Unpacked, saved and straight on to the round setup – with the friend's challenge, if any.
  Sharing a unit you already have updates its words, your progress stays.
  Like MediencodeLoader, this step is replaced in the history ("Back" does not unpack again).
-->
<script>
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { buildUnit } from '#lib/model.js';
	import { unpackUnit, withChallenge } from '#lib/share.js';
	import { getUnit, saveUnit } from '#lib/storage.js';
	import { showToast } from '#lib/toasts.svelte.js';

	/** @type {{ packed: string }} the text after "#d=" */
	let { packed } = $props();

	let broken = $state(false);

	$effect(() => {
		let cancelled = false;
		broken = false;
		unpackUnit(packed)
			.then((draft) => {
				if (cancelled) return;
				const unit = buildUnit(draft);
				const known = getUnit(unit.id) !== undefined;
				saveUnit(unit);
				showToast({
					sprite: 'chest',
					title: known ? 'Lektion aktualisiert!' : 'Vokabeln importiert!',
					text: `${unit.entries.length} Vokabeln: „${unit.title}“`
				});
				goto(
					withChallenge(
						resolve('/lernen/[id]', { id: unit.id }),
						untrack(() => page.url)
					),
					{ replaceState: true }
				);
			})
			.catch(() => {
				if (!cancelled) broken = true;
			});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if broken}
	<p class="card error" role="alert">
		🙈 Dieser Link ist leider kaputt – vielleicht wurde er beim Kopieren abgeschnitten.
	</p>
{:else}
	<p class="card status" role="status">⏳ Packe die Vokabeln aus …</p>
{/if}

<style>
	.status {
		text-align: center;
	}
</style>
