/**
 * Deletes bhaifications by id. Prints each row before removing it, and verifies
 * afterwards that nothing matching remains.
 *
 * Reports referencing these rows cascade (FK is ON DELETE CASCADE).
 * request_log is untouched — it holds only outcome counts and hashed IPs, no
 * user text, so there is nothing there to remove.
 *
 * Run: npx tsx --env-file=.env scripts/delete-entries.ts <id> [<id> ...]
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = neon(url);

const ids = process.argv.slice(2);
if (ids.length === 0) throw new Error('Pass at least one id');

const before = await sql`select count(*)::int as n from bhaifications`;
console.log(`rows before: ${before[0].n}\n`);

for (const id of ids) {
	const [row] = await sql`select id, input_text, output_text from bhaifications where id = ${id}`;
	if (!row) {
		console.log(`  ${id}  — not found, skipping`);
		continue;
	}
	const [reps] = await sql`select count(*)::int as n from reports where bhaification_id = ${id}`;
	await sql`delete from bhaifications where id = ${id}`;
	console.log(`  deleted ${id}  (${reps.n} linked report(s) cascaded)`);
	console.log(`     in  : ${row.input_text}`);
	console.log(`     out : ${row.output_text}`);
}

const after = await sql`select count(*)::int as n from bhaifications`;
console.log(`\nrows after: ${after[0].n}`);

// Confirm nothing matching survived, including via the other column.
for (const term of ['love', 'navya']) {
	const like = `%${term}%`;
	const [left] = await sql`
		select count(*)::int as n from bhaifications
		where input_text ilike ${like} or output_text ilike ${like}
	`;
	console.log(`remaining matches for "${term}": ${left.n}`);
}
