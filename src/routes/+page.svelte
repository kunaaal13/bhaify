<script lang="ts">
	import BhaifyBox from '$lib/components/BhaifyBox.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import TweetCard from '$lib/components/TweetCard.svelte';
	import { USABLE_CORPUS } from '$lib/persona/corpus';

	/** Highest-engagement posts — the sampler should open on the strongest lines. */
	const sampler = [...USABLE_CORPUS].sort((a, b) => b.likes - a.likes).slice(0, 12);

	const avatars = [
		'/images/salman-2023.jpg',
		'/images/salman-2012.jpg',
		'/images/salman-eid.jpg',
		'/images/salman-filmfare.jpg',
		'/images/salman-2015.jpg',
		'/images/salman-snapped.jpg'
	];
</script>

<svelte:head>
	<title>Bhaify — text ko bhai bana do</title>
	<meta
		name="description"
		content="Type anything. Get it back in bhai's voice. A fan parody text transformer."
	/>
</svelte:head>

<!-- Hero band. Nothing else above the fold (PLAN.md §3.5) — the box IS the
     product, so the page shouldn't argue for it. -->
<section class="mx-auto max-w-3xl px-6 pt-16 pb-24 sm:pt-24">
	<div class="flex items-start justify-between gap-8">
		<div class="min-w-0">
			<p class="eyebrow">Persona transfer model // v1</p>

			<!-- Weight 400 at display size with heavy negative tracking is the whole
			     x.ai signature — never bold this. -->
			<h1 class="mt-5 text-display-md font-normal text-ink sm:text-display-lg">Bhaify</h1>

			<p class="mt-4 text-body-lg text-body">Kuch bhi likho . Bhai bana denge .</p>
		</div>

		<!-- Grayscale keeps the portrait inside the monochrome system rather than
		     dropping a full-colour press photo into it. Hidden on small screens —
		     the box matters more than the face. -->
		<img
			src="/images/salman-2012.jpg"
			alt="Salman Khan, 2012"
			width="140"
			height="140"
			class="hidden h-32 w-32 shrink-0 rounded-full border border-hairline object-cover object-top grayscale sm:block"
		/>
	</div>

	<div class="mt-10">
		<BhaifyBox />
	</div>

	<!-- Sampler. Gives the empty state something to look at and shows the range
	     of registers before you've typed anything. -->
	<div class="mt-20">
		<Carousel label="Bhai ne kya kaha // corpus">
			{#each sampler as tweet, i (tweet.date + tweet.likes)}
				<TweetCard {tweet} avatar={avatars[i % avatars.length]} />
			{/each}
		</Carousel>
		<p class="eyebrow mt-4">
			Real posts, collected by
			<a
				href="https://apnakyalenadena.com"
				class="text-body underline underline-offset-4"
				rel="noopener">apnakyalenadena.com</a
			>
		</p>
	</div>
</section>
