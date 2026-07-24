import { describe, it, expect } from 'vitest';
import { quirkify, QUIRK_RATES } from './quirkify';
import { Rng, hashSeed, deterministicSample } from './rng';
import { SMS_LEXICON, HINDI_DOUBLING, buildLexiconRegex, toLookup } from './lexicon';

const SAMPLES = [
	'you should not waste your time on this because it is not important',
	'I am going to the gym and then I will come back home',
	'what is the capital of France',
	'Khamosh.',
	'i forgot my password again, badam khaane padenge',
	'thinking of tweeting today, but nothing to say... maybe tomorrow',
	'arre yaar what is happening here',
	'soch samajh ke jawab dena, aram se',
	'hello',
	'a'
];

describe('Rng', () => {
	it('is deterministic for a seed', () => {
		const a = Array.from({ length: 20 }, () => new Rng(7).next());
		expect(new Set(a).size).toBe(1); // fresh Rng(7) always starts identically
	});

	it('produces a stable sequence', () => {
		const seq = (seed: number) => {
			const r = new Rng(seed);
			return Array.from({ length: 10 }, () => r.next());
		};
		expect(seq(123)).toEqual(seq(123));
		expect(seq(123)).not.toEqual(seq(124));
	});

	it('survives a zero seed (xorshift fixed point)', () => {
		const r = new Rng(0);
		const vals = Array.from({ length: 5 }, () => r.next());
		expect(new Set(vals).size).toBeGreaterThan(1);
		expect(vals.every((v) => v >= 0 && v < 1)).toBe(true);
	});

	it('hashSeed is stable and well distributed', () => {
		expect(hashSeed('abc')).toBe(hashSeed('abc'));
		expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
		const seeds = new Set(Array.from({ length: 200 }, (_, i) => hashSeed(`input-${i}`)));
		expect(seeds.size).toBe(200);
	});

	it('deterministicSample is stable and non-repeating', () => {
		const items = [1, 2, 3, 4, 5, 6, 7, 8];
		expect(deterministicSample(items, 4, 9)).toEqual(deterministicSample(items, 4, 9));
		expect(new Set(deterministicSample(items, 8, 3)).size).toBe(8);
	});
});

describe('lexicon', () => {
	it('sorts longest-first so "your" is not eaten by "you"', () => {
		const re = buildLexiconRegex(SMS_LEXICON);
		expect('your'.replace(re, (m) => `[${m}]`)).toBe('[your]');
	});

	it('has no substitution whose output is another substitution input', () => {
		// Otherwise a second quirkify pass would re-substitute and compound.
		const sources = new Set([...SMS_LEXICON, ...HINDI_DOUBLING].map((s) => s.from.toLowerCase()));
		for (const s of [...SMS_LEXICON, ...HINDI_DOUBLING]) {
			expect(sources.has(s.to.toLowerCase())).toBe(false);
		}
	});

	it('has no duplicate keys', () => {
		expect(toLookup(SMS_LEXICON).size).toBe(SMS_LEXICON.length);
		expect(toLookup(HINDI_DOUBLING).size).toBe(HINDI_DOUBLING.length);
	});
});

describe('quirkify — determinism', () => {
	it('same input + same seed always gives the same text', () => {
		for (const s of SAMPLES) {
			expect(quirkify(s, 42).text).toBe(quirkify(s, 42).text);
		}
	});

	it('different seeds give different text (permalink variants stay distinct)', () => {
		const long = SAMPLES[0];
		const variants = new Set([0, 1, 2].map((slot) => quirkify(long, hashSeed(`k-${slot}`)).text));
		expect(variants.size).toBeGreaterThan(1);
	});
});

describe('quirkify — idempotence', () => {
	it('does not compound when applied twice', () => {
		for (const s of SAMPLES) {
			const once = quirkify(s, 11).text;
			const twice = quirkify(once, 11).text;
			// No doubled space before punctuation.
			expect(twice).not.toMatch(/\s{2,}[.?!]/);
			// No runaway vowel stretching.
			expect(twice).not.toMatch(/(.)\1{9,}/);
			// No runaway ellipsis.
			expect(twice).not.toMatch(/\.{7,}/);
		}
	});

	it('keeps word count stable across passes', () => {
		// Counted as \w+ runs, not whitespace-separated tokens: comma-space
		// deletion legitimately joins "a, b" into "a,b", which changes the token
		// count without adding or losing a word.
		const words = (t: string) => (t.match(/\w+/g) ?? []).length;
		for (const s of SAMPLES) {
			const once = quirkify(s, 5).text;
			expect(words(quirkify(once, 5).text)).toBe(words(once));
		}
	});

	it('stays bounded in length over repeated passes', () => {
		let t = SAMPLES[0];
		const start = t.length;
		for (let i = 0; i < 8; i++) t = quirkify(t, 3).text;
		expect(t.length).toBeLessThan(start * 2);
	});
});

