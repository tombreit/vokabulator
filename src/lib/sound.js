// @ts-check
/**
 * Little sounds, made on the fly with the Web Audio API – no audio files:
 *
 *   xp       a short "pling" with a slightly random pitch (collecting XP)
 *   levelUp  a rising chord
 *   wrong    a low thud
 *
 * Off by default (phones in school…); switched on in Optionen (settings.sound).
 */

import { loadSettings } from './storage.js';

/** @type {AudioContext | undefined} */
let audio;

/**
 * @param {number} frequency  Hz
 * @param {number} start      seconds from now
 * @param {number} duration   seconds
 * @param {OscillatorType} type
 * @param {number} volume     0..1
 */
function tone(frequency, start, duration, type, volume) {
	audio ??= new AudioContext();
	const at = audio.currentTime + start;
	const oscillator = audio.createOscillator();
	const gain = audio.createGain();
	oscillator.type = type;
	oscillator.frequency.value = frequency;
	gain.gain.setValueAtTime(volume, at);
	gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	oscillator.connect(gain).connect(audio.destination);
	oscillator.start(at);
	oscillator.stop(at + duration);
}

/** @param {'xp' | 'levelUp' | 'wrong'} kind */
export function play(kind) {
	if (!loadSettings().sound) return;
	if (kind === 'xp') {
		tone(1100 + Math.random() * 600, 0, 0.14, 'sine', 0.15);
	} else if (kind === 'levelUp') {
		[523, 659, 784, 1047].forEach((frequency, i) =>
			tone(frequency, i * 0.09, 0.32, 'triangle', 0.12)
		);
	} else {
		tone(110, 0, 0.22, 'square', 0.07);
	}
}
