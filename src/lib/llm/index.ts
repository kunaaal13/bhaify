/**
 * LLM client (PLAN.md §4.5). Deliberately no Vercel AI SDK.
 *
 * We make one non-streaming call and need the id back synchronously to build a
 * permalink, so `useChat`/`useCompletion` buy nothing. The SDK core's main value
 * would be normalising two request shapes — and that evaporates because Gemini
 * exposes an OpenAI-compatible endpoint, so both providers take an identical
 * payload and the fallback chain is just a loop over a table.
 */
import { env } from '$env/dynamic/private';

export interface Provider {
	name: string;
	baseURL: string;
	model: string;
	apiKey: string | undefined;
	/**
	 * Extra top-level body fields merged into the request. Provider-specific knobs
	 * that don't exist in the OpenAI shape live here (currently: capping Gemini's
	 * thinking budget).
	 */
	extra?: Record<string, unknown>;
}

/**
 * Tried in order. Gemini first because its free tier is far more generous
 * (~250/day vs OpenRouter's 50/day without a prior $10 purchase).
 *
 * Gemini's `/v1beta/openai/` compatibility layer is labelled beta by Google, but
 * verified working — both providers take an identical OpenAI-shaped payload.
 *
 * MODEL CHOICES — reordered 2026-07 after `scripts/bakeoff.ts`.
 *
 * `gemini-flash-latest` is now PRIMARY, reversing the earlier decision. That
 * decision was correct on its own evidence and wrong on one detail: it measured
 * the model with reasoning ON (301 hidden tokens for a 16-token line) and
 * concluded it was 5x cost for no gain. Reasoning can be capped, and once it is,
 * the model is in a different class for this task. Measured over 12 cases with
 * slots rotated:
 *
 *                        compression   english   pure-Hindi   gate    latency
 *   gemini-flash-lite         3.4/100w       5%         50%   FAIL      1.1s
 *   gemini-flash (minimal)   13.0/100w      19%          0%   pass      9.3s
 *   (corpus reference)        8.5/100w      19%           —      —         —
 *
 * flash-lite does not merely score lower — half its output is pure Hindi
 * translation, which is the specific failure that made the product feel wrong.
 * flash-latest matches the corpus's English-base share exactly.
 *
 * The cost is real and accepted: ~8x slower, and 5 of 12 calls returned HTTP 503
 * "high demand". 503 is already retryable, so the chain falls through to flash-lite
 * automatically — a slower good answer when capacity exists, a fast mediocre one
 * when it doesn't. Quality is the thing being fixed, so it leads.
 *
 * `reasoning_effort` is fiddly on the compat layer and the working value is not
 * the obvious one — measured:
 *   'none'    -> HTTP 400 INVALID_ARGUMENT
 *   'low'     -> 200, but 98 total tokens to emit "ok"
 *   'minimal' -> 200, 8 total tokens          <- what we use
 *   omitted   -> 200, 117 total tokens
 * `extra_body` / `google.thinking_config` are Python-SDK shapes and 400 over REST.
 *
 * OpenRouter free tier is kept as the last resort but is unreliable in practice —
 * `gemma-4-31b`, `gpt-oss-20b` and `ling-3.0-flash` all returned 429 during the
 * bake-off. The Nemotron free models (including the 550B) were re-tested and are
 * unusable here for a concrete reason, not a hunch: they emit their entire
 * chain-of-thought as message content ("The user wants me to rewrite..."), so
 * there is no clean answer to extract.
 *
 * Re-run `npx tsx --env-file=.env scripts/bakeoff.ts` if quality drifts; free-tier
 * slugs change without notice.
 */
