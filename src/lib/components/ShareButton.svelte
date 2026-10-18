<!--
  📤 Share a link: opens the phone's share menu (WhatsApp, Signal, …).
  Where the browser has none (e.g. Chrome on Linux), the text is copied instead.
-->
<script>
	/**
	 * @type {{ label: string, title: string, text: string, url: () => Promise<string> }}
	 * url: built only when tapped (it may take a moment for links with words inside)
	 */
	let { label, title, text, url } = $props();

	let status = $state('');

	async function share() {
		const link = new URL(await url(), location.origin).href;
		if (navigator.canShare?.({ title, text, url: link })) {
			try {
				await navigator.share({ title, text, url: link });
			} catch {
				// the learner closed the share menu – nothing to do
			}
			return;
		}
		await navigator.clipboard.writeText(`${text}\n${link}`);
		status = 'Link kopiert ✅';
		setTimeout(() => (status = ''), 3000);
	}
</script>

<button class="button" onclick={share}>{status || label}</button>
