/**
 * Smoke-check that the schema actually landed in Neon.
 * Run: npx tsx scripts/verify-db.ts   (or: node --env-file=.env ...)
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const sql = neon(url);

const tables = await sql`
	select table_name
	from information_schema.tables
	where table_schema = 'public'
	order by table_name
`;
console.log(
	'tables:',
	tables.map((t) => t.table_name)
);

const cols = await sql`
	select column_name, data_type
	from information_schema.columns
	where table_name = 'bhaifications'
	order by ordinal_position
`;
console.log(`\nbhaifications (${cols.length} cols):`);
for (const c of cols) console.log(`  ${c.column_name.padEnd(16)} ${c.data_type}`);

const idx = await sql`
	select indexname from pg_indexes
	where schemaname = 'public'
	order by indexname
`;
console.log(
	'\nindexes:',
	idx.map((i) => i.indexname)
);
