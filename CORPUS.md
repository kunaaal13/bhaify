# Corpus provenance

The persona in this project is derived from a reference corpus of **52 verbatim
tweets** from [@BeingSalmanKhan](https://x.com/BeingSalmanKhan), spanning
**2010–2026**.

## Source

Primary source: **[apnakyalenadena.com](https://apnakyalenadena.com)** — a
fan-curated "Shitposting King Hall of Fame" by **Zaid**, which collects 52
tweets across six categories with engagement figures and dates. Credit to that
project; this repo would not have a usable corpus without it.

The tweets were extracted from that site's embedded RSC payload rather than
retyped. Extraction script: `research/extract.py`. Raw output:
`research/tweets.json`.

Cross-checked against listicle coverage (inuth, ScoopWhoop, Koimoi) to confirm
no major tweets outside the set were missed.

## Recovered records

Three records were clipped in the original scrape and later restored. They are
flagged `recovered: true` in `src/lib/persona/corpus.ts`.

| Date       | Why it was clipped                                                        | Restored from                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2010-04-17 | Tweet contains a `"`, which terminated the extractor's string match early | Rendered HTML of the same page                                                                                                                                                                                                                                                                                                                                   |
| 2010-08-08 | Same cause — embedded `"` around a quoted fan tweet                       | Rendered HTML of the same page                                                                                                                                                                                                                                                                                                                                   |
| 2026-05-18 | X's own embed truncates long tweets behind "Show more"                    | Press coverage quoting it in full ([ANI](https://aninews.in/news/entertainment/bollywood/logon-ke-saath-reh-kar-pak-jaata-hu-salman-khan-clarifies-viral-lonely-post20260519090050/), [Bollywood Hungama](https://www.bollywoodhungama.com/news/features/salman-khan-clarifies-alone-and-lonely-post-after-social-media-speculation-how-can-i-be-alone-when-i/)) |

Because recovered entries are _longer_ than `research/tweets.json`,
`scripts/verify-corpus.ts` accepts them only when the raw source text is a strict
prefix of the corpus text.

## Classification is ours, not the source's

`register` and `moves` in `corpus.ts` are our own analysis. The scrape only
carried a wing label for the first tweet of each group (6 of 52), and the
structural taxonomy the prompt actually needs (PLAN.md §2.5) doesn't exist
upstream. Six registers, fourteen structural moves — see `corpus.ts`.

## How it is used

**Internal grounding data only.** The corpus informs few-shot selection and eval
scoring. It is **never rendered as a product feature** — we do not reproduce the
hall-of-fame site, and no page displays the corpus. See PLAN.md §8.

## Verification

```bash
npx tsx scripts/verify-corpus.ts
```

Checks every entry in `corpus.ts` still matches `research/tweets.json` (modulo
stripped `t.co` URLs and the three recovered records), and reports register and
move distribution. Run it after any edit to the corpus — a silent typo there
degrades the entire persona.

## Legal

The corpus is reference material for a parody/fan project. See PLAN.md §8 for the
project's full position on name, likeness, and image sourcing.
