/**
 * Lists bhaifications matching a set of terms, across both the submitted text
 * and the generated text. Read-only — inspect before deleting anything.
 *
 * Run: npx tsx --env-file=.env scripts/find-entries.ts love navya
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = neon(url);

const terms = process.argv.slice(2);
if (terms.length === 0) throw new Error('Pass at least one term');

const total = await sql`select count(*)::int as n from bhaifications`;
console.log(`total rows: ${total[0].n}`);
console.log(`terms     : ${terms.join(', ')}\n`);

const seen = new Set<string>();

for (const term of terms) {
	const like = `%${term}%`;
	const rows = await sql`
		select id, input_text, output_text, created_at
		from bhaifications
		where input_text ilike ${like} or output_text ilike ${like}
		order by created_at
	`;
	console.log(`── "${term}" → ${rows.length} row(s)`);
	for (const r of rows) {
		seen.add(r.id as string);
		console.log(`   ${r.id}`);
		console.log(`     in  : ${r.input_text}`);
		console.log(`     out : ${r.output_text}`);
	}
	console.log();
}

console.log(`distinct rows matched: ${seen.size}`);
console.log(`ids: ${[...seen].join(' ') || '(none)'}`);
