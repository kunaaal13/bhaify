<script lang="ts">
	import BhaifyBox from '$lib/components/BhaifyBox.svelte';
	import Marquee from '$lib/components/Marquee.svelte';
	import TweetCard from '$lib/components/TweetCard.svelte';
	import { USABLE_CORPUS } from '$lib/persona/corpus';

	/** Highest-engagement posts first — the row should open on the strongest lines. */
	const ranked = [...USABLE_CORPUS].sort((a, b) => b.likes - a.likes);
	const rowOne = ranked.slice(0, 14);
	const rowTwo = ranked.slice(14, 28);
</script>

<svelte:head>
	<title>Bhaify — kuch bhi likho , bhai bana denge</title>
	<meta name="description" content="Kuch bhi likho . Bhai ki zubaan mein wapas milega ." />
</svelte:head>

<section class="mx-auto max-w-3xl px-6 pt-16 pb-16 sm:pt-24">
	<div class="flex items-start justify-between gap-8">
		<div class="min-w-0">
			<!-- Weight 400 at display size with heavy negative tracking is the whole
			     x.ai signature — never bold this. -->
			<h1 class="text-display-md font-normal text-ink sm:text-display-lg">Bhaify</h1>
			<p class="mt-4 text-body-lg text-body">Kuch bhi likho . Bhai bana denge .</p>
		</div>

		<img
			src="/images/salman-avatar.png"
			alt="Bhai"
			width="112"
			height="112"
			class="hidden h-28 w-28 shrink-0 rounded-full border border-hairline object-cover sm:block"
		/>
	</div>

	<div class="mt-10">
		<BhaifyBox />
	</div>
</section>

<!-- Full-bleed. Breaks out of the page container deliberately — the rows should
     run edge to edge, not sit inside the reading column. -->
<section class="pb-24" aria-label="Bhai ne kya kaha">
	<p class="mx-auto mb-4 max-w-3xl px-6 text-body-sm text-body-mid">Bhai ne kya kaha ...</p>
	<Marquee duration={80}>
		{#each rowOne as tweet (tweet.date + tweet.likes)}
			<TweetCard {tweet} />
		{/each}
	</Marquee>
	<div class="mt-4">
		<Marquee duration={95} reverse>
			{#each rowTwo as tweet (tweet.date + tweet.likes)}
				<TweetCard {tweet} />
			{/each}
		</Marquee>
	</div>
</section>
