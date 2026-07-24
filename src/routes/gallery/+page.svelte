<script lang="ts">
	import Carousel from '$lib/components/Carousel.svelte';
	import TweetCard from '$lib/components/TweetCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const avatarFor = (i: number) => data.avatars[i % data.avatars.length];

	function ago(date: Date | string): string {
		const ms = Date.now() - new Date(date).getTime();
		const min = Math.floor(ms / 60000);
		if (min < 1) return 'abhi';
		if (min < 60) return `${min}m`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr}h`;
		return `${Math.floor(hr / 24)}d`;
	}
</script>

<svelte:head>
	<title>Gallery — Bhaify</title>
	<meta name="description" content="The source material, and what people have bhaified." />
</svelte:head>

<div class="mx-auto max-w-3xl px-6 pt-12 pb-24">
	<header>
		<p class="eyebrow">Training corpus // 52 posts</p>
		<h1 class="mt-4 text-display-sm font-normal text-ink sm:text-display-md">Gallery</h1>
		<p class="mt-3 text-body-lg text-body">
			The source material the model learned from, and what people have run through it.
		</p>
	</header>

	<!-- Corpus carousels. Framed as reference material with the source credited —
	     see PLAN.md §8: we don't rebuild the hall-of-fame site this came from. -->
	<div class="mt-14">
		<Carousel label="Greatest hits">
			{#each data.greatest as tweet, i (tweet.date + tweet.likes)}
				<TweetCard {tweet} avatar={avatarFor(i)} />
			{/each}
		</Carousel>
	</div>

	<div class="mt-14">
		<Carousel label="Peak bhai // 2010–2015">
			{#each data.era as tweet, i (tweet.date + tweet.likes)}
				<TweetCard {tweet} avatar={avatarFor(i + 3)} />
			{/each}
		</Carousel>
	</div>

	<div class="mt-16 border-t border-hairline pt-10">
		<h2 class="eyebrow">Recently bhaified</h2>

		{#if data.recent.length === 0}
			<p class="mt-4 text-body-md text-body-mid">
				Abhi tak koi nahi . <a href="/" class="text-ink underline underline-offset-4"
					>Pehle tum karo</a
				>.
			</p>
		{:else}
			<!-- Hairline-divided rows, not a card grid — reads as a log (PLAN.md §3.5). -->
			<ul class="mt-4 divide-y divide-hairline">
				{#each data.recent as item (item.id)}
					<li class="py-4">
						<a href="/b/{item.id}" class="group block">
							<p class="text-body-lg text-ink group-hover:text-ink">{item.text}</p>
							<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
								<span class="eyebrow truncate">from: {item.inputText}</span>
								<span class="eyebrow">{ago(item.createdAt)}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<p class="eyebrow mt-14 leading-relaxed">
		Tweets collected by
		<a
			href="https://apnakyalenadena.com"
			class="text-body underline underline-offset-4"
			rel="noopener">apnakyalenadena.com</a
		>. Photos via Wikimedia Commons, CC BY — see
		<a href="/about" class="text-body underline underline-offset-4">about</a>.
	</p>
</div>
