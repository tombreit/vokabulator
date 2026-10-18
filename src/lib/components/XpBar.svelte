<!--
  The XP bar of the game: the level number in green above a segmented bar.
  Shows the level for `xp` (all XP ever earned, see #lib/learn/level.js).
-->
<script>
	import { levelFor } from '#lib/learn/level.js';

	/** @type {{ xp: number }} */
	let { xp } = $props();

	const level = $derived(levelFor(xp));
</script>

<div class="xp" title="{level.into} von {level.needed} XP bis Level {level.level + 1}">
	<span class="level">{level.level}</span>
	<div
		class="bar"
		role="progressbar"
		aria-label="Level {level.level}, Fortschritt zum nächsten Level"
		aria-valuemin="0"
		aria-valuemax={level.needed}
		aria-valuenow={level.into}
	>
		<div class="fill" style:width="{level.share * 100}%"></div>
	</div>
</div>

<style>
	.xp {
		display: grid;
		justify-items: center;
		gap: 2px;
	}

	/* the green level number with a dark outline */
	.level {
		color: var(--xp);
		font-weight: 700;
		font-size: 1.3rem;
		line-height: 1;
		text-shadow:
			2px 0 0 #000,
			-2px 0 0 #000,
			0 2px 0 #000,
			0 -2px 0 #000;
	}

	.bar {
		width: 100%;
		height: 12px;
		border: 2px solid #000;
		background: var(--surface-2);
		/* 18 segments, like the game's bar */
		background-image: repeating-linear-gradient(
			90deg,
			transparent 0 calc(100% / 18 - 2px),
			#000 calc(100% / 18 - 2px) calc(100% / 18)
		);
	}

	.fill {
		height: 100%;
		background: linear-gradient(#c8ff3c 0 35%, var(--xp) 35%);
		transition: width 0.5s ease-out;
	}
</style>
