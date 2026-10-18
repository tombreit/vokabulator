<!--
  Messages that slide in at the top right, like "Fortschritt erzielt!" in the game:
  a dark box with an item, a yellow title and a line of text. Shown one after another,
  each for 3.5 seconds. New ones come from showToast() in #lib/toasts.svelte.js.
  Rendered once, in +layout.svelte.
-->
<script>
	import { toasts } from '#lib/toasts.svelte.js';
	import Sprite from './Sprite.svelte';

	const first = $derived(toasts[0]);

	$effect(() => {
		if (!first) return;
		const id = first.id;
		const timer = setTimeout(() => {
			const index = toasts.findIndex((t) => t.id === id);
			if (index !== -1) toasts.splice(index, 1);
		}, 3500);
		return () => clearTimeout(timer);
	});
</script>

{#if first}
	{#key first.id}
		<div class="toast" role="status">
			<Sprite name={first.sprite} size={32} />
			<div>
				<p class="title">{first.title}</p>
				<p class="text">{first.text}</p>
			</div>
		</div>
	{/key}
{/if}

<style>
	.toast {
		position: fixed;
		top: 0.75rem;
		right: 0.75rem;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		max-width: min(22rem, calc(100vw - 1.5rem));
		padding: 0.5rem 0.8rem 0.5rem 0.6rem;
		border: 2px solid #000;
		background: #212121;
		box-shadow: inset 0 0 0 2px #555;
		animation: slide-in 0.3s ease-out;

		p {
			margin: 0;
		}
	}

	.title {
		color: var(--yellow);
		font-weight: 700;
	}

	.text {
		color: #fff;
		font-size: 0.9rem;
	}

	@keyframes slide-in {
		from {
			translate: 110% 0;
		}
	}
</style>
