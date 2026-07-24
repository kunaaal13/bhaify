import { json, type RequestHandler } from '@sveltejs/kit';
import { bhaify, VARIANT_SLOTS } from '$lib/server/bhaify';
import { hashIp } from '$lib/server/hash';
import { checkRateLimit, logRequest, clientIpFrom } from '$lib/server/rate-limit';
import { MAX_INPUT_LENGTH } from '$lib/server/safety';

interface BhaifyBody {
	input?: unknown;
	variantSlot?: unknown;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: BhaifyBody;
	try {
		body = (await request.json()) as BhaifyBody;
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const input = typeof body.input === 'string' ? body.input : '';
	const variantSlot = typeof body.variantSlot === 'number' ? body.variantSlot : 0;

	if (!input.trim()) {
		return json({ error: 'Kuch toh likho bhai .' }, { status: 400 });
	}
	if (input.length > MAX_INPUT_LENGTH * 4) {
		// Cheap guard before we spend a DB round trip on something absurd.
		return json({ error: 'Bohot lamba hai .' }, { status: 413 });
	}

	const ipHash = await hashIp(clientIpFrom(request, getClientAddress));

	const limit = await checkRateLimit(ipHash);
	if (!limit.allowed) {
		await logRequest(ipHash, 'rate_limited');
		return json(
			{ error: 'Aaram se . Thodi der baad aana .', rule: limit.rule?.label },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
		);
	}

	try {
		const outcome = await bhaify({ input, ipHash, variantSlot });

		if (!outcome.ok) {
			await logRequest(ipHash, outcome.error?.code === 'blocked' ? 'blocked' : 'error');
			return json(
				{ error: outcome.error?.message, reason: outcome.error?.reason },
				{ status: outcome.error?.code === 'blocked' ? 422 : 503 }
			);
		}

		await logRequest(ipHash, 'ok');
		return json({ ...outcome.result, variantSlots: VARIANT_SLOTS });
	} catch (err) {
		console.error('[bhaify] unhandled', err);
		await logRequest(ipHash, 'error');
		return json({ error: 'Kuch gadbad ho gayi . Phir se try karo .' }, { status: 500 });
	}
};
