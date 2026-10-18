<!--
  The question on a stone panel – the word big in the middle, nothing else competing with it.
  The type tells the language: the foreign word in the pixel face, German in the reading face.
  The word's stage sits small in the corner (its item, see STAGES in #lib/learn/leitner.js);
  once answered it shows what happened:
    known     → it pops up as the next item: "↑ Stufe 3"
    not known → it shakes and falls back: "↓ Stufe 1"
  During a series of right answers the panel shimmers purple ("enchanted").
-->
<script>
	import Sprite from '#lib/components/Sprite.svelte';
	import { stageOf } from '#lib/learn/leitner.js';

	/**
	 * @type {{
	 *   entry: import('#lib/model.js').Entry,
	 *   reverse: boolean,
	 *   lang: string,
	 *   showAnswer: boolean,
	 *   box: number,
	 *   newBox?: number,
	 *   enchanted?: boolean
	 * }}
	 * reverse: ask the German side; lang: of the foreign word ("la", "en", …);
	 * box: the word's box when asked; newBox: after the answer
	 */
	let { entry, reverse, lang, showAnswer, box, newBox, enchanted = false } = $props();

	const shown = $derived(stageOf(newBox ?? box));
	const direction = $derived(
		newBox === undefined ? '' : newBox > box ? 'up' : newBox < box ? 'down' : ''
	);
</script>

{#snippet foreign()}
	<p class="word" {lang}>{entry.front}</p>
	{#if entry.frontInfo}<p class="info read">{entry.frontInfo}</p>{/if}
{/snippet}

{#snippet german()}
	<p class="word german" lang="de">{entry.back}</p>
{/snippet}

<div class="card question" class:enchanted>
	<div class="stage" title="{shown.name} ({shown.item})">
		<span class="item" class:pop={direction === 'up'} class:hurt={direction === 'down'}>
			<Sprite name={shown.sprite} size={32} label="{shown.name} ({shown.item})" />
		</span>
		{#if direction}
			<span class="caption {direction}">{direction === 'up' ? '↑' : '↓'} {shown.name}</span>
		{/if}
	</div>

	{@render (reverse ? german : foreign)()}

	{#if showAnswer}
		<hr />
		{@render (reverse ? foreign : german)()}
	{/if}
</div>

<style>
	.question {
		position: relative;
		overflow: hidden;
		display: grid;
		justify-items: center;
		align-content: center;
		min-height: min(20rem, 42vh);
		margin-bottom: var(--gap);
		padding: 3rem 1rem 2.5rem;
		text-align: center;
		overflow-wrap: anywhere;

		p {
			margin: 0;
		}
	}

	.word {
		font-size: clamp(1.6rem, 8vw, 2.3rem);
		font-weight: 700;
		line-height: 1.15;
	}

	/* German in the reading face: the type tells which language you are looking at */
	.german {
		font-family: var(--font-read);
		font-size: clamp(1.35rem, 6.5vw, 1.8rem);
		font-weight: 600;
	}

	/* grammar ("f", "Gen. -ōnis", "m. Akk.") – there when needed, not in the way */
	.info {
		margin-top: 0.4rem !important;
		color: var(--muted);
		font-size: 1rem;
	}

	hr {
		width: 3rem;
		margin: 1.1rem auto;
		border: none;
		border-top: 2px solid var(--line);
	}

	/* --- the word's stage, small in the corner --------------------------------------- */
	.stage {
		position: absolute;
		top: 0.6rem;
		left: 0.6rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.item {
		position: relative;
		display: block;
		width: 32px;
		height: 32px;

		:global(.sprite) {
			display: block;
		}
	}

	.caption {
		&.up {
			color: var(--good);
		}
		&.down {
			color: var(--bad);
		}
	}

	/* --- the item reacts ------------------------------------------------------------- */
	.pop {
		animation: pop 0.25s ease-out;
	}

	@keyframes pop {
		from {
			scale: 0.4;
		}
		60% {
			scale: 1.4;
		}
	}

	/* not known: shake */
	.hurt {
		animation: shake 0.35s;
	}

	@keyframes shake {
		20% {
			translate: -4px 0;
		}
		40% {
			translate: 4px 0;
		}
		60% {
			translate: -2px 0;
		}
		80% {
			translate: 2px 0;
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
				rgb(160 80 255 / 0.25) 45%,
				rgb(200 140 255 / 0.4) 50%,
				rgb(160 80 255 / 0.25) 55%,
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
