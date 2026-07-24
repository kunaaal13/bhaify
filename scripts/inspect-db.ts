/**
 * Dumps what's actually in the database. Handy after a manual smoke test.
 * Run: npx tsx --env-file=.env scripts/inspect-db.ts
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = neon(url);

const rows = await sql`
	select id, variant_slot, model, register,
	       round(quirk_density::numeric, 2) as dens, latency_ms,
	       left(output_text, 56) as txt
	from bhaifications
	order by created_at
`;
console.log(`bhaifications: ${rows.length}`);
for (const r of rows) {
	console.log(
		`  ${r.id}  s${r.variant_slot}  ${String(r.model).padEnd(18)} ${String(r.latency_ms ?? '-').padStart(5)}ms  d=${r.dens}  ${r.txt}`
	);
}

const log =
	await sql`select outcome, count(*)::int as n from request_log group by outcome order by n desc`;
console.log('\nrequest_log:', log.map((r) => `${r.outcome}=${r.n}`).join('  ') || '(empty)');

const dupes = await sql`
	select cache_key, variant_slot, count(*)::int as n
	from bhaifications group by 1, 2 having count(*) > 1
`;
console.log('cache uniqueness violations:', dupes.length);

const ips = await sql`select count(distinct ip_hash)::int as n from bhaifications`;
console.log('distinct ip hashes:', ips[0].n);

const raw = await sql`select count(*)::int as n from bhaifications where ip_hash ~ '^[0-9.]+$'`;
console.log('rows storing a raw-looking IP (must be 0):', raw[0].n);
