/**
 * Surface-level orthography tables, derived from the corpus (PLAN.md §2.1–2.2).
 *
 * These drive the deterministic quirk pass. They are tiered by how often the
 * corpus actually uses each form — applying every substitution at 100% produces
 * something that reads like a cipher, not like a person. The real texts are
 * INCONSISTENT: the same word appears compressed in one clause and spelled out
 * in the next. Tiers let quirkify reproduce that.
 */

/** How aggressively a substitution should fire. Rates live in quirkify.ts. */
export type Tier = 'high' | 'medium' | 'low';

export interface Substitution {
	/** Matched case-insensitively on word boundaries. */
	from: string;
	to: string;
	tier: Tier;
}

/**
 * SMS-era compression. Heaviest in the 2010–2011 tweets, which is the register
 * we calibrate toward.
 *
 * Ordering note: longer keys must be matched before shorter ones that are their
 * prefixes (e.g. `your` before `you`), otherwise `your` becomes `ur` via the
 * wrong rule. buildLexiconRegex() sorts for this — don't rely on array order.
 */
export const SMS_LEXICON: Substitution[] = [
	// ── Tier: high. These are near-universal in the corpus. ──
	{ from: 'you', to: 'u', tier: 'high' },
	{ from: 'your', to: 'ur', tier: 'high' },
	{ from: 'and', to: 'n', tier: 'high' },
	{ from: 'not', to: 'nt', tier: 'high' },
	{ from: "don't", to: 'dnt', tier: 'high' },
	{ from: 'would', to: 'wld', tier: 'high' },
	{ from: 'because', to: 'coz', tier: 'high' },
	{ from: 'just', to: 'jst', tier: 'high' },
	{ from: 'please', to: 'plz', tier: 'high' },

	// ── Tier: medium. Common but he also spells these out. ──
	{ from: 'be', to: 'b', tier: 'medium' },
	{ from: 'have', to: 'hv', tier: 'medium' },
	{ from: 'but', to: 'bt', tier: 'medium' },
	{ from: 'where', to: 'whr', tier: 'medium' },
	{ from: 'people', to: 'ppl', tier: 'medium' },
	{ from: 'some', to: 'sm', tier: 'medium' },
	{ from: 'them', to: 'em', tier: 'medium' },
	{ from: 'back', to: 'bk', tier: 'medium' },
	{ from: 'when', to: 'wen', tier: 'medium' },
	{ from: 'now', to: 'nw', tier: 'medium' },
	{ from: 'from', to: 'frm', tier: 'medium' },
	{ from: 'there', to: 'thr', tier: 'medium' },
	{ from: 'very', to: 'vry', tier: 'medium' },
	{ from: 'down', to: 'dwn', tier: 'medium' },
	{ from: 'know', to: 'kno', tier: 'medium' },
	{ from: 'right', to: 'rite', tier: 'medium' },
	{ from: 'about', to: 'abt', tier: 'medium' },
	{ from: 'tonight', to: 'tonite', tier: 'medium' },
	{ from: 'tomorrow', to: 'tom', tier: 'medium' },
	{ from: 'will', to: 'vil', tier: 'medium' },

	// ── Tier: low. Distinctive but sparse — overuse makes it a parody of itself. ──
	{ from: 'come', to: 'cm', tier: 'low' },
	{ from: 'for', to: 'fr', tier: 'low' },
	{ from: 'understand', to: 'undrstnd', tier: 'low' },
	{ from: 'goodnight', to: 'gnit', tier: 'low' },
	{ from: 'tweet', to: 'twt', tier: 'low' },
	{ from: 'without', to: 'wthout', tier: 'low' },
	{ from: 'everything', to: 'evrything', tier: 'low' },
	{ from: 'anything', to: 'anythin', tier: 'low' }
];

/**
 * Hindi transliterated by ear. The doubled vowel is the signature — he writes
 * what the word sounds like held slightly too long.
 */
export const HINDI_DOUBLING: Substitution[] = [
	{ from: 'jawab', to: 'jawaab', tier: 'high' },
	{ from: 'aram', to: 'aaraam', tier: 'high' },
	{ from: 'soch', to: 'sooch', tier: 'high' },
	{ from: 'samajh', to: 'samaaj', tier: 'high' },
	{ from: 'badam', to: 'badaam', tier: 'high' },
	{ from: 'khayal', to: 'khyaal', tier: 'high' },
	{ from: 'apna', to: 'aapna', tier: 'high' },
	{ from: 'bas', to: 'buss', tier: 'high' },
	{ from: 'kasam', to: 'kasaam', tier: 'medium' },
	{ from: 'hisab', to: 'hisaab', tier: 'medium' },
	{ from: 'zuban', to: 'zubaan', tier: 'medium' },
	{ from: 'mehfuz', to: 'mehfooz', tier: 'medium' },
	{ from: 'raat', to: 'rath', tier: 'low' },
	{ from: 'chalo', to: 'challo', tier: 'medium' },
	{ from: 'bakwas', to: 'bakwass', tier: 'medium' }
];

/**
 * Gerund clipping: walking → walkin. Applied as a suffix rule rather than a word
 * list. Guarded against short words where it reads as a typo rather than a style
 * (`king` must not become `kin`).
 */
export const GERUND_MIN_LENGTH = 6;

/**
 * Interjections that get their final vowel stretched at end of line.
 * "Zintaaaaaaaaa", "ho ja oooooon", "ahhhhhhhhhhh".
 */
export const ELONGATABLE = ['arre', 'arrey', 'yaar', 'haan', 'oh', 'ah', 'hmm', 'chalo', 'bhai'];

/** Laughter tokens, appended occasionally. Corpus uses both freely, often stacked. */
export const LAUGHTER = ['hehehe', 'hahahaha', 'hehe', 'hahaha', 'hehehehehe', 'haha'];

/** Trailing shrugs of varying length (PLAN.md §2.3). */
export const ELLIPSES = ['...', '....', '.....', '……', '…', '…..'];

/**
 * Sign-off phrases that can close a line. Straight from the corpus.
 * These are the strongest single tell, so quirkify applies them sparingly.
 */
export const SIGN_OFFS = [
	'Bus aur kuch nahi',
	'Ok?',
	'Haina ? Bolo bolo',
	'Kasaam se',
	'etc etc',
	'Ab iske aage you Figure out',
	'Aapna kya lena dena',
	'Khamosh .',
	'too much fun !',
	'Chill maro yaar'
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds one alternation regex for a substitution table.
 *
 * Sorted longest-first so `your` wins over `you` — JS alternation is leftmost-
 * first, not longest-match, so without this `your` would substitute as `ur` +
 * a stray `r`.
 */
export function buildLexiconRegex(table: Substitution[]): RegExp {
	const sorted = [...table].sort((a, b) => b.from.length - a.from.length);
	return new RegExp(`\\b(${sorted.map((s) => escapeRe(s.from)).join('|')})\\b`, 'gi');
}

/** Lookup keyed on lowercased source word. */
export function toLookup(table: Substitution[]): Map<string, Substitution> {
	return new Map(table.map((s) => [s.from.toLowerCase(), s]));
}
