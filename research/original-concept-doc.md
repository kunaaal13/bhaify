# Bhai AI — Project Plan

_Text-only AI chatbot with a confident, filmy "Bollywood bhai" personality._

## 1. Concept

A text-only chatbot with a big-brother, filmy persona — Hindi-English mixed,
catchphrases, dramatic one-liners, motivational-but-savage advice. No audio,
no avatar. The personality is the entire product.

## 2. Legal / brand safety

Salman Khan is a real, identifiable public figure. India has strong
personality/publicity-rights case law (Anil Kapoor, Amitabh Bachchan, Arijit
Singh, Jackie Shroff). Building something that clones his real name/likeness
and monetizes it without a license is legally risky.

**Approach:** position as a parody/fictional "bhai" character, not "the real
Salman Khan" — in branding, disclaimers, and ToS. Don't use his real
name/photo in a way that implies endorsement. Revisit an actual license deal
only if the concept gains real traction.

## 3. Architecture

- **LLM:** cheap/fast model — Gemini 2.5 Flash, GPT-4o-mini, or Claude Haiku
  4.5. Personality lives in the prompt, not the model size.
- **Persona layer:** strong system prompt (tone, vocabulary, rhythm,
  boundaries) + 50-100 curated few-shot examples covering common intents
  (advice, roast, motivation, filmy commentary). Optional small "catchphrase
  bank" for flavor variety.
- **Frontend/backend:** single-page chat UI (SvelteKit) calling the LLM API
  from a Vercel/Cloudflare edge function. No database for MVP — chat history
  in memory/localStorage.
- **No TTS, no STT, no avatar** — removes the main cost driver and the
  voice-cloning legal exposure entirely.

## 4. Cost

Trivially cheap on a text-only design — a few dollars a month even at
moderate traffic, since there's no audio generation cost at all.

### Gemini 2.5 Pro / Flash pricing (paid tier, ai.google.dev)

| Model | Input | Output |
|---|---|---|
| 2.5 Pro | $1.25/M (≤200k tokens) → $2.50/M (>200k) | $10.00/M (≤200k) → $15.00/M (>200k) |
| 2.5 Flash | $0.30/M text/image/video, $1.00/M audio | $2.50/M |

Flash is ~4x cheaper than Pro on both input and output. For a text-only
persona bot, Flash's quality is more than sufficient — Pro isn't worth the
premium here.

### Gemini API free tier

- $0 for input and output tokens (no billing enabled).
- Rough rate limits: 2.5 Pro ~5 RPM / ~100 RPD; 2.5 Flash ~10 RPM / ~250 RPD;
  2.5 Flash-Lite ~15 RPM / ~1,000 RPD (shared ~250k TPM cap). Google has
  revised these before without notice — verify at
  `ai.google.dev/gemini-api/docs/rate-limits` before launch.
- **Enabling billing removes the free tier entirely** on that project — every
  call becomes billable from token one. Don't enable billing until actually
  needed.
- Free-tier prompts/outputs may be used by Google to improve their products
  (no data-privacy guarantee) — worth knowing, not a blocker for this project.

### OpenRouter free-model alternative

- Platform-wide free-model (`:free`) rate limits: 20 requests/min; 50
  requests/day with no prior purchases, or 1,000/day once $10+ in credits has
  ever been bought (free models stay $0/token either way — worth the one-time
  $10 buy-in).
- NVIDIA Nemotron models (Ultra/Super/Nano) are tuned mainly for reasoning,
  agentic tool-use, and coding — not built for personality/character banter.
- **Recommended pick:** `meta-llama/llama-3.3-70b-instruct:free` — best
  all-around free choice for persona/character chat; strong style/tone
  following, handles Hinglish and casual banter well, large context.
- Backup/lighter option: `nvidia/nemotron-nano-9b-v2:free` — snappier
  latency, decent persona quality at smaller size, less consistent than the
  70B on nuanced style.
- **Suggested strategy:** prototype the persona prompt against Gemini 2.5
  Flash's free tier (higher daily cap, no $10 buy-in needed) and keep Llama
  3.3 70B free on OpenRouter as a fallback model if the Gemini daily cap is
  hit.

## 5. Build order

1. Nail the persona in a prompt playground first — this is the actual
   product, worth spending real time on before any UI work.
2. Minimal chat UI wired to the LLM.
3. Quick-reply chips for common intents ("Roast me," "Bhai ka advice,"
   "Motivate me").
4. Shareable, screenshot-friendly formatted text cards as the growth loop
   (no voice clip to share, so this replaces that role).
5. Legal/brand pass: parody disclaimer, ToS, no implied endorsement by a real
   person.

## 6. Distribution

Telegram or WhatsApp bot fits the persona and audience well and is simple
with text-only output — just text messages, no audio to send. Web version
can follow once the bot proves the concept.
