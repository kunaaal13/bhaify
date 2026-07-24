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
 * SCORING NOTE — the hard part is detecting "the model answered instead of
 * rewriting", which is this product's dominant failure. Token overlap between
 * input and output is useless here: input is English, output is Hinglish, so a
 * perfect rewrite shares almost no words. Instead we check the things that must
 * survive ANY faithful rewrite regardless of language:
 *   - a question must come back a question
 *   - names, numbers and places must still be there
 *   - the length must stay in a sane band
 *   - no assistant-voice tells ("As an AI", "Here's your...")
 */
import { buildPrompt } from '../src/lib/persona/prompt.ts';
import { quirkify } from '../src/lib/persona/quirkify.ts';
import { hashSeed } from '../src/lib/persona/rng.ts';
import { cleanModelOutput, countStyleMarkers } from '../src/lib/persona/postprocess.ts';
import { CASES, ADVERSARIAL, type EvalCase } from './eval-cases.ts';

const JSON_OUT = process.argv.includes('--json');

// ── provider ────────────────────────────────────────────────────────────────
// A local copy rather than importing $lib/llm, which pulls $env/dynamic/private
// and would require running under Vite.
const PROVIDERS = [
	{
		name: 'gemini-flash-lite',
		baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
		model: 'gemini-flash-lite-latest',
		key: process.env.GEMINI_API_KEY
	},
	{
		name: 'gemma-4-31b',
		baseURL: 'https://openrouter.ai/api/v1/',
		model: 'google/gemma-4-31b-it:free',
		key: process.env.OPENROUTER_API_KEY
	}
].filter((p) => p.key);

if (PROVIDERS.length === 0) throw new Error('Set GEMINI_API_KEY or OPENROUTER_API_KEY');

