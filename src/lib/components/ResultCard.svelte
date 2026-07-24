<script lang="ts">
	import { page } from '$app/state';
	import BhaiPost from './BhaiPost.svelte';
	import type { BhaifyResult } from '$lib/types';

	interface Props {
		result: BhaifyResult;
		showActions?: boolean;
		onRegenerate?: () => void;
		regenerating?: boolean;
	}

	let { result, showActions = true, onRegenerate, regenerating = false }: Props = $props();

	/** Everything happens here — no need to visit the permalink to share it. */
	const shareUrl = $derived(new URL(`/b/${result.id}`, page.url.origin).href);
	const imageUrl = $derived(new URL(`/b/${result.id}/og.png`, page.url.origin).href);

	type Flash = 'link' | 'text' | null;
	let flashed = $state<Flash>(null);
	let timer: ReturnType<typeof setTimeout>;

	async function copy(what: Exclude<Flash, null>) {
		try {
			await navigator.clipboard.writeText(what === 'link' ? shareUrl : result.text);
			flashed = what;
			clearTimeout(timer);
			timer = setTimeout(() => (flashed = null), 1800);
		} catch {
			// Clipboard is permission-gated and absent over plain http. Failing
			// silently beats an error toast for a nice-to-have.
		}
	}

	const canShare = $derived(
		typeof navigator !== 'undefined' && typeof navigator.share === 'function'
	);

	async function nativeShare() {
		try {
			await navigator.share({ title: 'Bhaify', text: result.text, url: shareUrl });
		} catch {
			// User dismissed the sheet — not an error.
		}
	}
</script>

{#snippet actions()}
	<button type="button" class="pill-filled" onclick={() => copy('link')}>
		{flashed === 'link' ? 'Link copied' : 'Copy link'}
	</button>

	<button type="button" class="pill-outline" onclick={() => copy('text')}>
		{flashed === 'text' ? 'Copied' : 'Copy text'}
	</button>

	{#if onRegenerate}
		<button type="button" class="pill-outline" onclick={onRegenerate} disabled={regenerating}>
			{regenerating ? 'Working...' : 'Try again'}
		</button>
	{/if}

	{#if canShare}
		<button type="button" class="pill-outline" onclick={nativeShare}>Share</button>
	{/if}

	<a class="pill-outline inline-block" href={imageUrl} target="_blank" rel="noopener">Image</a>
{/snippet}

{#snippet urlLine()}
	<p class="mt-3 font-mono text-caption-mono-sm break-all text-mute">{shareUrl}</p>
{/snippet}

<BhaiPost
	text={result.text}
	actions={showActions ? actions : undefined}
	footer={showActions ? urlLine : undefined}
/>
