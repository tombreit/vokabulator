<!--
  The question on a stone panel, with the word's ore block on top.
  Once answered, the solution appears – and the block shows what happened:
    known     → it cracks (three stages) and turns into the next ore: "Kohle → Eisen!"
    not known → it shakes and falls back to stone
  During a combo the panel is "enchanted" (a purple shimmer).
-->
<script>
	import Sprite from '#lib/components/Sprite.svelte';
	import { oreOf } from '#lib/learn/leitner.js';

	/**
	 * @type {{
	 *   entry: import('#lib/model.js').Entry,
	 *   reverse: boolean,
	 *   langName: string,
	 *   showAnswer: boolean,
	 *   box: number,
	 *   newBox?: number,
	 *   enchanted?: boolean
	 * }}
	 * reverse: ask the German side; box: the word's box when asked; newBox: after the answer
	 */
	let { entry, reverse, langName, showAnswer, box, newBox, enchanted = false } = $props();

	/** 0 = whole, 1–3 = cracks, 4 = done (showing the new ore) */
	let stage = $state(0);

	$effect(() => {
		if (newBox === undefined) return;
		// cracks only when the word moves up; otherwise straight to the end state
		const steps = newBox > box ? [1, 2, 3, 4] : [4];
		const timers = steps.map((step, i) => setTimeout(() => (stage = step), i * 120));
		return () => timers.forEach(clearTimeout);
	});

	const done = $derived(stage === 4 && newBox !== undefined);
	const shown = $derived(oreOf(done && newBox !== undefined ? newBox : box));
	const caption = $derived.by(() => {
		if (!done || newBox === undefined || newBox === box) return shown.name;
		return `${oreOf(box).name} → ${oreOf(newBox).name}!`;
	});
	const direction = $derived(
		newBox === undefined ? '' : newBox > box ? 'up' : newBox < box ? 'down' : ''
	);
</script>

{#snippet foreign()}
	<p class="side">{langName}</p>
	<p class="word" lang={langName === 'Latein' ? 'la' : undefined}>{entry.front}</p>
	{#if entry.frontInfo}<p><span class="tooltip">{entry.frontInfo}</span></p>{/if}
{/snippet}

{#snippet german()}
	<p class="side">Deutsch</p>
	<p class="word german">{entry.back}</p>
{/snippet}

<div class="card question" class:enchanted>
	<div class="block" class:pop={done && direction === 'up'} class:hurt={direction === 'down'}>
		<Sprite name={shown.sprite} size={64} label={shown.name} />
		{#if stage >= 1 && stage <= 3}
			<span class="crack"><Sprite name="crack{stage}" size={64} /></span>
		{/if}
	</div>
	<p class="ore {done ? direction : ''}">{caption}</p>

	{@render (reverse ? german : foreign)()}

	{#if showAnswer}
		<div class="answer">
			<hr />
			{@render (reverse ? foreign : german)()}
		</div>
	{/if}
</div>

<style>
	.question {
		position: relative;
		overflow: hidden;
		display: grid;
		justify-items: center;
		align-content: center;
		min-height: 15rem;
		margin-bottom: var(--gap);
		padding: 1.25rem 1rem 1.5rem;
		text-align: center;
		overflow-wrap: anywhere;

		p {
			margin: 0;
		}
	}

	.block {
		position: relative;
		width: 64px;
		height: 64px;
		outline: 2px solid #000;
		outline-offset: 0;

		.crack {
			position: absolute;
			inset: 0;
		}
	}

	.ore {
		margin: 0.35rem 0 0.75rem !important;
		font-size: 0.9rem;
		color: var(--muted);

		&.up {
			color: var(--good);
			font-weight: 700;
		}
		&.down {
			color: var(--bad);
			font-weight: 700;
		}
	}

	.side {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.word {
		font-size: clamp(1.25rem, 6vw, 1.7rem);
		font-weight: 700;
		line-height: 1.2;
	}

	/* German in the reading face: the type tells which language you are looking at */
	.german {
		font-family: var(--font-read);
		font-size: clamp(1.2rem, 5.5vw, 1.5rem);
		font-weight: 600;
	}

	.tooltip {
		display: inline-block;
		margin-top: 0.35rem;
		padding: 0.1em 0.45em;
		border: 2px solid #2a0a5e;
		background: #100010;
		color: #fff;
		font-size: 0.9rem;
	}

	hr {
		width: 70%;
		margin: 1rem auto;
		border: none;
		border-top: 2px dashed var(--line);
	}

	/* --- the block reacts ------------------------------------------------------------ */
	.pop {
		animation: pop 0.25s ease-out;
	}

	@keyframes pop {
		from {
			scale: 1.3;
		}
	}

	/* not known: shake, flash red (like taking damage in the game) */
	.hurt {
		animation: shake 0.35s;

		&::after {
			content: '';
			position: absolute;
			inset: 0;
			background: rgb(255 0 0 / 0.45);
			animation: flash 0.35s forwards;
		}
	}

	@keyframes shake {
		20% {
			translate: -5px 0;
		}
		40% {
			translate: 5px 0;
		}
		60% {
			translate: -3px 0;
		}
		80% {
			translate: 3px 0;
		}
	}

	@keyframes flash {
		to {
			opacity: 0;
		}
	}

	/* --- combo: the panel is enchanted ---------------------------------------------- */
	.enchanted {
		&::before {
			content: '';
			position: absolute;
			inset: 0;
			pointer-events: none;
			background: linear-gradient(
				115deg,
				transparent 30%,
				rgb(160 80 255 / 0.35) 45%,
				rgb(200 140 255 / 0.5) 50%,
				rgb(160 80 255 / 0.35) 55%,
				transparent 70%
			);
			background-size: 300% 100%;
			animation: glint 2.4s linear infinite;
			mix-blend-mode: multiply;
		}
	}

	@keyframes glint {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: -200% 0;
		}
	}
</style>
