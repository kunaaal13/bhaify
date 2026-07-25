/**
 * Deterministic post-processor (PLAN.md §4.3).
 *
 * Division of labour: the LLM owns meaning, structure and move-selection; this
 * owns the surface. LLMs reliably under-apply orthographic tics and drift back
 * toward clean prose after a sentence or two, so the spelling and punctuation
 * quirks are force-applied here instead of hoped for in the prompt.
 *
 * Everything is seeded, so a permalink renders identically forever.
 *
 * Two guarantees the tests enforce:
 *   1. Idempotence — running twice must not compound (" ." must not become "  .",
 *      "yaaar" must not grow every pass).
 *   2. Quoted spans are never touched. If the user quoted something, that text is
 *      theirs and mangling it changes their meaning rather than its voice.
 */
import { Rng } from './rng';
import {
	SMS_LEXICON,
	HINDI_DOUBLING,
	ELONGATABLE,
	ELLIPSES,
	GERUND_MIN_LENGTH,
	toLookup,
	type Substitution,
	type Tier
} from './lexicon';

/**
 * Every probability in one object so the whole feel can be tuned without
 * touching logic. These are deliberately below 1.0: the corpus is inconsistent,
 * and 100% substitution reads like a cipher rather than a person typing fast.
 *
 * `midSentenceCaps` was REMOVED, not set to 0 — see the note at the bottom of
 * this file for why it cannot work mechanically.
 *
 * `commaSpaceDeletion` dropped 0.25 -> 0.15. The corpus has 7 instances across 51
 * tweets, and now that output is comma-spliced run-on prose rather than clipped
 * beats there are far more commas for it to land on. At 0.25 a four-comma line
 * averaged one deletion, which is more than the source material does.
 */
export const QUIRK_RATES = {
	lexicon: { high: 0.72, medium: 0.42, low: 0.18 } satisfies Record<Tier, number>,
	hindiDoubling: 0.8,
	gerundClipping: 0.35,
	spaceBeforeTerminal: 0.6,
	commaSpaceDeletion: 0.15,
	ellipsisVariation: 0.5,
	elongation: 0.3
} as const;

export interface QuirkifyResult {
	text: string;
	/**
	 * 0..1 — how much work THIS pass did, not how styled the result is. Persisted
	 * and returned by the API, but no component renders it (PLAN.md §4.3 claiming
	 * it is "surfaced as QUIRK DENSITY telemetry in the UI" is stale).
	 *
	 * Do not start rendering it. It reads 0 exactly when the model already wrote
	 * good voice and left nothing to fix — it measures us, not the artefact. Use
	 * countStyleMarkers or metrics.ts for anything user-facing.
	 */
	density: number;
	/** Per-transform hit counts. Useful for the eval harness and debugging. */
	applied: Record<string, number>;
}

const SMS_LOOKUP = toLookup(SMS_LEXICON);
const HINDI_LOOKUP = toLookup(HINDI_DOUBLING);

/** Matches quoted spans (straight or curly). Contents are protected. */
const QUOTED = /("[^"]*"|“[^”]*”|'[^']{6,}')/g;

/** Preserves the source word's capitalisation when substituting. */
function matchCase(source: string, replacement: string): string {
	if (source[0] === source[0]?.toUpperCase() && source.slice(1) === source.slice(1).toLowerCase()) {
		return replacement[0].toUpperCase() + replacement.slice(1);
	}
	if (source === source.toUpperCase() && source.length > 1) return replacement.toUpperCase();
	return replacement;
}

function alreadyElongated(word: string): boolean {
	return /(.)\1{2,}/.test(word);
}

