import { error, redirect } from '@sveltejs/kit';
import { importPath } from '#lib/share.js';
import { getUnit } from '#lib/storage.js';

/** @type {import('./$types').PageLoad} */
export function load({ params, url }) {
	const unit = getUnit(params.id);
	if (unit) return { unit };
	// not on this device yet, e.g. a link copied from the address bar: a unit from a
	// Mediencode is loaded on the way (/neu?code=…), then the learning page opens
	const path = importPath(params.id, url.searchParams);
	if (path) redirect(307, path);
	error(
		404,
		'Diese Lektion ist nicht auf diesem Gerät. Lass sie dir über „Teilen“ schicken – dann kommen die Vokabeln im Link mit.'
	);
}
