/**
 * Persona eval harness (PLAN.md §9).
 *
 * Runs fixed inputs through the real prompt + quirkify path and scores the
 * outputs. Run it after ANY prompt, few-shot, or lexicon change — persona drift
 * is silent otherwise, and the sign-off regression proved it.
 *
 *   npx tsx --env-file=.env scripts/eval.ts
 *   npx tsx --env-file=.env scripts/eval.ts --json    # machine-readable
 *
 * Deliberately bypasses the HTTP and DB layers: this measures the PERSONA, and
 * routing through /api/bhaify would hit the rate limiter and the cache, neither
 * of which is under test here. Imports are relative rather than $lib because the
 * script runs under plain tsx, without Vite's alias resolution.
 *
 * SCORING — two independent axes, because they fail independently.
 *
 * FIDELITY (per output). "The model answered instead of rewriting" is the
 * product's dominant failure. Token overlap is useless for detecting it: input is
 * English, output is Hinglish, so a perfect rewrite shares almost no words.
 * Instead we check what must survive ANY faithful rewrite regardless of language:
 *   - a question must come back a question
 *   - names, numbers and places must still be there
 *   - the length must stay in a sane band
 *   - no assistant-voice tells ("As an AI", "Here's your...")
 *
 * STYLE (per batch, see metrics.ts). Inconsistency IS the style, so style cannot
 * be judged one output at a time — a single line that compresses nothing is
 * fine, a batch where nothing compresses is broken. The old harness scored style
 * per-output via `countStyleMarkers >= 2` and a `segments >= 3` "structural move"
 * check, both of which were passed by clean three-beat Hindi. It certified the
 * failure mode. Style now goes through batchMetrics/checkTargets instead.
 */
import { buildPrompt } from '../src/lib/persona/prompt.ts';
import { quirkify } from '../src/lib/persona/quirkify.ts';
import { hashSeed } from '../src/lib/persona/rng.ts';
import { cleanModelOutput, countStyleMarkers } from '../src/lib/persona/postprocess.ts';
import {
	batchMetrics,
	checkTargets,
	styleMetrics,
	TARGETS
} from '../src/lib/persona/metrics.ts';
import { CASES, ADVERSARIAL, type EvalCase } from './eval-cases.ts';
import { scriptGenerate } from './_providers.ts';

const JSON_OUT = process.argv.includes('--json');

// ── checks ──────────────────────────────────────────────────────────────────

const INTERROGATIVE = /^(what|why|how|who|when|where|which|should|is|are|do|does|can|will)\b/i;

/** Assistant-voice tells — the model breaking character or explaining itself. */
const META_VOICE =
	/\b(as an ai|i cannot|i can't help|here(?:'s| is) (?:your|the)|sure[,!]|certainly[,!]|i'm sorry, but|language model)\b/i;

interface Score {
	input: string;
	output: string;
	kind: string;
	markers: number;
	pass: boolean;
	fails: string[];
}

/**
 * Fidelity only — did it rewrite the input faithfully. Style is judged across the
 * batch, not here; see the module header.
 */
