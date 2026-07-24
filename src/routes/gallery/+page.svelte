<script lang="ts">
	import Marquee from '$lib/components/Marquee.svelte';
	import TweetCard from '$lib/components/TweetCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function ago(date: Date | string): string {
		const ms = Date.now() - new Date(date).getTime();
		const min = Math.floor(ms / 60000);
		if (min < 1) return 'abhi abhi';
		if (min < 60) return `${min} min pehle`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr} ghante pehle`;
		return `${Math.floor(hr / 24)} din pehle`;
	}
</script>

<svelte:head>
	<title>Darbar — Bhaify</title>
	<meta name="description" content="Bhai ne kya kaha , aur logon ne kya banaya ." />
</svelte:head>

<div class="mx-auto max-w-3xl px-6 pt-12">
	<h1 class="text-display-sm font-normal text-ink sm:text-display-md">Bhai ka darbar</h1>
	<p class="mt-3 text-body-lg text-body">Bhai ne kya kaha , aur logon ne kya banaya .</p>
</div>

<!-- Full-bleed rows. -->
<section class="mt-12" aria-label="Sabse bade">
	<p class="mx-auto mb-4 max-w-3xl px-6 text-body-sm text-body-mid">Sabse bade</p>
	<Marquee duration={80}>
		{#each data.greatest as tweet (tweet.date + tweet.likes)}
			<TweetCard {tweet} />
		{/each}
	</Marquee>
</section>

<section class="mt-10" aria-label="Purana bhai">
	<p class="mx-auto mb-4 max-w-3xl px-6 text-body-sm text-body-mid">Purana bhai . 2010 se 2015 .</p>
	<Marquee duration={95} reverse>
		{#each data.era as tweet (tweet.date + tweet.likes)}
			<TweetCard {tweet} />
		{/each}
	</Marquee>
</section>

<div class="mx-auto max-w-3xl px-6 pb-24">
	<div class="mt-16 border-t border-hairline pt-10">
		<p class="text-body-sm text-body-mid">Abhi abhi bhaify hua</p>

		{#if data.recent.length === 0}
			<p class="mt-4 text-body-md text-body-mid">
				Abhi tak koi nahi .
				<a href="/" class="text-ink underline underline-offset-4">Pehle tum karo</a> .
			</p>
		{:else}
			<!-- Hairline-divided rows, not a card grid — reads as a log (PLAN.md §3.5). -->
			<ul class="mt-4 divide-y divide-hairline">
				{#each data.recent as item (item.id)}
					<li class="py-4">
						<a href="/b/{item.id}" class="block">
							<p class="text-body-lg text-ink">{item.text}</p>
							<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
								<span class="truncate font-mono text-caption-mono-sm text-mute">
									pehle : {item.inputText}
								</span>
								<span class="font-mono text-caption-mono-sm text-mute">{ago(item.createdAt)}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