/** Applies a substitution table across word tokens at its tier's rate. */
function applyLexicon(
	tokens: string[],
	lookup: Map<string, Substitution>,
	rng: Rng,
	rateFor: (s: Substitution) => number,
	tally: () => void
): void {
	for (let i = 0; i < tokens.length; i++) {
		const tok = tokens[i];
		// Split leading/trailing punctuation off so "you," still matches "you".
		const m = /^([^\w]*)([\w']+)([^\w]*)$/.exec(tok);
		if (!m) continue;
		const [, pre, word, post] = m;
		const sub = lookup.get(word.toLowerCase());
		if (!sub) continue;
		if (!rng.chance(rateFor(sub))) continue;
		tokens[i] = pre + matchCase(word, sub.to) + post;
		tally();
	}
}

function applyGerundClipping(tokens: string[], rng: Rng, tally: () => void): void {
	for (let i = 0; i < tokens.length; i++) {
		const m = /^([^\w]*)([\w']+)([^\w]*)$/.exec(tokens[i]);
		if (!m) continue;
		const [, pre, word, post] = m;
		if (word.length < GERUND_MIN_LENGTH) continue;
		if (!/ing$/i.test(word)) continue;
		// "thing", "king", "ring" are not gerunds — require a real stem.
		if (!/[a-z]{3,}ing$/i.test(word)) continue;
		if (!rng.chance(QUIRK_RATES.gerundClipping)) continue;
		tokens[i] = pre + word.slice(0, -1) + post;
		tally();
	}
}

/**
 * Stretches an interjection's final vowel — but only at a clause boundary.
 *
 * The corpus stretches at points of rhetorical stress, which in practice means
 * the edge of a clause: "Thinking mein bhi takla ho ja oooooon" (end),
 * "Zintaaaaaaaaa hahaha u too funny" (start), "Hmmmmmmmm ahhhhhhhhhhh , jaane
 * do" (before a comma). It never stretches a word buried mid-clause, which is
 * what the unrestricted version did — producing "Yaarrrrr thak gaya hoon iss job
 * se", where the stretch lands on an unstressed word and reads as a bug.
 *
 * `tokens` alternates word/whitespace (see quirkifySpan), so a boundary means:
 * first or last word in the span, or adjacent to punctuation.
 */
function applyElongation(tokens: string[], rng: Rng, tally: () => void): void {
	const wordIdx = tokens
		.map((t, i) => (/[\w']/.test(t) ? i : -1))
		.filter((i) => i >= 0);
	if (!wordIdx.length) return;

	const first = wordIdx[0];
	const last = wordIdx[wordIdx.length - 1];

	for (const i of wordIdx) {
		const m = /^([^\w]*)([\w']+)([^\w]*)$/.exec(tokens[i]);
		if (!m) continue;
		const [, pre, word, post] = m;
		if (!ELONGATABLE.includes(word.toLowerCase())) continue;
		// Idempotence guard: never stretch something already stretched.
		if (alreadyElongated(word)) continue;

		// Clause boundary: span edge, or punctuation attached to this token, or the
		// token that follows ends a clause.
		const atEdge = i === first || i === last;
		const touchesPunct = /[^\w\s]/.test(pre) || /[^\w\s]/.test(post);
		const nextEndsClause = /^[\s]*[,.?!…]/.test(tokens.slice(i + 1).join('').slice(0, 3));
		if (!atEdge && !touchesPunct && !nextEndsClause) continue;

		if (!rng.chance(QUIRK_RATES.elongation)) continue;
		const tail = word[word.length - 1];
		tokens[i] = pre + word + tail.repeat(3 + rng.int(5)) + post;
		tally();
	}
}

/** Punctuation-level transforms. Each is written to be naturally idempotent. */
function applyPunctuation(text: string, rng: Rng, bump: (k: string) => void): string {
	let out = text;

	// Space before terminal punctuation: "Khamosh." -> "Khamosh ."
	// Requires a word char immediately before, so a second pass finds nothing.
	out = out.replace(/(\w)([.?!])/g, (whole, w: string, p: string) => {
		if (!rng.chance(QUIRK_RATES.spaceBeforeTerminal)) return whole;
		bump('spaceBeforeTerminal');
		return `${w} ${p}`;
	});

	// Drop the space after a comma: "Zinta, Congratulations" -> "Zinta,Congratulations"
	// After removal there is no space left to match.
	out = out.replace(/,\s(?=\w)/g, (whole) => {
		if (!rng.chance(QUIRK_RATES.commaSpaceDeletion)) return whole;
		bump('commaSpaceDeletion');
		return ',';
	});

	// Vary trailing ellipsis length. Capped so repeated passes stay bounded.
	out = out.replace(/(\.{3,}|…+)/g, (whole) => {
		if (!rng.chance(QUIRK_RATES.ellipsisVariation)) return whole;
		bump('ellipsisVariation');
		return rng.pick(ELLIPSES);
	});

	return out;
}

/*
 * REMOVED: midSentenceCaps.
 *
 * The corpus really does capitalise mid-sentence — "Galat jawaab Dena",
 * "you Figure out", "Well done Zinta,Congratulations Zinta". But it lands on
 * words under rhetorical stress: the imperative verb, the turn of the argument.
 *
 * A uniform 7% chance per eligible word cannot tell stress from filler, so in
 * production it hit ordinary nouns instead — "Roz rath ko Loud music bajata hai",
 * "Salt Check kar raha hoon", "bohot Din ho gaye". Those read as a rendering bug,
 * not a voice, and a reader who spots one stops trusting the whole line.
 *
 * Stress is a semantic judgement, so it belongs to the LLM. It is demonstrated in
 * the few-shots and stated in VOICE_RULES instead of being forced here.
 */

/**
 * Applies the full quirk pass to one span of unprotected text.
 */
function quirkifySpan(span: string, rng: Rng, applied: Record<string, number>): string {
	const bump = (k: string) => {
		applied[k] = (applied[k] ?? 0) + 1;
	};

	// Keep whitespace as tokens so joining restores the original spacing exactly.
	const tokens = span.split(/(\s+)/);

	applyLexicon(
		tokens,
		SMS_LOOKUP,
		rng,
		(s) => QUIRK_RATES.lexicon[s.tier],
		() => bump('smsLexicon')
	);
	applyLexicon(
		tokens,
		HINDI_LOOKUP,
		rng,
		() => QUIRK_RATES.hindiDoubling,
		() => bump('hindiDoubling')
	);
	applyGerundClipping(tokens, rng, () => bump('gerundClipping'));
	applyElongation(tokens, rng, () => bump('elongation'));

	return applyPunctuation(tokens.join(''), rng, bump);
}

/**
 * Force-applies the bhai orthography.
 *
 * @param seed derived from (cache_key, variant_slot) — see rng.hashSeed
 */
export function quirkify(input: string, seed: number): QuirkifyResult {
	const rng = new Rng(seed);
	const applied: Record<string, number> = {};

	// Split into alternating unquoted/quoted spans. String.split with a capturing
	// group puts the delimiters at odd indices — those are the quoted spans, left
	// untouched.
	const parts = input.split(QUOTED);
	const rebuilt = parts
		.map((part, i) => (i % 2 === 1 ? part : quirkifySpan(part, rng, applied)))
		.join('');

	const hits = Object.values(applied).reduce((a, b) => a + b, 0);
	const words = rebuilt.split(/\s+/).filter((w) => /\w/.test(w)).length || 1;
	// Roughly "quirks per word", clamped. ~0.5 reads as heavily styled.
	const density = Math.min(1, hits / words);

	return { text: rebuilt, density, applied };
}
