/**
 * The pipeline (PLAN.md §4.1):
 *
 *   normalize -> rate-limit -> safety -> cache -> LLM -> quirkify -> persist
 *
 * Lives here rather than in the route so the eval harness can drive the exact
 * same code path the API does.
 */
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from './db';
import { bhaifications, type Bhaification } from './db/schema';
import { cacheKeyFor, seedKey } from './hash';
import { screenInput, screenOutput, blockMessage, type BlockReason } from './safety';
import { normalizeInput, buildPrompt, SLOT_SHAPES } from '$lib/persona/prompt';
import { quirkify } from '$lib/persona/quirkify';
import { hashSeed } from '$lib/persona/rng';
import { cleanModelOutput, inferRegister, countStyleMarkers } from '$lib/persona/postprocess';
import { generate, NoProviderAvailableError } from '$lib/llm';

export { cleanModelOutput, inferRegister, countStyleMarkers };

/**
 * How many cached takes per input. "Phir se" advances the slot (PLAN.md §4.2).
 *
 * Derived from SLOT_SHAPES rather than hardcoded: each slot maps to a distinct
 * structural shape, so the two counts must agree or a slot would either reuse
 * another's shape or wrap silently. Deriving it makes drift impossible.
 */
export const VARIANT_SLOTS = SLOT_SHAPES.length;

export interface BhaifyOutcome {
	ok: boolean;
	/** Present when ok. */
	result?: {
		id: string;
		text: string;
		register: string | null;
		quirkDensity: number;
		/** Markers present in the final text — see countStyleMarkers. */
		markers: number;
		model: string;
		latencyMs: number | null;
		variantSlot: number;
		cached: boolean;
	};
	/** Present when !ok. */
	error?: { code: 'blocked' | 'unavailable'; message: string; reason?: BlockReason };
}

function toResult(row: Bhaification, cached: boolean): BhaifyOutcome {
	return {
		ok: true,
		result: {
			id: row.id,
			text: row.outputText,
			register: row.register,
			quirkDensity: row.quirkDensity ?? 0,
			markers: countStyleMarkers(row.outputText),
			model: row.model,
			latencyMs: row.latencyMs,
			variantSlot: row.variantSlot,
			cached
		}
	};
}

/** Reads a cached variant, if that slot is already filled. */
async function readSlot(cacheKey: string, slot: number): Promise<Bhaification | undefined> {
	const [row] = await db
		.select()
		.from(bhaifications)
		.where(and(eq(bhaifications.cacheKey, cacheKey), eq(bhaifications.variantSlot, slot)))
		.limit(1);
	return row;
}

export interface BhaifyRequest {
	input: string;
	ipHash: string;
	/**
	 * Which take to return. 0 on first ask; "phir se" sends the next one.
	 * Wraps at VARIANT_SLOTS, so a fourth press re-serves slot 0 for free.
	 */
	variantSlot?: number;
}

export async function bhaify({
	input,
	ipHash,
	variantSlot = 0
}: BhaifyRequest): Promise<BhaifyOutcome> {
	const slot = ((variantSlot % VARIANT_SLOTS) + VARIANT_SLOTS) % VARIANT_SLOTS;

	const screened = screenInput(input);
	if (!screened.ok) {
		return {
			ok: false,
			error: {
				code: 'blocked',
				message: blockMessage(screened.reason!),
				reason: screened.reason
			}
		};
	}

	const normalized = normalizeInput(input);
	const cacheKey = await cacheKeyFor(normalized);

	const cached = await readSlot(cacheKey, slot);
	if (cached) return toResult(cached, true);

	const seed = hashSeed(seedKey(cacheKey, slot));
	// The slot picks a structural shape as well as seeding the sampler — seed
	// variation alone produced three near-identical takes (see SLOT_SHAPES).
	const { system, user } = buildPrompt(normalized, seed, slot);

	let raw: string;
	let model: string;
	let latencyMs: number;
	try {
		const res = await generate({ system, user });
		raw = res.text;
		model = res.model;
		latencyMs = res.latencyMs;
	} catch (err) {
		if (err instanceof NoProviderAvailableError) {
			return {
				ok: false,
				error: { code: 'unavailable', message: 'Bhai abhi busy hai . Thodi der baad try karo .' }
			};
		}
		throw err;
	}

	const cleaned = cleanModelOutput(raw);

	// Re-screen: a slur can be spelled around the input filter and echoed back.
	const outputCheck = screenOutput(cleaned);
	if (!outputCheck.ok) {
		return {
			ok: false,
			error: {
				code: 'blocked',
				message: blockMessage(outputCheck.reason!),
				reason: outputCheck.reason
			}
		};
	}

	const { text, density } = quirkify(cleaned, seed);
	const id = nanoid(8);

	// A concurrent request may have filled this slot between our read and write.
	// The unique index on (cache_key, variant_slot) is the arbiter: on conflict,
	// keep whichever landed first rather than failing the user's request.
	const [row] = await db
		.insert(bhaifications)
		.values({
			id,
			inputText: normalized,
			outputText: text,
			rawOutput: raw,
			cacheKey,
			variantSlot: slot,
			register: inferRegister(text),
			quirkDensity: density,
			model,
			latencyMs,
			ipHash
		})
		.onConflictDoNothing({ target: [bhaifications.cacheKey, bhaifications.variantSlot] })
		.returning();

	if (row) return toResult(row, false);

	const winner = await readSlot(cacheKey, slot);
	if (winner) return toResult(winner, true);

	// Should be unreachable: the conflict means a row exists.
	throw new Error('insert conflicted but no row found');
}
