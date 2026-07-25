/**
 * Free-tier model bake-off (PLAN.md §4.5 revisit).
 *
 *   npx tsx --env-file=.env scripts/bakeoff.ts
 *   npx tsx --env-file=.env scripts/bakeoff.ts --cases 6
 *   npx tsx --env-file=.env scripts/bakeoff.ts --only nemotron-ultra,gemini-flash-lite
 *
 * WHY
 *
 * The persona work (few-shots, rhythm rules, lexicon) closed most of the gap to
 * the corpus, but live output still lands at roughly 0.65x the example set's
 * compression and English-base share. That residue is model capability: holding
 * inconsistent orthography AND a rambling rhythm AND the input's meaning at once
 * is hard, and small models resolve the conflict by falling back to clean prose.
 *
 * Budget is free-tier-only, so the question is not "which model is best" but
 * "which of the free ones is least bad at this". Slugs churn without notice —
 * enumerate live from https://openrouter.ai/api/v1/models before trusting this
 * table.
 *
 * Sample sizes are small by design (free quotas are the constraint), so treat the
 * ranking as a shortlist, not a verdict. Confirm the winner with a full
 * `scripts/eval.ts` run before changing getProviders().
 */
import { buildPrompt } from '../src/lib/persona/prompt.ts';
import { quirkify } from '../src/lib/persona/quirkify.ts';
import { hashSeed } from '../src/lib/persona/rng.ts';
import { cleanModelOutput } from '../src/lib/persona/postprocess.ts';
import { batchMetrics, checkTargets, TARGETS } from '../src/lib/persona/metrics.ts';
import { CASES } from './eval-cases.ts';

const arg = (name: string): string | undefined => {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : undefined;
};

const N_CASES = Number(arg('cases') ?? 10);
const ONLY = arg('only')?.split(',').map((s) => s.trim());

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const OPENROUTER = 'https://openrouter.ai/api/v1/';

interface Candidate {
	label: string;
	baseURL: string;
	model: string;
	key: string | undefined;
	/** Extra body fields. Used to cap reasoning on thinking models. */
	extra?: Record<string, unknown>;
	note?: string;
}

