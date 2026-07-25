/**
 * Measurable style metrics — the persona's actual scoreboard.
 *
 * WHY THIS EXISTS
 *
 * The original eval scored `countStyleMarkers >= 2` plus "has a structural
 * move". Both were satisfiable by the exact output we did not want:
 *
 *   - `countStyleMarkers` counted /aa|oo|uu/, so pure Hindi transliteration
 *     ("khaana", "poori", "aachi") scored high for free, and counted every
 *     " ." — so a three-beat line banked three markers before saying anything.
 *   - `hasStructuralMove` passed on `segments >= 3`, which IS the three-beat
 *     template. The harness was certifying the failure mode.
 *
 * Measured against the 51-tweet corpus, the gap the old metrics could not see:
 *
 *                              corpus    old few-shots   old live output
 *   SMS tokens / 100 words       13.1             1.4          ~0 from model
 *   English function-word share  22.5%            0.2%         ~5%
 *   dominant shape          1 segment (55%)   2-3 beats (84%)  3 beats
 *   median / max words           17 / 39          7 / 18       8 / 20
 *
 * So the three things worth measuring are: does it compress, is it English-based,
 * and does it breathe in one long run rather than three clipped beats. Everything
 * here is batch-aware where it needs to be — inconsistency is the style, so a
 * per-output check cannot see whether the batch as a whole varies.
 */
import { SMS_LEXICON } from './lexicon';

/**
 * Compressed forms to DETECT. Seeded from what quirkify can produce, plus forms
 * that appear in the corpus but have no substitution rule (`ull`, `yr`, `sayin`,
 * `warmin`, `cals`, `bu`) — the model may well write those itself, and detection
 * should credit them even though the transformer never emits them.
 *
 * Detection is deliberately broader than transformation. Keeping them in one
 * table would force the two jobs to stay identical, and they should not be.
 */
const EXTRA_COMPRESSED = [
	'ull',
	'yr',
	'k',
	'nite',
	'sayin',
	'warmin',
	'cals',
	'bu',
	'thts',
	'wat',
	'dis',
	'gud',
	'gd',
	'mrng',
	'bhut',
	'bht',
	'kal',
	'aaj'
];

/**
 * Hinglish words excluded from the compressed set even though they look like
 * abbreviations. `kal` and `aaj` are ordinary Hindi words, not compressions —
 * crediting them would inflate the score on pure-Hindi output, which is the
 * bias this module exists to remove.
 */
const NOT_COMPRESSION = new Set(['kal', 'aaj', 'bhut', 'bht']);

export const COMPRESSED_FORMS: string[] = [
	...new Set([...SMS_LEXICON.map((s) => s.to), ...EXTRA_COMPRESSED])
].filter((w) => !NOT_COMPRESSION.has(w));

const COMPRESSED_RE = new RegExp(`\\b(${COMPRESSED_FORMS.join('|')})\\b`, 'gi');

/** Uncompressed English words that a bhai line SHOULD have compressed. */
const COMPRESSIBLE_RE = new RegExp(
	`\\b(${SMS_LEXICON.map((s) => s.from.replace(/'/g, "'?")).join('|')})\\b`,
	'gi'
);

/**
 * English function words. The marker of an English *skeleton* — content words
 * (nouns like "coffee", "job", "phone") survive into pure-Hindi output too, so
 * they say nothing about which language the sentence is built in.
 */
const EN_FUNCTION_RE =
	/\b(the|is|are|was|were|a|an|to|of|and|for|it|that|this|these|my|i|you|your|have|has|with|on|in|at|but|not|so|be|do|does|did|if|all|only|their|too|no|nt|u|n|bt|hv|dnt|wld|coz|jst|from|frm|there|thr|when|wen|now|nw|just|because)\b/gi;

