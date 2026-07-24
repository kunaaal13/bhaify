import { error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bhaifications } from '$lib/server/db/schema';
import { countStyleMarkers } from '$lib/persona/postprocess';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [row] = await db
		.select()
		.from(bhaifications)
		.where(eq(bhaifications.id, params.id))
		.limit(1);

	if (!row) error(404, 'Yeh link kaam nahi kar raha .');

	// Flagged content stays reachable by direct link but is never rendered —
	// treating it as missing avoids confirming to a reporter what was removed.
	if (row.isFlagged) error(410, 'Yeh hata diya gaya .');

	// Fire-and-forget: a failed counter increment must not break the page.
	db.update(bhaifications)
		.set({ viewCount: sql`${bhaifications.viewCount} + 1` })
		.where(eq(bhaifications.id, row.id))
		.catch(() => {});

	return {
		result: {
			id: row.id,
			text: row.outputText,
			inputText: row.inputText,
			register: row.register,
			quirkDensity: row.quirkDensity ?? 0,
			markers: countStyleMarkers(row.outputText),
			model: row.model,
			latencyMs: row.latencyMs,
			variantSlot: row.variantSlot,
			cached: true,
			createdAt: row.createdAt.toISOString()
		}
	};
};
