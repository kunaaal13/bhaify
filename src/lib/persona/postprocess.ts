/**
 * Pure text helpers applied between the LLM and the database.
 *
 * Kept out of server/bhaify.ts so they can be tested without a DB connection —
 * that module instantiates the Neon client at import time.
 */
import { COMPRESSED_FORMS } from './metrics';

/** Built from metrics.ts so the display count and the eval score never diverge. */
const COMPRESSED_MARKER_RE = new RegExp(`\\b(${COMPRESSED_FORMS.join('|')})\\b`, 'gi');

/**
 * Strips the wrapper text models add despite being told not to: surrounding
 * quotes, a "Here's your..." preamble, stray markdown fences.
 */
export function cleanModelOutput(raw: string): string {
	let text = raw.trim();

	// Fenced block, with or without a language tag.
	text = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');

	// Conversational preamble. Anchored to the start so it can't eat real content.
	text = text.replace(/^(?:here(?:'s| is)[^:\n]{0,40}:|bhaified(?:\s+version)?:|output:)\s*/i, '');
	text = text.trim();

	// Unwrap only when the WHOLE string is quoted. An internal quote is content —
	// the corpus itself has a tweet that quotes someone.
	if (text.length > 1) {
		const pairs: Record<string, string> = { '"': '"', '“': '”', "'": "'" };
		const first = text[0];
		const last = text[text.length - 1];
		if (pairs[first] === last && !text.slice(1, -1).includes(last)) {
			text = text.slice(1, -1).trim();
		}
	}

	return text;
}

/**
 * Counts style markers actually present in the finished text.
 *
 * Distinct from quirkify's `density`, which measures how many transforms WE
 * applied. When the model already writes in voice, quirkify has nothing to do
 * and density is 0 — which reads as "broken" if shown to a user looking at
 * obviously-styled output. This scores the artefact rather than our activity,
 * so it stays meaningful either way.
 *
 * TWO FREEBIES REMOVED (see metrics.ts for the measurements):
 *
 * 1. `/aa|oo|uu/` used to be counted. Pure Hindi transliteration is full of
 *    doubled vowels — "khaana", "poori", "aachi" — so translating to clean Hindi
 *    scored high here while containing none of the SMS orthography that actually
 *    makes the voice. It rewarded the dominant failure mode.
 *
 * 2. Space-before-terminal is capped at 2. It is a real marker, but uncapped it
 *    paid out once per beat, so the three-beat template banked three markers for
 *    free before writing a single word in voice.
 *
 * Compression is the load-bearing marker, so it is counted from the same table
 * metrics.ts scores against rather than a second hand-maintained list.
 */
export function countStyleMarkers(text: string): number {
	let n = 0;
	n += Math.min(2, (text.match(/\s[.?!]/g) ?? []).length); // space before terminal punctuation
	n += (text.match(/,\S/g) ?? []).length; // missing space after comma
	n += (text.match(/\?\?|!!|\?!/g) ?? []).length; // stacked marks
	n += (text.match(/\.{3,}|…/g) ?? []).length; // trailing shrug
	n += (text.match(/(.)\1{2,}/g) ?? []).length; // elongation
	n += (text.match(COMPRESSED_MARKER_RE) ?? []).length; // SMS compression
	n += (text.match(/\b\d\b/g) ?? []).length; // numeral standing in for a word
	n += (text.match(/\b(he|ha)(he|ha)+\b/gi) ?? []).length; // laughter
	return n;
}

/**
 * Which register the output leans toward.
 *
 * A heuristic, and only ever used as display telemetry — nothing branches on it,
 * so a wrong guess costs nothing.
 */
export function inferRegister(text: string): string {
	const words = (text.match(/\w+/g) ?? []).length;

	if (words <= 6) return 'one-tap';
	if (/badaam|badam/i.test(text)) return 'plot-twist';
	if (/\bfamily|maa\b|mummy|behen|dua|bhai log/i.test(text)) return 'wholesome';
	if (/\?\s*$|bolo bolo|batao|haina/i.test(text)) return 'demand-reply';
	if (/\b(karo|lo|do|rakho|badhao|jao|chalo)\b/i.test(text)) return 'main-character';
	if (words > 28) return 'plot-twist';
	return 'time-capsule';
}
