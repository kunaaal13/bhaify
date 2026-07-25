/**
 * Reports the style metrics for the corpus, the few-shot examples, and
 * (optionally) live DB output — all through the same code path.
 *
 *   npx tsx scripts/measure-style.ts
 *   npx tsx --env-file=.env scripts/measure-style.ts --db
 *
 * The corpus row is the target. The few-shots row is what we actually teach the
 * model, and the two disagreeing is the bug this project spent a while not
 * seeing: prose rules lose to demonstrated examples every time, so if these two
 * rows diverge, the examples win and the rules are decoration.
 *
 * Costs nothing and hits no LLM — run it freely after touching examples.ts,
 * lexicon.ts or corpus.ts.
 */
import { batchMetrics, checkTargets, TARGETS, type BatchMetrics } from '../src/lib/persona/metrics.ts';
import { CORPUS } from '../src/lib/persona/corpus.ts';
import { EXAMPLES } from '../src/lib/persona/examples.ts';

const USE_DB = process.argv.includes('--db');

function report(label: string, m: BatchMetrics, gate = false): void {
	const pct = (x: number) => `${(100 * x).toFixed(0)}%`;
	console.log(`\n── ${label} (n=${m.n}) ${'─'.repeat(Math.max(0, 44 - label.length))}`);
	console.log(`  compression        ${m.compressionRate.toFixed(1)} /100w   (target ${TARGETS.compressionRate}, corpus 2010-12 era 13.1)`);
	console.log(`  outputs compressing ${pct(m.anyCompressionShare)}        (target ${pct(TARGETS.anyCompressionShare)})`);
	console.log(`  compression coverage ${pct(m.compressionCoverage)}       (of compressible words, how many were)`);
	console.log(`  english-base share  ${pct(m.englishShare)}        (target ${pct(TARGETS.englishShare)}, corpus 22.5%)`);
	console.log(`  run-ons (1 segment) ${pct(m.oneSegmentShare)}        (target ${pct(TARGETS.oneSegmentShare)}, corpus 55%)`);
	console.log(`  3+ segments         ${pct(m.threePlusSegmentShare)}`);
	console.log(`  three-beat template ${pct(m.threeBeatShare)}        (target under ${pct(TARGETS.threeBeatShare)})`);
	console.log(`  words median/max    ${m.medianWords} / ${m.maxWords}       (target median ${TARGETS.medianWords}, corpus 17/39)`);
	console.log(`  sign-off rate       ${pct(m.signoffShare)}        (target under ${pct(TARGETS.signoffShare)}, corpus ~8%)`);
	console.log(
		`  shape distribution  ${Object.entries(m.shapeDistribution)
			.sort((a, b) => +a[0] - +b[0])
			.map(([k, v]) => `${k}seg:${pct(v)}`)
			.join('  ')}`
	);
	if (m.repeatedPhrases.length) {
		console.log('  repeated phrases:');
		for (const { phrase, count } of m.repeatedPhrases.slice(0, 5)) {
			console.log(`    ${count}x  "${phrase}"`);
		}
	} else {
		console.log('  repeated phrases:   none');
	}

	if (gate) {
		const g = checkTargets(m);
		console.log(`\n  GATE: ${g.pass ? 'pass' : 'FAIL'}`);
		for (const x of g.failures) console.log(`    - ${x}`);
	}
}

// The corpus is the ground truth, so it is reported without a gate — if the real
// tweets "failed" our thresholds that would mean the thresholds are wrong.
report('reference corpus (real tweets)', batchMetrics(CORPUS.map((t) => t.text)));

report(
	'few-shot examples (what we teach)',
	batchMetrics(
		EXAMPLES.map((e) => e.out),
		EXAMPLES.map((e) => e.in)
	),
	true
);

if (USE_DB) {
	const { neon } = await import('@neondatabase/serverless');
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set (needed for --db)');
	const sql = neon(url);
	const rows = (await sql`
		select input_text, output_text, raw_output
		from bhaifications order by created_at desc limit 200
	`) as { input_text: string; output_text: string; raw_output: string }[];

	if (rows.length) {
		// Both, because the delta between them is exactly quirkify's contribution.
		report(
			'live output — model only (raw)',
			batchMetrics(
				rows.map((r) => r.raw_output),
				rows.map((r) => r.input_text)
			),
			true
		);
		report(
			'live output — after quirkify',
			batchMetrics(
				rows.map((r) => r.output_text),
				rows.map((r) => r.input_text)
			),
			true
		);
	} else {
		console.log('\n(no rows in bhaifications)');
	}
}

console.log();
