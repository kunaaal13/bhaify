import { and, eq, gte, sql, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bhaifications } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const visible = and(eq(bhaifications.isPublic, true), eq(bhaifications.isFlagged, false));
	const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const [[total], [today], latest] = await Promise.all([
		db.select({ n: sql<number>`count(*)::int` }).from(bhaifications),
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(bhaifications)
			.where(gte(bhaifications.createdAt, dayAgo)),
		db
			.select({ id: bhaifications.id, text: bhaifications.outputText })
			.from(bhaifications)
			.where(visible)
			.orderBy(desc(bhaifications.createdAt))
			.limit(3)
	]);

	return {
		total: total?.n ?? 0,
		today: today?.n ?? 0,
		latest
	};
};