function scoreOne(c: EvalCase, output: string): Score {
	const fails: string[] = [];
	const markers = countStyleMarkers(output);
	const inWords = (c.input.match(/\w+/g) ?? []).length;
	const outWords = (output.match(/\w+/g) ?? []).length;

	// A question must stay a question — the sharpest signal that it rewrote
	// rather than answered.
	if (c.kind === 'question' || INTERROGATIVE.test(c.input.trim())) {
		if (!output.includes('?')) fails.push('question-not-preserved');
	}

	// Entities must survive. If "France" goes in and never comes out, the model
	// either answered the question or drifted off the input.
	for (const token of c.mustKeep ?? []) {
		if (!output.toLowerCase().includes(token.toLowerCase())) fails.push(`dropped:${token}`);
	}

	if (outWords < inWords * 0.5) fails.push(`too-short ${outWords}w<${inWords}w`);
	// Ceiling is deliberately loose: the corpus rambles up to 39 words off a
	// one-line thought, and clamping to 3x input is part of what produced clipped
	// three-beat output. Runaway padding is still caught.
	if (outWords > Math.max(30, inWords * 4)) fails.push(`too-long ${outWords}w>${inWords}w`);
	if (META_VOICE.test(output)) fails.push('assistant-voice');
	if (/^["'`]|["'`]$/.test(output.trim())) fails.push('wrapped-in-quotes');
	if (!output.trim()) fails.push('empty');

	return { input: c.input, output, kind: c.kind, markers, pass: fails.length === 0, fails };
}

// ── run ─────────────────────────────────────────────────────────────────────

/**
 * Free tiers rate-limit hard, and a full run is ~36 calls. Without a pause the
 * tail of the run 429s and shows up as persona failures, which is worse than
 * slow — it makes the harness lie about the thing it exists to measure.
 */
const THROTTLE_MS = Number(process.env.EVAL_THROTTLE_MS ?? 2500);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Always slot 0 — the default run-on shape, and the only take most users see.
 * Rotating slots here would improve coverage but break comparability with earlier
 * runs, which is the entire point of a fixed harness. Use scripts/bakeoff.ts when
 * you want all three shapes exercised.
 */
async function runCase(c: EvalCase): Promise<Score> {
	const seed = hashSeed(`eval:${c.input}`);
	const { system, user } = buildPrompt(c.input, seed, 0);
	const { text: raw, model } = await scriptGenerate(system, user);
	const { text } = quirkify(cleanModelOutput(raw), seed);
	servedBy.set(model, (servedBy.get(model) ?? 0) + 1);
	return scoreOne(c, text);
}

/**
 * Which provider actually served each case. Reported because a run served
 * entirely by the fallback is measuring the wrong model — and silently, since the
 * output still looks like output.
 */
const servedBy = new Map<string, number>();

const scores: Score[] = [];
for (const c of CASES) {
	try {
		scores.push(await runCase(c));
		await sleep(THROTTLE_MS);
	} catch (e) {
		scores.push({
			input: c.input,
			output: '',
			kind: c.kind,
			markers: 0,
			pass: false,
			fails: [`error: ${(e as Error).message}`]
		});
	}
}

const adversarialResults: { label: string; output: string; pass: boolean; fails: string[] }[] = [];
for (const a of ADVERSARIAL) {
	const seed = hashSeed(`eval-adv:${a.input}`);
	const { system, user } = buildPrompt(a.input, seed, 0);
	const fails: string[] = [];
	let text = '';
	try {
		const gen = await scriptGenerate(system, user);
		servedBy.set(gen.model, (servedBy.get(gen.model) ?? 0) + 1);
		text = quirkify(cleanModelOutput(gen.text), seed).text;
		await sleep(THROTTLE_MS);
		for (const f of a.forbidden) {
			if (text.toLowerCase().includes(f.toLowerCase())) fails.push(`leaked:${f}`);
		}
		const bare = text.toLowerCase().replace(/[^a-z0-9]/g, '');
		for (const p of a.mustNotBe ?? []) {
			if (bare === p.toLowerCase().replace(/[^a-z0-9]/g, '')) fails.push(`obeyed:${p}`);
		}
		if (META_VOICE.test(text)) fails.push('assistant-voice');
	} catch (e) {
		fails.push(`error: ${(e as Error).message}`);
	}
	adversarialResults.push({ label: a.label, output: text, pass: fails.length === 0, fails });
}

// ── report ──────────────────────────────────────────────────────────────────

const passed = scores.filter((s) => s.pass).length;
const advPassed = adversarialResults.filter((a) => a.pass).length;

const style = batchMetrics(
	scores.map((s) => s.output),
	scores.map((s) => s.input)
);
// singleShape: every case runs on slot 0, so the run-on ceiling does not apply —
// see GateOptions. Rotating shapes is scripts/bakeoff.ts's job.
const styleGate = checkTargets(style, { singleShape: true });

if (JSON_OUT) {
	console.log(
		JSON.stringify({ scores, adversarialResults, passed, advPassed, style, styleGate }, null, 2)
	);
} else {
	const pct = (x: number) => `${(100 * x).toFixed(0)}%`;

	console.log('\n── fidelity ─────────────────────────────────────────────────\n');
	for (const s of scores) {
		const m = styleMetrics(s.output, s.input);
		console.log(`${s.pass ? '  ok ' : '  ✗  '} ${s.input}`);
		console.log(`       ${s.output}`);
		console.log(
			`       ${m.wordCount}w  ${m.segments}seg  cmp=${m.compressed}  en=${pct(m.englishShare)}${m.isThreeBeat ? '  [3-beat]' : ''}`
		);
		if (!s.pass) console.log(`       ↳ ${s.fails.join(', ')}`);
	}

	console.log('\n── adversarial ──────────────────────────────────────────────\n');
	for (const a of adversarialResults) {
		console.log(`${a.pass ? '  ok ' : '  ✗  '} ${a.label}`);
		console.log(`       ${a.output}`);
		if (!a.pass) console.log(`       ↳ ${a.fails.join(', ')}`);
	}

	console.log('\n── style (batch) ────────────────────────────────────────────');
	console.log(
		`  compression    ${style.compressionRate.toFixed(1)} /100w   (target ${TARGETS.compressionRate}, corpus 8.5)`
	);
	console.log(
		`  compressing    ${pct(style.anyCompressionShare)}        (target ${pct(TARGETS.anyCompressionShare)}, corpus 50%)`
	);
	console.log(
		`  english-base   ${pct(style.englishShare)}        (target ${pct(TARGETS.englishShare)}, corpus 19%)`
	);
	console.log(
		`  run-ons        ${pct(style.oneSegmentShare)}        (target ${pct(TARGETS.oneSegmentShare)}, corpus 54%)`
	);
	console.log(
		`  three-beat     ${pct(style.threeBeatShare)}        (under ${pct(TARGETS.threeBeatShare)}, corpus 4%)`
	);
	console.log(
		`  words med/max  ${style.medianWords} / ${style.maxWords}       (target median ${TARGETS.medianWords}, corpus 18/83)`
	);
	console.log(
		`  sign-offs      ${pct(style.signoffShare)}        (under ${pct(TARGETS.signoffShare)}, corpus 8%)`
	);
	if (style.repeatedPhrases.length) {
		console.log('  repeated phrases:');
		for (const { phrase, count } of style.repeatedPhrases.slice(0, 5)) {
			console.log(`    ${count}x  "${phrase}"`);
		}
	}

	console.log('\n── summary ──────────────────────────────────────────────────');
	console.log(`  fidelity     : ${passed}/${scores.length}`);
	console.log(`  adversarial  : ${advPassed}/${adversarialResults.length}`);
	console.log(
		`  served by    : ${[...servedBy].map(([m, c]) => `${m}=${c}`).join('  ') || '(none)'}`
	);
	console.log(`  style gate   : ${styleGate.pass ? 'pass' : 'FAIL'}`);
	for (const x of styleGate.failures) console.log(`    - ${x}`);

	const byFail = new Map<string, number>();
	for (const s of scores) {
		for (const f of s.fails) {
			const key = f.split(/[ =:]/)[0];
			byFail.set(key, (byFail.get(key) ?? 0) + 1);
		}
	}
	if (byFail.size) {
		console.log('  fidelity failures:');
		for (const [k, v] of [...byFail].sort((a, b) => b[1] - a[1])) {
			console.log(`    ${v}x ${k}`);
		}
	}
	console.log();
}

// Adversarial failures are never acceptable. Fidelity has a tolerance band — this
// is a generative system and demanding 100% would make the harness noise. The
// style gate is batch-level and all-or-nothing: every threshold sits below what
// the real corpus scores, so a failure means the output is measurably not in
// voice, not that it got unlucky.
const FIDELITY_THRESHOLD = 0.8;
const ok =
	advPassed === adversarialResults.length &&
	passed / scores.length >= FIDELITY_THRESHOLD &&
	styleGate.pass;
process.exit(ok ? 0 : 1);
