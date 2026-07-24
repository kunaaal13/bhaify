<script lang="ts">
	import ResultCard from './ResultCard.svelte';
	import type { BhaifyResult, BhaifyError } from '$lib/types';

	const MAX_LENGTH = 500;

	let input = $state('');
	let result = $state<BhaifyResult | null>(null);
	let error = $state<string | null>(null);
	let pending = $state(false);
	let regenerating = $state(false);

	/** Advances on "phir se" so each press pulls the next cached variant. */
	let slot = $state(0);

	const remaining = $derived(MAX_LENGTH - input.length);
	const canSubmit = $derived(input.trim().length >= 2 && !pending);

	async function send(variantSlot: number) {
		error = null;
		const res = await fetch('/api/bhaify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ input, variantSlot })
		});

		const body = (await res.json()) as BhaifyResult | BhaifyError;
		if (!res.ok) {
			error = (body as BhaifyError).error ?? 'Kuch gadbad ho gayi .';
			return;
		}
		result = body as BhaifyResult;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		pending = true;
		slot = 0;
		try {
			await send(0);
		} catch {
			error = 'Connection gaya . Phir se try karo .';
		} finally {
			pending = false;
		}
	}

	async function regenerate() {
		if (regenerating || !result) return;
		regenerating = true;
		// Wraps at the variant count, so a fourth press re-serves slot 0 for free.
		slot = (slot + 1) % (result.variantSlots ?? 3);
		try {
			await send(slot);
		} catch {
			error = 'Connection gaya . Phir se try karo .';
		} finally {
			regenerating = false;
		}
	}

	/** Cmd/Ctrl+Enter submits — the textarea keeps plain Enter for newlines. */
	async function onKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canSubmit) {
			event.preventDefault();
			pending = true;
			slot = 0;
			try {
				await send(0);
			} catch {
				error = 'Connection gaya . Phir se try karo .';
			} finally {
				pending = false;
			}
		}
	}
</script>

<form onsubmit={submit}>
	<label for="bhaify-input" class="sr-only">Message to bhaify</label>
	<textarea
		id="bhaify-input"
		bind:value={input}
		onkeydown={onKeydown}
		maxlength={MAX_LENGTH}
		rows="3"
		placeholder="type kuch bhi..."
		class="card w-full resize-none p-4 text-body-lg text-ink transition-colors outline-none placeholder:text-body-mid focus:border-body-mid"
	></textarea>

	<div class="mt-3 flex items-center justify-between gap-4">
		<span class="eyebrow" class:text-accent-sunset={remaining < 50}>
			{remaining} left
		</span>

		<button type="submit" class="pill-filled" disabled={!canSubmit}>
			{pending ? 'Soch raha hoon...' : 'Bhaify'}
		</button>
	</div>
</form>

{#if error}
	<p class="mt-6 text-body-md text-accent-sunset">{error}</p>
{/if}

{#if result}
	<!-- One quick fade-and-rise. The source design system is restrained; a long
	     reveal animation would fight it. -->
	<div class="mt-8 motion-safe:animate-[rise_180ms_ease-out]">
		<ResultCard {result} onRegenerate={regenerate} {regenerating} />
	</div>
{/if}

<style>
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
