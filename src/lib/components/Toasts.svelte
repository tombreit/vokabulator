<!--
  Messages that slide in at the top right, like "Fortschritt erzielt!" in the game:
  a dark box with an item, a yellow title and a line of text. Each one leaves after a few
  seconds; the page just pushes new ones into `toasts`.
-->
<script module>
	/** @typedef {{ id: number, sprite: string, title: string, text: string }} Toast */
	let nextId = 1;

	/**
	 * @param {Omit<Toast, 'id'>} toast
	 * @returns {Toast}
	 */
	export function makeToast(toast) {
		return { id: nextId++, ...toast };
	}
</script>

<script>
	import Sprite from './Sprite.svelte';

	/** @type {{ toasts: Toast[] }} */
	let { toasts = $bindable() } = $props();

	// show them one after another: only the first is visible, it leaves after 3.5 s
	$effect(() => {
		const first = toasts[0];
		if (!first) return;
		const timer = setTimeout(() => (toasts = toasts.filter((t) => t.id !== first.id)), 3500);
		return () => clearTimeout(timer);
	});
</script>

{#if toasts[0]}
	{#key toasts[0].id}
		<div class="toast" role="status">
			<Sprite name={toasts[0].sprite} size={32} />
			<div>
				<p class="title">{toasts[0].title}</p>
				<p class="text">{toasts[0].text}</p>
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
