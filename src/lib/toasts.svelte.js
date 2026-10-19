// @ts-check
/**
 * Short messages at the top right – "Vokabeln importiert!", "Level-Up!", "Erfolg freigeschaltet!".
 * Any page or module calls showToast(); Toasts.svelte (in the layout) shows them one after
 * another, so a message survives a page change (e.g. from the scanner to the learning page).
 */

import { untrack } from 'svelte';

/** @typedef {{ id: number, sprite: string, title: string, text: string }} Toast */

let nextId = 1;

/** @type {Toast[]} waiting messages, the first one is on screen */
export const toasts = $state([]);

/**
 * @param {Omit<Toast, 'id'>} toast  sprite from #lib/pixel/sprites.js, a short title, one line of text
 */
export function showToast(toast) {
	// push() also reads the list's length. Called inside an $effect, that effect would depend
	// on the list it just changed and run again at once – and push again, endlessly
	// (effect_update_depth_exceeded, "Kenn ich schon!" over and over).
	untrack(() => toasts.push({ id: nextId++, ...toast }));
}
