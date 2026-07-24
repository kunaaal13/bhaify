/**
 * Input screening (PLAN.md §8).
 *
 * The product is a rewrite engine, so the obvious misuse is "make this insult a
 * specific person". Defence is layered:
 *   1. this module — hard blocks on the small set of things we never process
 *   2. the system prompt — deflects targeted abuse into generic philosophy
 *   3. is_flagged + the report flow — catches what the first two miss
 *
 * Deliberately narrow. A rewriter that refuses ordinary rudeness is useless for
 * a bhai persona, which is blunt by design. This blocks category harms, not tone.
 */

export type BlockReason = 'slur' | 'sexual-minor' | 'threat' | 'too-short' | 'too-long';

export interface SafetyVerdict {
	ok: boolean;
	reason?: BlockReason;
}

/**
 * Substring patterns that are never processed.
 *
 * Kept as fragments rather than a slur list in plain sight; matched against
 * letters-only text so spacing/punctuation evasion ("n i g") doesn't slip past.
 * This is intentionally minimal — it is not a general moderation system, and it
 * is not the primary defence.
 */
const HARD_BLOCK = [
	// Ethnic/racial slurs (fragments, letters-only match).
	'nigg',
	'chink',
	'kike',
	'spic',
	'faggot',
	'tranny',
	// Caste slurs common in the target locale.
	'bhangi',
	'chamar',
	// Sexual content involving minors — always blocked, no exceptions.
	'childporn',
	'cp0rn',
	'loli',
	'preteen'
];

/** Credible-threat shapes. Rough by design; the prompt handles the rest. */
const THREAT_PATTERNS = [
	/\bi (?:will|am going to|wanna|want to) (?:kill|murder|stab|shoot|rape)\b/i,
	/\b(?:kill|shoot|stab) (?:you|him|her|them)\b.*\b(?:tonight|tomorrow|today|address)\b/i,
	/\bhow (?:do i|to) (?:make|build) a? ?(?:bomb|explosive)\b/i
];

export const MIN_INPUT_LENGTH = 2;
export const MAX_INPUT_LENGTH = 500;

/** Strips everything but letters, so "n-i-g-g" and "n i g g" collapse together. */
function lettersOnly(s: string): string {
	return s.toLowerCase().replace(/[^a-z]/g, '');
}

export function screenInput(raw: string): SafetyVerdict {
	const trimmed = raw.trim();

	if (trimmed.length < MIN_INPUT_LENGTH) return { ok: false, reason: 'too-short' };
	if (trimmed.length > MAX_INPUT_LENGTH) return { ok: false, reason: 'too-long' };

	const flat = lettersOnly(trimmed);
	for (const frag of HARD_BLOCK) {
		if (flat.includes(frag)) {
			return { ok: false, reason: frag.match(/child|cp0|loli|preteen/) ? 'sexual-minor' : 'slur' };
		}
	}

	for (const re of THREAT_PATTERNS) {
		if (re.test(trimmed)) return { ok: false, reason: 'threat' };
	}

	return { ok: true };
}

/** User-facing copy. In voice, because a bhai app shouldn't break character to scold. */
export function blockMessage(reason: BlockReason): string {
	switch (reason) {
		case 'too-short':
			return 'Itna chhota ? Thoda aur likho bhai .';
		case 'too-long':
			return `Bohot lamba hai . ${MAX_INPUT_LENGTH} characters se kam rakho .`;
		case 'slur':
		case 'sexual-minor':
		case 'threat':
			return 'Yeh nahi ho payega . Kuch aur likho .';
	}
}

/**
 * Screens model output before it is stored or shown.
 *
 * The model can echo a slur that was spelled around our input filter. Cheaper to
 * re-screen the output than to widen the input filter until it blocks real use.
 */
export function screenOutput(text: string): SafetyVerdict {
	const flat = lettersOnly(text);
	for (const frag of HARD_BLOCK) {
		if (flat.includes(frag)) {
			return { ok: false, reason: frag.match(/child|cp0|loli|preteen/) ? 'sexual-minor' : 'slur' };
		}
	}
	return { ok: true };
}
