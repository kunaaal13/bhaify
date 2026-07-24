<script lang="ts">
	import type { CorpusTweet } from '$lib/persona/corpus';

	interface Props {
		tweet: CorpusTweet;
		/** Rotating portrait, so the row doesn't read as one repeated avatar. */
		avatar: string;
	}

	let { tweet, avatar }: Props = $props();

	const year = $derived(tweet.date.slice(0, 4));
	const likes = $derived(
		tweet.likes >= 1000 ? `${(tweet.likes / 1000).toFixed(1)}k` : String(tweet.likes)
	);
</script>

<article class="card flex w-[300px] shrink-0 snap-start flex-col p-5 sm:w-[340px]">
	<header class="flex items-center gap-3">
		<img
			src={avatar}
			alt=""
			loading="lazy"
			class="h-9 w-9 rounded-full object-cover object-top grayscale"
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
