/**
 * Rate limiting (PLAN.md §5).
 *
 * Counts rows in `request_log`, not `bhaifications` — a blocked or rate-limited
 * request never produces a bhaification, so counting only successes would let a
 * rejected caller retry without limit.
 *
 * A COUNT over an indexed window is fine at this scale. If it stops being fine,
 * swap in Upstash behind this same interface; nothing outside this file changes.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from './db';
import { requestLog, type RequestOutcome } from './db/schema';
import { nanoid } from 'nanoid';

export interface RateLimitRule {
	windowMs: number;
	max: number;
	label: string;
}

/**
 * Two windows: a burst guard and a daily cap.
 *
 * The daily cap is the one that matters — it exists to keep us inside the free
 * LLM tiers (~250/day Gemini). Sized so one person can't drain the shared quota.
 */
export const RULES: RateLimitRule[] = [
	{ windowMs: 60_000, max: 8, label: 'per-minute' },
	{ windowMs: 24 * 60 * 60_000, max: 60, label: 'per-day' }
];

export interface RateLimitResult {
	allowed: boolean;
	rule?: RateLimitRule;
	/** Seconds until the caller may retry. */
	retryAfter?: number;
}

export async function checkRateLimit(ipHash: string): Promise<RateLimitResult> {
	for (const rule of RULES) {
		const since = new Date(Date.now() - rule.windowMs);
		const [row] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(requestLog)
			.where(and(eq(requestLog.ipHash, ipHash), gte(requestLog.createdAt, since)));

		if ((row?.count ?? 0) >= rule.max) {
			return { allowed: false, rule, retryAfter: Math.ceil(rule.windowMs / 1000) };
		}
	}
	return { allowed: true };
}

/** Records an attempt. Every request logs exactly one row, whatever the outcome. */
export async function logRequest(ipHash: string, outcome: RequestOutcome): Promise<void> {
	await db.insert(requestLog).values({ id: nanoid(12), ipHash, outcome });
}

/**
 * Best-effort client IP.
 *
 * On Vercel, `x-forwarded-for` is set by the proxy and its leftmost entry is the
 * real client. SvelteKit's getClientAddress() throws when no adapter-provided
 * address exists (e.g. some test harnesses), so it's wrapped.
 */
export function clientIpFrom(request: Request, getClientAddress: () => string): string {
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0].trim();
	try {
		return getClientAddress();
	} catch {
		return 'unknown';
	}
}
