/**
 * Human rating loop — the ground truth the automated gate answers to.
 *
 *   npx tsx --env-file=.env scripts/rate.ts          # generate held-out outputs
 *   # ...edit research/ratings.json, filling each "rating": null with 1-5...
 *   npx tsx scripts/rate.ts --report                 # correlate ratings vs metrics
 *
 * WHY THIS EXISTS
 *
 * metrics.ts asserts that compression, English-base share and run-on rhythm are
 * what make output feel like bhai. That is an inference from the corpus, not a
 * proven fact, and it is exactly the kind of inference the previous harness got
 * wrong — it "proved" the persona worked while the output felt nothing like him.
 *
 * So: rate the outputs by feel, and check the metrics agree. If a metric shows no
 * correlation with your ratings it is measuring noise and should be dropped from
 * the gate. If ratings are uniformly low while the gate passes, TARGETS is too
 * lenient. The numbers are accountable to your gut, never the other way round.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { buildPrompt } from '../src/lib/persona/prompt.ts';
import { quirkify } from '../src/lib/persona/quirkify.ts';
import { hashSeed } from '../src/lib/persona/rng.ts';
import { cleanModelOutput } from '../src/lib/persona/postprocess.ts';
import { styleMetrics, batchMetrics, checkTargets } from '../src/lib/persona/metrics.ts';
import { HELDOUT } from './eval-cases.ts';
import { scriptGenerate } from './_providers.ts';

const FILE = 'research/ratings.json';
const REPORT = process.argv.includes('--report');

interface Row {
	input: string;
	output: string;
	/** 1 (nothing like him) .. 5 (indistinguishable). Fill this in by hand. */
	rating: number | null;
	note?: string;
}

// ── report mode ─────────────────────────────────────────────────────────────

if (REPORT) {
	if (!existsSync(FILE)) throw new Error(`${FILE} not found — run without --report first`);
	const rows = JSON.parse(readFileSync(FILE, 'utf8')) as Row[];
	const rated = rows.filter((r) => typeof r.rating === 'number');

	if (rated.length < 5) {
		throw new Error(`only ${rated.length}/${rows.length} rated — fill in more of ${FILE}`);
	}

	/** Pearson r. Small n, so treat |r| as a direction hint, not a p-value. */
	const corr = (xs: number[], ys: number[]): number => {
		const n = xs.length;
		const mx = xs.reduce((a, b) => a + b, 0) / n;
		const my = ys.reduce((a, b) => a + b, 0) / n;
		let num = 0;
		let dx = 0;
		let dy = 0;
		for (let i = 0; i < n; i++) {
			num += (xs[i] - mx) * (ys[i] - my);
			dx += (xs[i] - mx) ** 2;
			dy += (ys[i] - my) ** 2;
		}
		return dx && dy ? num / Math.sqrt(dx * dy) : 0;
	};

	const ratings = rated.map((r) => r.rating as number);
	const m = rated.map((r) => styleMetrics(r.output, r.input));

	console.log(`\n── ratings vs metrics (n=${rated.length}) ──────────────────────\n`);
	console.log(`  mean rating: ${(ratings.reduce((a, b) => a + b, 0) / rated.length).toFixed(2)} / 5`);
	console.log('\n  correlation with rating (want positive, except three-beat):');
	const axes: [string, (x: (typeof m)[number]) => number][] = [
		['compressionRate ', (x) => x.compressionRate],
		['englishShare    ', (x) => x.englishShare],
		['wordCount       ', (x) => x.wordCount],
		['segments        ', (x) => x.segments],
		['isThreeBeat     ', (x) => (x.isThreeBeat ? 1 : 0)]
	];
	for (const [label, f] of axes) {
		const r = corr(m.map(f), ratings);
		const bar = '█'.repeat(Math.round(Math.abs(r) * 20));
		console.log(`    ${label} r=${r >= 0 ? '+' : ''}${r.toFixed(2)}  ${bar}`);
	}

	console.log('\n  worst-rated:');
	for (const r of [...rated].sort((a, b) => (a.rating as number) - (b.rating as number)).slice(0, 3)) {
		console.log(`    [${r.rating}] ${r.output}`);
	}
	console.log('\n  best-rated:');
	for (const r of [...rated].sort((a, b) => (b.rating as number) - (a.rating as number)).slice(0, 3)) {
		console.log(`    [${r.rating}] ${r.output}`);
	}
	console.log();
	process.exit(0);
}

// ── generate mode ───────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rows: Row[] = [];

for (const input of HELDOUT) {
	const seed = hashSeed(`rate:${input}`);
	const { system, user } = buildPrompt(input, seed, 0);
	try {
		const gen = await scriptGenerate(system, user);
		const { text } = quirkify(cleanModelOutput(gen.text), seed);
		rows.push({ input, output: text, rating: null });
		console.log(`  ${input}\n    ${text}   [${gen.model}]\n`);
	} catch (e) {
		rows.push({ input, output: '', rating: null, note: `error: ${(e as Error).message}` });
		console.log(`  ${input}\n    !! ${(e as Error).message}\n`);
	}
	await sleep(Number(process.env.EVAL_THROTTLE_MS ?? 2500));
}

mkdirSync('research', { recursive: true });
writeFileSync(FILE, JSON.stringify(rows, null, 2) + '\n');

const m = batchMetrics(
	rows.map((r) => r.output),
	rows.map((r) => r.input)
);
const g = checkTargets(m);
console.log(`── wrote ${FILE} ──`);
console.log(`  gate: ${g.pass ? 'pass' : 'FAIL'}`);
for (const x of g.failures) console.log(`    - ${x}`);
console.log(`\n  Now rate each line 1-5 in ${FILE}, then: npx tsx scripts/rate.ts --report\n`);
