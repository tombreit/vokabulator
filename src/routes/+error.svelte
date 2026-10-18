<script>
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<h1>🙈 {page.status === 404 ? 'Nicht gefunden' : 'Hoppla'}</h1>
<p>{page.error?.message}</p>
<a class="button primary" href={resolve('/')}>Zur Startseite</a>
