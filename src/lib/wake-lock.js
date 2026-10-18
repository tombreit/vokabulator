// @ts-check
/**
 * Keep the phone's screen on (Screen Wake Lock API), e.g. while answering questions.
 *
 * Usage in a component:
 *   $effect(() => (phase === 'question' ? keepScreenOn() : undefined));
 *
 * The browser drops the lock when the tab is hidden, so it is re-requested
 * whenever the page becomes visible again.
 *
 * @returns {() => void}  call to let the screen turn off again
 */
export function keepScreenOn() {
	let active = true;
	/** @type {WakeLockSentinel | undefined} */
	let lock;

	async function request() {
		if (!active || document.visibilityState !== 'visible') return;
		try {
			const newLock = await navigator.wakeLock.request('screen');
			if (active) lock = newLock;
			else newLock.release();
		} catch {
			// e.g. battery saver – not a reason to bother the learner
		}
	}

	request();
	document.addEventListener('visibilitychange', request);

	return () => {
		active = false;
		document.removeEventListener('visibilitychange', request);
		lock?.release();
	};
}
