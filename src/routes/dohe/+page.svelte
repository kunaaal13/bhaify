<script lang="ts">
	import TweetCard from '$lib/components/TweetCard.svelte';
	import { USABLE_CORPUS } from '$lib/persona/corpus';
	import { COPY } from '$lib/copy';

	/**
	 * Newest first. CSS columns fill top-to-bottom then wrap to the next column,
	 * so within a column the order reads chronologically downward.
	 */
	const dohe = [...USABLE_CORPUS].sort((a, b) => b.date.localeCompare(a.date));
</script>

<svelte:head>
	<title>Bhai ke Dohe — Bhaify</title>
	<meta name="description" content="Bhai ke saare purane dohe . Ek jagah ." />
</svelte:head>

<div class="mx-auto max-w-6xl px-6 pt-12 pb-24">
	<header class="mx-auto max-w-3xl">
		<h1 class="text-display-sm font-normal text-ink sm:text-display-md">{COPY.dohe.title}</h1>
		<p class="mt-3 max-w-xl text-body-lg text-body">{COPY.dohe.intro}</p>
	</header>

	<!--
		Masonry via CSS multi-column. Cards have variable height, and columns pack
		them without the ragged row-gaps a grid would leave. `break-inside: avoid`
		stops a card being split across a column boundary.
	-->
	<div class="masonry mt-12">
		{#each dohe as tweet (tweet.date + tweet.likes)}
			<div class="masonry-item">
				<TweetCard {tweet} fluid />
			</div>
		{/each}
	</div>
</div>

<style>
	.masonry {
		column-count: 1;
		column-gap: 16px;
	}
	@media (min-width: 640px) {
		.masonry {
			column-count: 2;
		}
	}
	@media (min-width: 1024px) {
		.masonry {
			column-count: 3;
		}
	}

	.masonry-item {
		break-inside: avoid;
		/* Safari still needs the legacy property to honour break-inside. */
		-webkit-column-break-inside: avoid;
		page-break-inside: avoid;
		margin-bottom: 16px;
	}
</style>
