import { describe, it, expect, vi } from 'vitest';
import { generate, NoProviderAvailableError, type Provider } from './index';

const P1: Provider = { name: 'p1', baseURL: 'https://a/', model: 'm1', apiKey: 'k1' };
const P2: Provider = { name: 'p2', baseURL: 'https://b/', model: 'm2', apiKey: 'k2' };

function reply(content: string, status = 200) {
	return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function errorReply(status: number) {
	return new Response(JSON.stringify({ error: { message: 'nope' } }), { status });
}

const opts = { system: 's', user: 'u' };

describe('generate — happy path', () => {
	it('returns text and the serving provider', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(reply('  Khamosh .  '));
		const res = await generate({ ...opts, providers: [P1, P2], fetchImpl });

		expect(res.text).toBe('Khamosh .');
		expect(res.model).toBe('p1');
		expect(res.latencyMs).toBeGreaterThanOrEqual(0);
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it('sends an OpenAI-shaped payload to the right path', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(reply('ok'));
		await generate({ ...opts, providers: [P1], fetchImpl });

		const [url, init] = fetchImpl.mock.calls[0];
		expect(url).toBe('https://a/chat/completions');
		const sent = JSON.parse((init as RequestInit).body as string);
		expect(sent.model).toBe('m1');
		expect(sent.messages).toEqual([
			{ role: 'system', content: 's' },
			{ role: 'user', content: 'u' }
		]);
		expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer k1' });
	});
});

describe('generate — fallback', () => {
	it('falls through to the next provider on 429', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(errorReply(429))
			.mockResolvedValueOnce(reply('from second'));

		const res = await generate({ ...opts, providers: [P1, P2], fetchImpl });
		expect(res.text).toBe('from second');
		expect(res.model).toBe('p2');
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it('falls through on 5xx', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(errorReply(503))
			.mockResolvedValueOnce(reply('recovered'));
		const res = await generate({ ...opts, providers: [P1, P2], fetchImpl });
		expect(res.model).toBe('p2');
	});

	it('fails fast on 400 — that is our bug, the next provider would reject too', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(errorReply(400));
		await expect(generate({ ...opts, providers: [P1, P2], fetchImpl })).rejects.toThrow(
			NoProviderAvailableError
		);
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it('fails fast on 401', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(errorReply(401));
		await expect(generate({ ...opts, providers: [P1, P2], fetchImpl })).rejects.toThrow();
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it('treats an empty completion as retryable', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(reply(''))
			.mockResolvedValueOnce(reply('second had content'));
		const res = await generate({ ...opts, providers: [P1, P2], fetchImpl });
		expect(res.text).toBe('second had content');
	});

	it('falls through on a network error', async () => {
		const fetchImpl = vi
			.fn()
			.mockRejectedValueOnce(new Error('ECONNRESET'))
			.mockResolvedValueOnce(reply('ok'));
		const res = await generate({ ...opts, providers: [P1, P2], fetchImpl });
		expect(res.model).toBe('p2');
	});

	it('aggregates failures when everything fails', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(errorReply(500));
		await expect(generate({ ...opts, providers: [P1, P2], fetchImpl })).rejects.toMatchObject({
			failures: expect.arrayContaining([expect.stringContaining('p1')])
		});
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});
});

describe('generate — configuration', () => {
	it('skips providers with no key instead of burning a round trip', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(reply('ok'));
		const res = await generate({
			...opts,
			providers: [{ ...P1, apiKey: undefined }, P2],
			fetchImpl
		});
		expect(res.model).toBe('p2');
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it('throws a clear error when nothing is configured', async () => {
		const fetchImpl = vi.fn();
		await expect(
			generate({ ...opts, providers: [{ ...P1, apiKey: undefined }], fetchImpl })
		).rejects.toThrow(/no provider has an API key/);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('aborts a hung request and moves on', async () => {
		const hang = (_url: string, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => {
					const e = new Error('aborted');
					e.name = 'AbortError';
					reject(e);
				});
			});
		const fetchImpl = vi.fn().mockImplementationOnce(hang).mockResolvedValueOnce(reply('second'));

		const res = await generate({
			...opts,
			providers: [P1, P2],
			fetchImpl: fetchImpl as unknown as typeof fetch,
			timeoutMs: 20
		});
		expect(res.model).toBe('p2');
	});
});
