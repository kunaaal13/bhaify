<script lang="ts">
	import type { CorpusTweet } from '$lib/persona/corpus';

	interface Props {
		tweet: CorpusTweet;
		/**
		 * Fill the container instead of a fixed card width. The marquee needs a
		 * fixed width so the scroll distance is predictable; masonry needs the
		 * card to fill its column.
		 */
		fluid?: boolean;
	}

	let { tweet, fluid = false }: Props = $props();

	const year = $derived(tweet.date.slice(0, 4));
	const likes = $derived(
		tweet.likes >= 1000 ? `${(tweet.likes / 1000).toFixed(1)}k` : String(tweet.likes)
	);
</script>

<article
	class="card flex flex-col p-5 {fluid ? 'w-full' : 'w-[300px] shrink-0 snap-start sm:w-[340px]'}"
>
	<header class="flex items-center gap-3">
		<!-- One consistent avatar across every card: these are all posts by the same
		     account, so rotating portraits read as different people. -->
		<img
			src="/images/salman-avatar.png"
			alt=""
			width="36"
			height="36"
			loading="lazy"
			class="h-9 w-9 shrink-0 rounded-full object-cover"
		/>
		<div class="min-w-0">
			<p class="truncate text-body-sm text-ink">Salman Khan</p>
			<p class="eyebrow">@BeingSalmanKhan</p>
		</div>
	</header>

	<p class="mt-4 flex-1 text-body-md whitespace-pre-wrap text-ink">{tweet.text}</p>

	<footer class="mt-4 flex items-center justify-between border-t border-hairline pt-3">
		<span class="eyebrow">{year} &middot; {tweet.register.replace(/-/g, ' ')}</span>
		<span class="eyebrow text-body">{likes} likes</span>
	</footer>
</article>
