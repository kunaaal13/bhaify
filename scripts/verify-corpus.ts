/**
 * Guards the corpus against transcription drift.
 *
 * corpus.ts was hand-classified, so its text was retyped from the raw scrape.
 * Every entry must still match research/tweets.json exactly, modulo two allowed
 * edits: trailing t.co URLs stripped, and truncated records shortened.
 *
 * Run: npx tsx scripts/verify-corpus.ts
 */
import { readFileSync } from 'node:fs';
import { CORPUS } from '../src/lib/persona/corpus.ts';

interface RawTweet {
	text: string;
	date: string;
	likes: number;
}

const raw: RawTweet[] = JSON.parse(readFileSync('research/tweets.json', 'utf8'));

const norm = (s: string) =>
	s
		.replace(/https?:\/\/t\.co\/\w+/g, '')
		// The scrape stores line breaks as a literal backslash-n, not a real newline.
		.replace(/\\n/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

let exact = 0;
let prefix = 0;
let recovered = 0;
const problems: string[] = [];

for (const entry of CORPUS) {
	const candidates = raw.filter((r) => r.date === entry.date && r.likes === entry.likes);

	if (candidates.length === 0) {
		problems.push(`NO SOURCE ROW  ${entry.date} likes=${entry.likes}\n    "${entry.text}"`);
		continue;
	}

	const a = norm(entry.text);
	const matched = candidates.find((c) => norm(c.text) === a);
	if (matched) {
		exact++;
		continue;
	}

	// Recovered records extend the source: the scrape clipped them, we restored
	// the tail. Valid only when the (shorter) source is a prefix of ours.
	if (entry.recovered) {
		const restored = candidates.find((c) => a.startsWith(norm(c.text).replace(/\\$/, '').trim()));
		if (restored) {
			recovered++;
			continue;
		}
		problems.push(
			`RECOVERED TEXT DIVERGES FROM SOURCE  ${entry.date}\n    ours: "${a}"\n    src:  "${norm(candidates[0].text)}"`
		);
		continue;
	}

	// A non-recovered entry may only be a prefix if it's flagged unusable.
	const asPrefix = candidates.find((c) => norm(c.text).startsWith(a));
	if (asPrefix) {
		prefix++;
		if (entry.usable) {
			problems.push(
				`TRUNCATED BUT MARKED USABLE  ${entry.date}\n    ours: "${a}"\n    src:  "${norm(asPrefix.text)}"`
			);
		}
		continue;
	}

	problems.push(
		`TEXT MISMATCH  ${entry.date}\n    ours: "${a}"\n    src:  "${norm(candidates[0].text)}"`
	);
}

console.log(`corpus entries : ${CORPUS.length}  (source rows: ${raw.length})`);
console.log(`exact matches  : ${exact}`);
console.log(`recovered      : ${recovered}  (source was clipped, tail restored)`);
console.log(`prefix matches : ${prefix}  (still truncated)`);
console.log(`usable         : ${CORPUS.filter((t) => t.usable).length}`);

const registers = new Map<string, number>();
const moves = new Map<string, number>();
for (const t of CORPUS) {
	if (!t.usable) continue;
	registers.set(t.register, (registers.get(t.register) ?? 0) + 1);
	for (const m of t.moves) moves.set(m, (moves.get(m) ?? 0) + 1);
}
console.log('\nregisters:', Object.fromEntries([...registers].sort((a, b) => b[1] - a[1])));
console.log('moves    :', Object.fromEntries([...moves].sort((a, b) => b[1] - a[1])));

if (problems.length) {
	console.error(`\n✗ ${problems.length} problem(s):\n`);
	for (const p of problems) console.error('  ' + p + '\n');
	process.exit(1);
}
console.log('\n✓ corpus matches source');