const words = (text: string): string[] => text.match(/[A-Za-z']+/g) ?? [];

export interface StyleMetrics {
	/** Compressed tokens per 100 words. Corpus 2010-12 era: 13.1. */
	compressionRate: number;
	/** Raw count of compressed tokens. */
	compressed: number;
	/**
	 * Of the words that COULD have been compressed, the fraction that were.
	 * Diagnoses "wrote English but spelled it out properly".
	 */
	compressionCoverage: number;
	/** English function words as a share of all words. Corpus: 22.5%. */
	englishShare: number;
	/** Sentence-ish segments. Corpus is 1-segment dominant. */
	segments: number;
	wordCount: number;
	/** Single digits standing in for words ("2 ways", "b offered 1"). */
	numerals: number;
	/** True if the line matches `clause . short . short .` — the template to kill. */
	isThreeBeat: boolean;
}

/**
 * Metrics for one output.
 *
 * `input` is optional and only affects `numerals`: a digit that came from the
 * user ("i ran 10 km") is not a style choice, so digits already present in the
 * input are not credited.
 */
export function styleMetrics(text: string, input?: string): StyleMetrics {
	const w = words(text);
	const wordCount = w.length || 1;

	const compressed = (text.match(COMPRESSED_RE) ?? []).length;
	const compressible = (text.match(COMPRESSIBLE_RE) ?? []).length;

	const outDigits = text.match(/\b\d\b/g) ?? [];
	const inDigits = new Set(input?.match(/\b\d\b/g) ?? []);
	const numerals = outDigits.filter((d) => !inDigits.has(d)).length;

	const segs = text.split(/[.?!]+/).filter((s) => /\w/.test(s));

	// The template: a lead clause, then two or more short stub beats.
	const stubs = segs.slice(1).filter((s) => (s.match(/[\w']+/g) ?? []).length <= 4);
	const isThreeBeat = segs.length >= 3 && stubs.length >= 2;

	return {
		compressionRate: (100 * compressed) / wordCount,
		compressed,
		compressionCoverage: compressible + compressed > 0 ? compressed / (compressible + compressed) : 0,
		englishShare: (text.match(EN_FUNCTION_RE) ?? []).length / wordCount,
		segments: segs.length,
		wordCount: w.length,
		numerals,
		isThreeBeat
	};
}

export interface BatchMetrics {
	n: number;
	/** Mean compressed tokens per 100 words across the batch. */
	compressionRate: number;
	/** Share of outputs containing at least one compressed token. Corpus: 51%. */
	anyCompressionShare: number;
	compressionCoverage: number;
	englishShare: number;
	/** segments -> share of outputs. Should lean toward 1, like the corpus. */
	shapeDistribution: Record<number, number>;
	oneSegmentShare: number;
	threePlusSegmentShare: number;
	/** Share matching the `clause . short . short .` template. Should be low. */
	threeBeatShare: number;
	medianWords: number;
	maxWords: number;
	/** Trigrams recurring across DIFFERENT outputs, worst first. */
	repeatedPhrases: { phrase: string; count: number }[];
	/** Share of outputs ending in a sign-off tag. Corpus: ~8%. */
	signoffShare: number;
	/**
	 * Share of outputs with essentially no English skeleton — i.e. a Hindi
	 * translation rather than a re-voicing.
	 *
	 * Exists because the MEAN hides bimodality, which is how free-tier models
	 * actually fail here. A batch averaging 9% English is not 31 lines at 9%; it is
	 * roughly a third of them at 30% and a third at 0%. The zero ones are the
	 * broken-looking output, and a mean target lets them hide behind the good ones.
	 */
	pureHindiShare: number;
}

/**
 * Closers that the corpus uses rarely and the old few-shots used constantly.
 * Anchored to end-of-string.
 */
export const SIGNOFF_RE =
	/\b(bolo bolo|haina|ok|buss?|aur kuch nahi|kasaam se|etc etc|koi bata\w*|batao|socho|soch lo|aage badho|badaam khao|khyaal rakho)\s*[.!?]*\s*$/i;

/**
 * Trigrams that are structural rather than stylistic tics. "soch lo samaj" is a
 * real corpus phrase; it only becomes a problem when it lands on every output,
 * which is what `repeatedPhrases` measures — so nothing is excluded here, the
 * count is the signal.
 */
function trigrams(text: string): Set<string> {
	const w = (text.toLowerCase().match(/[a-z']+/g) ?? []);
	const out = new Set<string>();
	for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
	return out;
}

/** Aggregates a batch. Pass the inputs alongside so numerals can be discounted. */
export function batchMetrics(outputs: string[], inputs?: string[]): BatchMetrics {
	const n = outputs.length || 1;
	const per = outputs.map((o, i) => styleMetrics(o, inputs?.[i]));

	const counts = new Map<string, number>();
	for (const o of outputs) {
		// Per-output Set, so a phrase repeated inside ONE line counts once — we are
		// looking for the same phrase reused across different inputs.
		for (const g of trigrams(o)) counts.set(g, (counts.get(g) ?? 0) + 1);
	}

	const wc = per.map((p) => p.wordCount).sort((a, b) => a - b);
	const shape: Record<number, number> = {};
	for (const p of per) shape[p.segments] = (shape[p.segments] ?? 0) + 1;
	for (const k of Object.keys(shape)) shape[+k] = shape[+k] / n;

	const mean = (f: (p: StyleMetrics) => number) => per.reduce((a, p) => a + f(p), 0) / n;

	return {
		n: outputs.length,
		compressionRate: mean((p) => p.compressionRate),
		anyCompressionShare: per.filter((p) => p.compressed > 0).length / n,
		compressionCoverage: mean((p) => p.compressionCoverage),
		englishShare: mean((p) => p.englishShare),
		shapeDistribution: shape,
		oneSegmentShare: per.filter((p) => p.segments <= 1).length / n,
		threePlusSegmentShare: per.filter((p) => p.segments >= 3).length / n,
		threeBeatShare: per.filter((p) => p.isThreeBeat).length / n,
		medianWords: wc[Math.floor(wc.length / 2)] ?? 0,
		maxWords: wc[wc.length - 1] ?? 0,
		repeatedPhrases: [...counts]
			.filter(([, c]) => c > 1)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([phrase, count]) => ({ phrase, count })),
		signoffShare: outputs.filter((o) => SIGNOFF_RE.test(o)).length / n,
		pureHindiShare: per.filter((p) => p.englishShare < 0.05).length / n
	};
}

/**
 * Batch-level pass thresholds.
 *
 * CALIBRATION, and the honest caveat.
 *
 * The peak-era corpus (2010-2015, what PLAN.md §2.7 calibrates toward) measures
 * compression 9.1/100w and English share 18%. The few-shot set is written to match
 * that. Live output then lands at roughly 0.65x the example set on BOTH axes —
 * measured, repeatedly, across eval runs: examples at 12.3/18% produce output at
 * ~7/11%. Small models regress toward clean prose and there is no prompt wording
 * that closes that gap.
 *
 * So these numbers encode a MODEL limitation, not a view about the voice. They are
 * set at corpus x 0.65 rather than at corpus, because a gate that can never go
 * green is a gate nobody reads — which is precisely how the previous harness ended
 * up certifying output that felt nothing like him.
 *
 * Two consequences worth being explicit about:
 *  - Do NOT "fix" a failing run by lowering these. The examples are already at
 *    corpus texture; below that the spec itself stops being bhai.
 *  - When the model improves (Phase 4 — free-tier bake-off, or paid later), raise
 *    these toward the corpus figures. That is the intended direction of travel.
 *
 * `anyCompressionShare` and `pureHindiShare` are the strict ones and are set at
 * corpus level, not discounted. Means can be carried by good outputs; those two
 * measure the floor, and the floor is what reads as broken.
 */
export const TARGETS = {
	compressionRate: 6,
	englishShare: 0.11,
	/** Strict — corpus level. At least half of outputs must compress something. */
	anyCompressionShare: 0.5,
	/** Strict — a third of outputs being pure Hindi translation is the failure. */
	pureHindiShare: 0.35,
	/** Run-on-dominant, like the corpus — not three clipped beats. */
	oneSegmentShare: 0.35,
	threeBeatShare: 0.25,
	medianWords: 11,
	/**
	 * Length has a CEILING as well as a floor.
	 *
	 * Added after the run-on rules overshot: pushing away from clipped three-beat
	 * output drove median length to 28 words against the corpus's 18, and 13 of 31
	 * outputs tripped the fidelity length check. The gate had only a minimum, so it
	 * reported a clean pass while the harness's other axis was failing — the same
	 * blind spot as before, pointing the other way.
	 */
	medianWordsMax: 24,
	/**
	 * Run-ons must DOMINATE, not monopolise. The corpus is 54% one-segment; at 90%
	 * the output is uniformly rambling, which is its own template.
	 */
	oneSegmentShareMax: 0.8,
	signoffShare: 0.15,
	/** No trigram may appear in more than this share of outputs. */
	maxRepeatShare: 0.2
} as const;

export interface GateResult {
	pass: boolean;
	failures: string[];
}

export interface GateOptions {
	/**
	 * Set when every output in the batch was generated under the SAME slot shape
	 * (e.g. scripts/eval.ts pins slot 0 for run-to-run comparability).
	 *
	 * Skips `oneSegmentShareMax`. That ceiling measures variety ACROSS shapes, and
	 * slot 0's directive is "write one run-on" — so a slot-0-only batch is supposed
	 * to be ~100% run-ons, and flagging it is the metric misreading its own input.
	 * Variety is a cross-slot property; scripts/bakeoff.ts rotates slots and is
	 * where this ceiling actually means something.
	 */
	singleShape?: boolean;
}

/** Checks a batch against TARGETS. This is the gate that Phase 1 has to move. */
export function checkTargets(m: BatchMetrics, opts: GateOptions = {}): GateResult {
	const f: string[] = [];
	const pct = (x: number) => `${Math.round(x * 100)}%`;

	if (m.compressionRate < TARGETS.compressionRate)
		f.push(`compression ${m.compressionRate.toFixed(1)}/100w < ${TARGETS.compressionRate}`);
	if (m.anyCompressionShare < TARGETS.anyCompressionShare)
		f.push(`only ${pct(m.anyCompressionShare)} of outputs compress anything`);
	if (m.englishShare < TARGETS.englishShare)
		f.push(`english-base ${pct(m.englishShare)} < ${pct(TARGETS.englishShare)} (too Hindi)`);
	if (m.pureHindiShare > TARGETS.pureHindiShare)
		f.push(
			`${pct(m.pureHindiShare)} of outputs are pure Hindi translation > ${pct(TARGETS.pureHindiShare)}`
		);
	if (m.oneSegmentShare < TARGETS.oneSegmentShare)
		f.push(`run-ons ${pct(m.oneSegmentShare)} < ${pct(TARGETS.oneSegmentShare)}`);
	if (!opts.singleShape && m.oneSegmentShare > TARGETS.oneSegmentShareMax)
		f.push(
			`run-ons ${pct(m.oneSegmentShare)} > ${pct(TARGETS.oneSegmentShareMax)} (uniformly rambling)`
		);
	if (m.threeBeatShare > TARGETS.threeBeatShare)
		f.push(`three-beat template ${pct(m.threeBeatShare)} > ${pct(TARGETS.threeBeatShare)}`);
	if (m.medianWords < TARGETS.medianWords)
		f.push(`median ${m.medianWords}w < ${TARGETS.medianWords}w (too clipped)`);
	if (m.medianWords > TARGETS.medianWordsMax)
		f.push(`median ${m.medianWords}w > ${TARGETS.medianWordsMax}w (padded)`);
	if (m.signoffShare > TARGETS.signoffShare)
		f.push(`sign-offs ${pct(m.signoffShare)} > ${pct(TARGETS.signoffShare)}`);

	const worst = m.repeatedPhrases[0];
	if (worst && worst.count / m.n > TARGETS.maxRepeatShare)
		f.push(`"${worst.phrase}" in ${worst.count}/${m.n} outputs`);

	return { pass: f.length === 0, failures: f };
}
