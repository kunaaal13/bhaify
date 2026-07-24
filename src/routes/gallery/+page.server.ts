import { desc, and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bhaifications } from '$lib/server/db/schema';
import { USABLE_CORPUS, PEAK_CORPUS } from '$lib/persona/corpus';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const recent = await db
		.select({
			id: bhaifications.id,
			text: bhaifications.outputText,
			inputText: bhaifications.inputText,
			register: bhaifications.register,
			model: bhaifications.model,
			createdAt: bhaifications.createdAt
		})
		.from(bhaifications)
		// Matches the partial index on (created_at desc) where public and not flagged.
		.where(and(eq(bhaifications.isPublic, true), eq(bhaifications.isFlagged, false)))
		.orderBy(desc(bhaifications.createdAt))
		.limit(24);

	// Sorted by engagement — the carousel should open on the strongest lines.
	const greatest = [...USABLE_CORPUS].sort((a, b) => b.likes - a.likes).slice(0, 16);

	// Evenly spaced across 2010–2015, NOT the first 16 chronologically: the corpus
	// is front-loaded (22 of 52 posts are from 2010), so slicing the head gives an
	// "era" carousel that never leaves its first year. Interpolating indices across
	// the full range guarantees every year is represented.
	const chronological = [...PEAK_CORPUS].sort((a, b) => a.date.localeCompare(b.date));
	const ERA_COUNT = Math.min(16, chronological.length);
	const era = Array.from(
		{ length: ERA_COUNT },
		(_, i) => chronological[Math.round((i * (chronological.length - 1)) / (ERA_COUNT - 1))]
	);

	return { recent, greatest, era };
};
