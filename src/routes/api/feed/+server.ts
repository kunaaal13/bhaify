import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq, or, lt, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bhaifications } from '$lib/server/db/schema';
import { BATCH_SIZE } from '$lib/feed';

/**
 * Paginated feed of public bhaifications, newest first.
 *
 * Keyset pagination, not OFFSET. New rows land at the head constantly, and with
 * OFFSET every insert shifts the window — the reader would see duplicates and
 * skip entries while scrolling. The cursor is (created_at, id): created_at alone
 * is not unique enough, since a burst can share a timestamp.
 */
export const GET: RequestHandler = async ({ url }) => {
	const cursorTime = url.searchParams.get('t');
	const cursorId = url.searchParams.get('i');

	const visible = and(eq(bhaifications.isPublic, true), eq(bhaifications.isFlagged, false));

	const where =
		cursorTime && cursorId
			? and(
					visible,
					or(
						lt(bhaifications.createdAt, new Date(cursorTime)),
						and(eq(bhaifications.createdAt, new Date(cursorTime)), lt(bhaifications.id, cursorId))
					)
				)
			: visible;

	// Fetch one extra to learn whether another page exists without a second query.
	const rows = await db
		.select({
			id: bhaifications.id,
			text: bhaifications.outputText,
			inputText: bhaifications.inputText,
			register: bhaifications.register,
			createdAt: bhaifications.createdAt
		})
		.from(bhaifications)
		.where(where)
		.orderBy(desc(bhaifications.createdAt), desc(bhaifications.id))
		.limit(BATCH_SIZE + 1);

	const hasMore = rows.length > BATCH_SIZE;
	const items = hasMore ? rows.slice(0, BATCH_SIZE) : rows;
	const last = items.at(-1);

	return json({
		items,
		hasMore,
		cursor: hasMore && last ? { t: last.createdAt.toISOString(), i: last.id } : null
	});
};