describe('quirkify — quoted text is protected', () => {
	it('leaves double-quoted spans byte-identical', () => {
		const quoted = 'he said "you should not be waiting for anything" and left';
		const out = quirkify(quoted, 8).text;
		expect(out).toContain('"you should not be waiting for anything"');
	});

	it('still transforms text outside the quotes', () => {
		const input = 'you told me "you should not go" and you would not listen because of it';
		// Force high rates by trying several seeds; at least one must alter the outside.
		const changed = [1, 2, 3, 4, 5, 6].some((seed) => {
			const out = quirkify(input, seed).text;
			return out !== input && out.includes('"you should not go"');
		});
		expect(changed).toBe(true);
	});

	it('handles curly quotes too', () => {
		const out = quirkify('bhai said “you would not understand” today', 4).text;
		expect(out).toContain('“you would not understand”');
	});

	it('does not lose text when quotes are unbalanced', () => {
		const input = 'he said "you should not go and then left';
		const out = quirkify(input, 2).text;
		expect(out.length).toBeGreaterThan(input.length * 0.7);
		expect(out).toMatch(/left$/);
	});
});

describe('quirkify — transforms', () => {
	it('applies SMS compression somewhere across seeds', () => {
		const input = 'you should not waste your time because it is just not important';
		const anyCompressed = Array.from({ length: 25 }, (_, i) => quirkify(input, i).text).some((t) =>
			/\bu\b|\bnt\b|\bur\b|\bcoz\b|\bjst\b/.test(t)
		);
		expect(anyCompressed).toBe(true);
	});

	it('doubles Hindi vowels', () => {
		const anyDoubled = Array.from(
			{ length: 25 },
			(_, i) => quirkify('soch samajh ke jawab dena', i).text
		).some((t) => /sooch|samaaj|jawaab/.test(t));
		expect(anyDoubled).toBe(true);
	});

	it('puts a space before terminal punctuation somewhere', () => {
		const anySpaced = Array.from(
			{ length: 25 },
			(_, i) => quirkify('Khamosh. Bolo bolo.', i).text
		).some((t) => / [.?!]/.test(t));
		expect(anySpaced).toBe(true);
	});

	it('preserves capitalisation of substituted words', () => {
		const out = Array.from({ length: 40 }, (_, i) => quirkify('You are late', i).text);
		// Whenever "You" became "u", it should have stayed capitalised as "U".
		for (const t of out) {
			expect(t).not.toMatch(/^u\b/);
		}
	});

	it('does not clip short -ing words that are not gerunds', () => {
		// Case-insensitive: mid-sentence capitalisation may legitimately turn
		// "king" into "King". What must never happen is clipping to "kin"/"rin".
		for (let i = 0; i < 40; i++) {
			const t = quirkify('the king wore a ring', i).text;
			expect(t).toMatch(/\bking\b/i);
			expect(t).toMatch(/\bring\b/i);
			expect(t).not.toMatch(/\bkin\b|\brin\b/i);
		}
	});

	it('leaves text with no quirk opportunities alone', () => {
		expect(quirkify('xyz', 1).text).toBe('xyz');
	});
});

describe('quirkify — density telemetry', () => {
	it('reports 0 for untouched text', () => {
		expect(quirkify('xyz', 1).density).toBe(0);
	});

	it('reports a bounded score', () => {
		for (const s of SAMPLES) {
			for (const seed of [1, 2, 3]) {
				const { density } = quirkify(s, seed);
				expect(density).toBeGreaterThanOrEqual(0);
				expect(density).toBeLessThanOrEqual(1);
			}
		}
	});

	it('scores a quirk-rich sentence above a quirk-free one', () => {
		const rich = Array.from({ length: 20 }, (_, i) =>
			quirkify('you would not understand because your time is just not there', i)
		).reduce((a, r) => a + r.density, 0);
		const plain = Array.from({ length: 20 }, (_, i) => quirkify('xyz qrs tuv', i)).reduce(
			(a, r) => a + r.density,
			0
		);
		expect(rich).toBeGreaterThan(plain);
	});

	it('counts every applied transform', () => {
		const { applied, density } = quirkify(SAMPLES[0], 15);
		const total = Object.values(applied).reduce((a, b) => a + b, 0);
		if (total === 0) expect(density).toBe(0);
		else expect(density).toBeGreaterThan(0);
	});
});

describe('QUIRK_RATES', () => {
	it('keeps every rate below 1 — total consistency reads like a cipher', () => {
		const rates = [
			...Object.values(QUIRK_RATES.lexicon),
			QUIRK_RATES.hindiDoubling,
			QUIRK_RATES.gerundClipping,
			QUIRK_RATES.spaceBeforeTerminal,
			QUIRK_RATES.commaSpaceDeletion,
			QUIRK_RATES.ellipsisVariation,
			QUIRK_RATES.midSentenceCaps,
			QUIRK_RATES.elongation
		];
		for (const r of rates) {
			expect(r).toBeGreaterThan(0);
			expect(r).toBeLessThan(1);
		}
	});
});
