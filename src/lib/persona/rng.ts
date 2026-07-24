/**
 * Seeded pseudo-randomness.
 *
 * Math.random() is unusable here: a permalink must render the same text forever,
 * and "phir se" must produce a stable variant per slot. Everything stochastic in
 * the persona pipeline draws from a seed derived from (cache_key, variant_slot).
 *
 * xorshift32 — small, fast, and identical across runtimes. Statistical quality
 * is irrelevant at this scale; reproducibility is the whole point.
 */
export class Rng {
	private s: number;

	constructor(seed: number) {
		// A zero state is a fixed point for xorshift, so fold it away.
		this.s = seed >>> 0 || 0x9e3779b9;
	}

	/** Next float in [0, 1). */
	next(): number {
		let s = this.s;
		s ^= s << 13;
		s >>>= 0;
		s ^= s >> 17;
		s ^= s << 5;
		s >>>= 0;
		this.s = s;
		return s / 0x100000000;
	}

	/** True with probability `p`. */
	chance(p: number): boolean {
		return this.next() < p;
	}

	/** Integer in [0, max). */
	int(max: number): number {
		return Math.floor(this.next() * max);
	}

	/** Uniform pick. */
	pick<T>(items: readonly T[]): T {
		return items[this.int(items.length)];
	}
}

/** Stable 32-bit string hash (FNV-1a). Used to derive seeds from cache keys. */
export function hashSeed(input: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h >>> 0;
}

/** Sample without replacement. Same seed always yields the same set. */
export function deterministicSample<T>(items: readonly T[], count: number, seed: number): T[] {
	const pool = [...items];
	const rng = new Rng(seed);
	const out: T[] = [];
	const n = Math.min(count, pool.length);
	for (let i = 0; i < n; i++) {
		out.push(pool.splice(rng.int(pool.length), 1)[0]);
	}
	return out;
}
