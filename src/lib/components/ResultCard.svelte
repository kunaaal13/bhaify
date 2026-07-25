<script lang="ts">
	import { page } from '$app/state';
	import BhaiPost from './BhaiPost.svelte';
	import CardActions from './CardActions.svelte';
	import type { BhaifyResult } from '$lib/types';

	interface Props {
		result: BhaifyResult;
		showActions?: boolean;
		onRegenerate?: () => void;
		regenerating?: boolean;
	}

	let { result, showActions = true, onRegenerate, regenerating = false }: Props = $props();

	const shareUrl = $derived(new URL(`/b/${result.id}`, page.url.origin).href);
</script>

{#snippet actions()}
	<CardActions id={result.id} text={result.text} {onRegenerate} {regenerating} />
{/snippet}

{#snippet urlLine()}
	<p class="mt-3 font-mono text-caption-mono-sm break-all text-mute">{shareUrl}</p>
{/snippet}

<BhaiPost
	text={result.text}
	actions={showActions ? actions : undefined}
	footer={showActions ? urlLine : undefined}
/>
