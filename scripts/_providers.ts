/**
 * Provider access for the standalone scripts.
 *
 * `src/lib/llm` imports `$env/dynamic/private`, which only resolves under Vite,
 * so scripts run with plain tsx cannot use it. This mirrors it over
 * `process.env` instead.
 *
 * It exists as one shared module rather than a copy per script because there were
 * two copies (eval.ts and rate.ts) and the bake-off would have made a third — and
 * a stale copy makes the harness measure a model that production no longer uses,
 * which is the most expensive kind of wrong. Keep the table below in sync with
 * `getProviders()` in src/lib/llm/index.ts; that file documents WHY this order.
 */

export interface ScriptProvider {
	name: string;
	baseURL: string;
	model: string;
	key: string | undefined;
	extra?: Record<string, unknown>;
}

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai/';

export function scriptProviders(): ScriptProvider[] {
	return [
		{
			name: 'gemini-flash',
			baseURL: GEMINI,
			model: 'gemini-flash-latest',
			key: process.env.GEMINI_API_KEY,
			extra: { reasoning_effort: 'minimal' }
		},
		{
			name: 'gemini-flash-lite',
			baseURL: GEMINI,
			model: 'gemini-flash-lite-latest',
			key: process.env.GEMINI_API_KEY
		},
		{
			name: 'gemma-4-31b',
			baseURL: 'https://openrouter.ai/api/v1/',
			model: 'google/gemma-4-31b-it:free',
			key: process.env.OPENROUTER_API_KEY
		}
	].filter((p) => p.key);
}

export interface ScriptGeneration {
	text: string;
	/** Which provider actually served it — surfaces silent fallback in eval runs. */
	model: string;
}

/**
 * Generates one completion, falling through the provider chain like production
 * does. Returns the serving provider so a run can report that it silently
 * degraded rather than presenting fallback output as the primary's work.
 */
export async function scriptGenerate(system: string, user: string): Promise<ScriptGeneration> {
	const providers = scriptProviders();
	if (providers.length === 0) throw new Error('Set GEMINI_API_KEY or OPENROUTER_API_KEY');

	const failures: string[] = [];
	for (const p of providers) {
		try {
			const res = await fetch(`${p.baseURL}chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
				body: JSON.stringify({
					model: p.model,
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: user }
					],
					temperature: 1.0,
					max_tokens: 300,
					...p.extra
				})
			});
			if (!res.ok) {
				failures.push(`${p.name} HTTP ${res.status}`);
				continue;
			}
			const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
			const text = j.choices?.[0]?.message?.content?.trim();
			if (text) return { text, model: p.name };
			failures.push(`${p.name} empty`);
		} catch (e) {
			failures.push(`${p.name} ${(e as Error).message}`);
		}
	}
	throw new Error(failures.join('; '));
}
