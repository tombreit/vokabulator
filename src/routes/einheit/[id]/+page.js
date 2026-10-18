import { error } from '@sveltejs/kit';
import { getUnit } from '#lib/storage.js';

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	const unit = getUnit(params.id);
	if (!unit) error(404, 'Diese Lerneinheit gibt es (auf diesem Gerät) nicht.');
	return { unit };
}
