/**
 * Pure text helpers applied between the LLM and the database.
 *
 * Kept out of server/bhaify.ts so they can be tested without a DB connection —
 * that module instantiates the Neon client at import time.
 */

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