const CANDIDATES: Candidate[] = [
	{
		label: 'gemini-flash-lite',
		baseURL: GEMINI,
		model: 'gemini-flash-lite-latest',
		key: process.env.GEMINI_API_KEY,
		note: 'incumbent primary'
	},
	{
		// The previous note measured this WITH reasoning on: 301 hidden tokens to
		// emit a 16-token line. Capping it is the whole point of retesting.
		//
		// Parameter matters and is not obvious — measured against the compat layer:
		//   reasoning_effort: 'none'     -> HTTP 400 INVALID_ARGUMENT
		//   reasoning_effort: 'low'      -> 200, but 98 total tokens for "ok"
		//   reasoning_effort: 'minimal'  -> 200, 8 total tokens for "ok"
		//   (omitted)                    -> 200, 117 total tokens for "ok"
		//   extra_body / google.thinking_config -> HTTP 400, not read over REST
		label: 'gemini-flash (minimal)',
		baseURL: GEMINI,
		model: 'gemini-flash-latest',
		key: process.env.GEMINI_API_KEY,
		extra: { reasoning_effort: 'minimal' },
		note: 'thinking capped to minimal'
	},
	{
		label: 'gemma-4-31b',
		baseURL: OPENROUTER,
		model: 'google/gemma-4-31b-it:free',
		key: process.env.OPENROUTER_API_KEY,
		note: 'incumbent fallback'
	},
	{
		// Dismissed in the original notes as "tuned for reasoning and tool-use, not
		// character voice" — but that judgement predates these slugs and was never
		// measured. 550B free is worth an empirical look when capability is the
		// binding constraint.
		label: 'nemotron-ultra-550b',
		baseURL: OPENROUTER,
		model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
		key: process.env.OPENROUTER_API_KEY
	},
	{
		label: 'nemotron-super-120b',
		baseURL: OPENROUTER,
		model: 'nvidia/nemotron-3-super-120b-a12b:free',
		key: process.env.OPENROUTER_API_KEY
	},
	{
		label: 'ling-3.0-flash',
		baseURL: OPENROUTER,
		model: 'inclusionai/ling-3.0-flash:free',
		key: process.env.OPENROUTER_API_KEY
	},
	{
		label: 'gpt-oss-20b',
		baseURL: OPENROUTER,
		model: 'openai/gpt-oss-20b:free',
		key: process.env.OPENROUTER_API_KEY
	}
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const THROTTLE_MS = Number(process.env.EVAL_THROTTLE_MS ?? 1500);

interface CallResult {
	text: string;
	latencyMs: number;
	/** Reasoning tokens burned, when the provider reports them. */
	thinkTokens: number;
	totalTokens: number;
}

async function call(c: Candidate, system: string, user: string): Promise<CallResult> {
	const started = Date.now();
	const res = await fetch(`${c.baseURL}chat/completions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}` },
		body: JSON.stringify({
			model: c.model,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			temperature: 1.0,
			max_tokens: 300,
			...c.extra
		})
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`);

	const j = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
		usage?: {
			total_tokens?: number;
			completion_tokens_details?: { reasoning_tokens?: number };
		};
	};
	const text = j.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error('empty completion');

	return {
		text,
		latencyMs: Date.now() - started,
		thinkTokens: j.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
		totalTokens: j.usage?.total_tokens ?? 0
	};
}

interface Row {
	label: string;
	note?: string;
	ok: number;
	failed: number;
	firstError?: string;
	avgLatency: number;
	avgThink: number;
	avgTotal: number;
	metrics?: ReturnType<typeof batchMetrics>;
	gatePass?: boolean;
	gateFailures?: string[];
	samples: string[];
}

const cases = CASES.slice(0, N_CASES);
const rows: Row[] = [];

for (const c of CANDIDATES) {
	if (ONLY && !ONLY.includes(c.label)) continue;
	if (!c.key) {
		console.log(`skip ${c.label} — no API key`);
		continue;
	}

	console.log(`\n── ${c.label} (${c.model})`);
	const outputs: string[] = [];
	const inputs: string[] = [];
	let failed = 0;
	let firstError: string | undefined;
	let latency = 0;
	let think = 0;
	let total = 0;

	for (const [i, kase] of cases.entries()) {
		const seed = hashSeed(`bakeoff:${kase.input}`);
		// Rotate slots so each model is judged across all three shapes, not just
		// the run-on default — a model can be fine at rambling and useless at the
		// pivot, and averaging one shape would hide that.
		const { system, user } = buildPrompt(kase.input, seed, i % 3);
		try {
			const r = await call(c, system, user);
			const { text } = quirkify(cleanModelOutput(r.text), seed);
			outputs.push(text);
			inputs.push(kase.input);
			latency += r.latencyMs;
			think += r.thinkTokens;
			total += r.totalTokens;
			console.log(`   ${text}`);
		} catch (e) {
			failed++;
			firstError ??= (e as Error).message;
			console.log(`   !! ${(e as Error).message}`);
		}
		await sleep(THROTTLE_MS);
	}

	const n = outputs.length || 1;
	const m = outputs.length ? batchMetrics(outputs, inputs) : undefined;
	const gate = m ? checkTargets(m) : undefined;
	rows.push({
		label: c.label,
		note: c.note,
		ok: outputs.length,
		failed,
		firstError,
		avgLatency: latency / n,
		avgThink: think / n,
		avgTotal: total / n,
		metrics: m,
		gatePass: gate?.pass,
		gateFailures: gate?.failures,
		samples: outputs.slice(0, 2)
	});
}

// ── report ──────────────────────────────────────────────────────────────────

const pct = (x: number) => `${(100 * x).toFixed(0)}%`;

console.log(`\n\n══ bake-off (${cases.length} cases each, slots rotated) ══\n`);
console.log(
	'  model                    ok/fail   cmp    en   run-on  3beat  medw  think  ms    gate'
);
for (const r of rows) {
	const m = r.metrics;
	console.log(
		`  ${r.label.padEnd(24)} ${String(r.ok).padStart(2)}/${String(r.failed).padEnd(2)}  ` +
			(m
				? `${m.compressionRate.toFixed(1).padStart(5)} ${pct(m.englishShare).padStart(5)} ` +
					`${pct(m.oneSegmentShare).padStart(6)} ${pct(m.threeBeatShare).padStart(6)} ` +
					`${String(m.medianWords).padStart(4)} ${r.avgThink.toFixed(0).padStart(6)} ` +
					`${r.avgLatency.toFixed(0).padStart(5)}  ${r.gatePass ? 'pass' : 'FAIL'}`
				: '   — all calls failed —')
	);
}
console.log(
	`\n  targets: cmp>=${TARGETS.compressionRate}  en>=${pct(TARGETS.englishShare)}  ` +
		`run-on>=${pct(TARGETS.oneSegmentShare)}  3beat<=${pct(TARGETS.threeBeatShare)}  ` +
		`medw>=${TARGETS.medianWords}`
);
console.log(`  corpus:  cmp 8.5   en 19%   run-on 54%   3beat 4%   medw 18\n`);

for (const r of rows) {
	console.log(`── ${r.label}${r.note ? ` (${r.note})` : ''}`);
	if (r.firstError) console.log(`   first error: ${r.firstError}`);
	if (r.gateFailures?.length) for (const f of r.gateFailures) console.log(`   - ${f}`);
	for (const s of r.samples) console.log(`   e.g. ${s}`);
	console.log();
}
