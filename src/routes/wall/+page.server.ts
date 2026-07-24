import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bhaifications } from '$lib/server/db/schema';
import { BATCH_SIZE } from '$lib/feed';
import type { PageServerLoad } from './$types';

/**
 * Server-renders the first batch so the page has content before hydration.
 * Subsequent batches come from /api/feed as the reader scrolls.
 */
export const load: PageServerLoad = async () => {
	const visible = and(eq(bhaifications.isPublic, true), eq(bhaifications.isFlagged, false));

	const rows = await db
		.select({
			id: bhaifications.id,
			text: bhaifications.outputText,
			inputText: bhaifications.inputText,
			register: bhaifications.register,
			createdAt: bhaifications.createdAt
		})
		.from(bhaifications)
		.where(visible)
		.orderBy(desc(bhaifications.createdAt), desc(bhaifications.id))
		.limit(BATCH_SIZE + 1);

	const hasMore = rows.length > BATCH_SIZE;
	const items = hasMore ? rows.slice(0, BATCH_SIZE) : rows;
	const last = items.at(-1);

	const [count] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(bhaifications)
		.where(visible);

	return {
		items: items.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
		hasMore,
		cursor: hasMore && last ? { t: last.createdAt.toISOString(), i: last.id } : null,
		total: count?.n ?? 0
	};
};