export function getProviders(): Provider[] {
	return [
		{
			name: 'gemini-flash',
			baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
			model: 'gemini-flash-latest',
			apiKey: env.GEMINI_API_KEY,
			// Without this the model burns ~300 hidden reasoning tokens per line and
			// risks truncating against max_tokens. See the note above for why
			// 'minimal' and not 'none'.
			extra: { reasoning_effort: 'minimal' }
		},
		{
			name: 'gemini-flash-lite',
			baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
			model: 'gemini-flash-lite-latest',
			apiKey: env.GEMINI_API_KEY
		},
		{
			name: 'gemma-4-31b',
			baseURL: 'https://openrouter.ai/api/v1/',
			model: 'google/gemma-4-31b-it:free',
			apiKey: env.OPENROUTER_API_KEY
		}
	];
}

export interface GenerateOptions {
	system: string;
	user: string;
	temperature?: number;
	maxTokens?: number;
	/** Overridable for tests. */
	providers?: Provider[];
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
}

export interface GenerateResult {
	text: string;
	/** Which provider actually served it — recorded so we can see the free tier running dry. */
	model: string;
	latencyMs: number;
}

export class NoProviderAvailableError extends Error {
	constructor(readonly failures: string[]) {
		super(`All providers failed: ${failures.join('; ')}`);
		this.name = 'NoProviderAvailableError';
	}
}

/** 15s. Generous for a ~60-token completion; mostly a guard against a hung socket. */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Worth falling through to the next provider.
 *
 * 429 (rate limited) and 5xx (their problem) are retryable elsewhere. 400/401/403
 * mean our request or key is wrong — the next provider would reject it too, and
 * retrying just doubles the latency before surfacing our own bug.
 */
function isRetryable(status: number): boolean {
	return status === 429 || status === 408 || status >= 500;
}

interface ChatCompletionResponse {
	choices?: { message?: { content?: string } }[];
	error?: { message?: string };
}

async function callProvider(
	provider: Provider,
	opts: GenerateOptions,
	doFetch: typeof fetch
): Promise<GenerateResult> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	const started = Date.now();

	try {
		const res = await doFetch(`${provider.baseURL}chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${provider.apiKey}`
			},
			body: JSON.stringify({
				model: provider.model,
				messages: [
					{ role: 'system', content: opts.system },
					{ role: 'user', content: opts.user }
				],
				// High-ish: the voice depends on unpredictable swerves. Too low and
				// every output converges on the same safe phrasing.
				temperature: opts.temperature ?? 1.0,
				max_tokens: opts.maxTokens ?? 300,
				...provider.extra
			}),
			signal: controller.signal
		});

		if (!res.ok) {
			const body = await res.text().catch(() => '');
			const err = new Error(`${provider.name} HTTP ${res.status}: ${body.slice(0, 200)}`);
			(err as Error & { retryable?: boolean }).retryable = isRetryable(res.status);
			throw err;
		}

		const json = (await res.json()) as ChatCompletionResponse;
		const text = json.choices?.[0]?.message?.content?.trim();

		if (!text) {
			// An empty completion is usually a safety filter or a truncated stream.
			// Treat as retryable — the other provider may well answer.
			const err = new Error(`${provider.name} returned no content`);
			(err as Error & { retryable?: boolean }).retryable = true;
			throw err;
		}

		return { text, model: provider.name, latencyMs: Date.now() - started };
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Generates one completion, falling through the provider table.
 *
 * Providers with no configured key are skipped rather than attempted — an
 * unconfigured fallback should be invisible, not a guaranteed failed round trip.
 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
	const providers = (opts.providers ?? getProviders()).filter((p) => p.apiKey);
	const doFetch = opts.fetchImpl ?? fetch;

	if (providers.length === 0) {
		throw new NoProviderAvailableError(['no provider has an API key configured']);
	}

	const failures: string[] = [];

	for (const provider of providers) {
		try {
			return await callProvider(provider, opts, doFetch);
		} catch (err) {
			const e = err as Error & { retryable?: boolean; name?: string };
			const isAbort = e.name === 'AbortError';
			failures.push(e.message);

			// Fail fast on our own bugs; keep going on their problems.
			if (!isAbort && e.retryable === false) break;
		}
	}

	throw new NoProviderAvailableError(failures);
}
