<script lang="ts">
	import MetaRow from './MetaRow.svelte';
	import type { BhaifyResult } from '$lib/types';

	interface Props {
		result: BhaifyResult;
		/** Hidden on the permalink page, where the actions differ. */
		showActions?: boolean;
		onRegenerate?: () => void;
		regenerating?: boolean;
	}

	let { result, showActions = true, onRegenerate, regenerating = false }: Props = $props();

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout>;

	async function copy() {
		try {
			await navigator.clipboard.writeText(result.text);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard is permission-gated and absent over plain http. Failing
			// silently is better than an error toast for a nice-to-have.
		}
	}
</script>

<!-- Card chrome per DESIGN.md: 8px radius, hairline border, flat fill, no shadow. -->
<article class="card p-6">
	<p class="text-body-lg whitespace-pre-wrap text-ink">{result.text}</p>

	<div class="mt-5 border-t border-hairline pt-4">
		<MetaRow
			register={result.register}
			markers={result.markers}
			model={result.model}
			latencyMs={result.latencyMs}
			cached={result.cached}
		/>
	</div>

	{#if showActions}
		<div class="mt-5 flex flex-wrap items-center gap-2">
			<button type="button" class="pill-outline" onclick={copy}>
				{copied ? 'Copy ho gaya' : 'Copy karo'}
			</button>
			{#if onRegenerate}
				<button type="button" class="pill-outline" onclick={onRegenerate} disabled={regenerating}>
					{regenerating ? 'Ruko zara...' : 'Phir se bol bhai'}
				</button>
			{/if}
			<a class="pill-outline inline-block" href="/b/{result.id}">Aage bhejo</a>
		</div>
	{/if}
</article>