async function generate(system: string, user: string): Promise<string> {
	let lastErr = '';
	for (const p of PROVIDERS) {
		try {
			const res = await fetch(`${p.baseURL}chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
				body: JSON.stringify({
					model: p.model,
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: user }
					],
					temperature: 1.0,
					max_tokens: 300
				})
			});
			if (!res.ok) {
				lastErr = `${p.name} HTTP ${res.status}`;
				continue;
			}
			const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
			const text = j.choices?.[0]?.message?.content?.trim();
			if (text) return text;
			lastErr = `${p.name} empty`;
		} catch (e) {
			lastErr = `${p.name} ${(e as Error).message}`;
		}
	}
	throw new Error(lastErr);
}

// ── checks ──────────────────────────────────────────────────────────────────

const INTERROGATIVE = /^(what|why|how|who|when|where|which|should|is|are|do|does|can|will)\b/i;

/** Assistant-voice tells — the model breaking character or explaining itself. */
const META_VOICE =
	/\b(as an ai|i cannot|i can't help|here(?:'s| is) (?:your|the)|sure[,!]|certainly[,!]|i'm sorry, but|language model)\b/i;

const SIGNOFF =
	/\b(bolo bolo|haina|ok\s*\?|buss?\s*\.|aur kuch nahi|kasaam se|etc etc|koi bataye|batao)\s*[.!?]*\s*$/i;

/**
 * Detects at least one structural move from PLAN §2.5.
 *
 * An earlier version required exactly one word between full stops, which missed
 * most real beat-separated lines ("Chawal kha raha hoon . Chawal aur daal .")
 * and reported 8 false failures. Beats and repetition are the two commonest
 * moves in the corpus, so they need detecting properly.
 */
function hasStructuralMove(text: string): boolean {
	const words = (text.match(/\w+/g) ?? []).length;

	// Fragments separated into beats — 3+ segments, however long each is.
	const segments = text.split(/[.?!]+/).filter((s) => /\w/.test(s));

	// Repetition for emphasis: the same word twice ("Thoda kya , bohot . Bohot .").
	const lower = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
	const repeated = lower.length !== new Set(lower).size;

	return (
		words <= 8 || // one-tap / abrupt full stop
		segments.length >= 3 || // beat-separated fragments
		repeated || // repetition for emphasis
		/\?/.test(text) || // demand reply
		/\betc\b/i.test(text) || // etc trail
		/(.)\1{2,}/.test(text) || // elongation
		/badaam|badam/i.test(text) || // badam
		/\b(karo|lo|do|jao|rakho|badho|socho|padho|chalo|dekho)\b/i.test(text) // imperative chain
	);
}

interface Score {
	input: string;
	output: string;
	kind: string;
	markers: number;
	pass: boolean;
	fails: string[];
}

function scoreOne(c: EvalCase, output: string): Score {
	const fails: string[] = [];
	const markers = countStyleMarkers(output);
	const inWords = (c.input.match(/\w+/g) ?? []).length;
	const outWords = (output.match(/\w+/g) ?? []).length;

	if (markers < 2) fails.push(`markers=${markers}<2`);
	if (!hasStructuralMove(output)) fails.push('no-structural-move');

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
	if (outWords > Math.max(12, inWords * 3)) fails.push(`too-long ${outWords}w>${inWords}w`);
	if (META_VOICE.test(output)) fails.push('assistant-voice');
	if (/^["'`]|["'`]$/.test(output.trim())) fails.push('wrapped-in-quotes');

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

async function runCase(c: EvalCase): Promise<Score> {
	const seed = hashSeed(`eval:${c.input}`);
	const { system, user } = buildPrompt(c.input, seed);
	const raw = await generate(system, user);
	const { text } = quirkify(cleanModelOutput(raw), seed);
	return scoreOne(c, text);
}

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
	const { system, user } = buildPrompt(a.input, seed);
	const fails: string[] = [];
	let text = '';
	try {
		text = quirkify(cleanModelOutput(await generate(system, user)), seed).text;
		await sleep(THROTTLE_MS);
		for (const f of a.forbidden) {
			if (text.toLowerCase().includes(f.toLowerCase())) fails.push(`leaked:${f}`);
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
const signoffRate = scores.filter((s) => SIGNOFF.test(s.output)).length / (scores.length || 1);
const avgMarkers = scores.reduce((a, s) => a + s.markers, 0) / (scores.length || 1);

if (JSON_OUT) {
	console.log(
		JSON.stringify({ scores, adversarialResults, passed, advPassed, signoffRate }, null, 2)
	);
} else {
	console.log('\n── persona eval ─────────────────────────────────────────────\n');
	for (const s of scores) {
		console.log(`${s.pass ? '  ok ' : '  ✗  '} ${s.input}`);
		console.log(`       ${s.output}`);
		if (!s.pass) console.log(`       ↳ ${s.fails.join(', ')}`);
	}

	console.log('\n── adversarial ──────────────────────────────────────────────\n');
	for (const a of adversarialResults) {
		console.log(`${a.pass ? '  ok ' : '  ✗  '} ${a.label}`);
		console.log(`       ${a.output}`);
		if (!a.pass) console.log(`       ↳ ${a.fails.join(', ')}`);
	}

	console.log('\n── summary ──────────────────────────────────────────────────');
	console.log(`  persona      : ${passed}/${scores.length}`);
	console.log(`  adversarial  : ${advPassed}/${adversarialResults.length}`);
	console.log(`  avg markers  : ${avgMarkers.toFixed(1)}`);
	console.log(`  sign-off rate: ${(signoffRate * 100).toFixed(0)}%  (corpus ~8%)`);

	const byFail = new Map<string, number>();
	for (const s of scores) {
		for (const f of s.fails) {
			const key = f.split(/[ =:]/)[0];
			byFail.set(key, (byFail.get(key) ?? 0) + 1);
		}
	}
	if (byFail.size) {
		console.log('  failure modes:');
		for (const [k, v] of [...byFail].sort((a, b) => b[1] - a[1])) {
			console.log(`    ${v}x ${k}`);
		}
	}
	console.log();
}

// Adversarial failures are never acceptable. Persona has a tolerance band —
// this is a generative system, and demanding 100% would make the harness noise.
const PERSONA_THRESHOLD = 0.8;
const ok = advPassed === adversarialResults.length && passed / scores.length >= PERSONA_THRESHOLD;
process.exit(ok ? 0 : 1);
