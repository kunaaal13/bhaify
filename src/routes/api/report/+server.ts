import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '$lib/server/db';
import { bhaifications, reports } from '$lib/server/db/schema';
import { hashIp } from '$lib/server/hash';
import { clientIpFrom } from '$lib/server/rate-limit';

/**
 * Reports hide the item immediately.
 *
 * A single report taking something down is the right trade at this scale: the
 * cost of wrongly hiding a joke is trivial, the cost of leaving genuine abuse up
 * is not. Nothing is deleted, so anything hidden can be restored by hand.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: { id?: unknown; reason?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const id = typeof body.id === 'string' ? body.id : '';
	const reason = typeof body.reason === 'string' ? body.reason.slice(0, 300) : null;
	if (!id) return json({ error: 'Missing id' }, { status: 400 });

	const [row] = await db
		.select({ id: bhaifications.id })
		.from(bhaifications)
		.where(eq(bhaifications.id, id))
		.limit(1);
	if (!row) return json({ error: 'Not found' }, { status: 404 });

	const ipHash = await hashIp(clientIpFrom(request, getClientAddress));

	await db.insert(reports).values({ id: nanoid(12), bhaificationId: id, reason, ipHash });
	await db
		.update(bhaifications)
		.set({ isFlagged: true, flagReason: reason ?? 'user-reported' })
		.where(eq(bhaifications.id, id));

	return json({ ok: true });
};
