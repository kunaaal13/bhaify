/**
 * Hashing for cache keys and IP pseudonymisation.
 *
 * Uses WebCrypto, which exists on both the Node and edge runtimes — importing
 * node:crypto here would pin the whole route to Node.
 */
import { env } from '$env/dynamic/private';

async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cache key for a normalised input.
 *
 * Note this is NOT salted: it must be identical across deploys and restarts, or
 * every cached variant silently orphans. It only ever hashes user-submitted
 * public text, so there's nothing to protect.
 */
export async function cacheKeyFor(normalizedInput: string): Promise<string> {
	return sha256Hex(`bhaify:v1:${normalizedInput}`);
}

/**
 * Pseudonymises a client IP for rate limiting and abuse logging.
 *
 * Salted, unlike the cache key — an unsalted IP hash is trivially reversible by
 * enumerating the IPv4 space. We never store the raw address.
 *
 * Falls back to an unsalted-but-namespaced hash if APP_SALT is unset so local
 * dev works; production must set it.
 */
export async function hashIp(ip: string): Promise<string> {
	const salt = env.APP_SALT ?? 'dev-only-unsalted';
	return sha256Hex(`ip:${salt}:${ip}`);
}

/** Seed input for the RNG — ties generation variance to (input, slot). */
export function seedKey(cacheKey: string, variantSlot: number): string {
	return `${cacheKey}:${variantSlot}`;
}
