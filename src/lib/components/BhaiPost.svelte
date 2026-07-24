<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The post-shaped presentation of a bhaification.
	 *
	 * Shared by the result card and the permalink page so what you see on the
	 * site is the same object you share — the OG image in
	 * routes/b/[id]/og.png/+server.ts uses this exact layout. If you change one,
	 * change the other, or the shared image stops matching the page it links to.
	 */
	interface Props {
		text: string;
		/** Larger type on the permalink, where the post is the whole page. */
		size?: 'default' | 'large';
		/** Buttons, rendered under the divider. */
		actions?: Snippet;
		/** Anything below the actions — the share URL, report link. */
		footer?: Snippet;
	}

	let { text, size = 'default', actions, footer }: Props = $props();
</script>

<article class="card p-6 sm:p-7">
	<header class="flex items-center gap-3">
		<img
			src="/images/salman-avatar.jpg"
			alt=""
			width="88"
			height="88"
			class="h-11 w-11 shrink-0 rounded-full border border-hairline object-cover"
		/>
		<div class="min-w-0">
			<p class="truncate text-body-md text-ink">Salman Khan</p>
			<p class="truncate text-body-sm text-mute">@BeingSalmanKhan</p>
		</div>
	</header>

	<p
		class="mt-5 whitespace-pre-wrap text-ink {size === 'large'
			? 'text-display-xs sm:text-display-sm'
			: 'text-body-lg'}"
	>
		{text}
	</p>

	{#if actions || footer}
		<div class="mt-6 border-t border-hairline pt-5">
			<!-- Same mark as the share image, so the card is recognisably ours in
			     both places. -->
			<div class="mb-4 flex items-center gap-2">
				<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-sunset"></span>
				<span class="text-body-sm text-body-mid">bhaify</span>
			</div>

			{#if actions}
				<div class="flex flex-wrap items-center gap-2">
					{@render actions()}
				</div>
			{/if}
			{#if footer}
				{@render footer()}
			{/if}
		</div>
	{/if}
</article>
