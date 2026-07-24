<script lang="ts">
	import BhaifyBox from '$lib/components/BhaifyBox.svelte';
	import Marquee from '$lib/components/Marquee.svelte';
	import TweetCard from '$lib/components/TweetCard.svelte';
	import { USABLE_CORPUS } from '$lib/persona/corpus';
	import { DIALOGUES, HERO_DIALOGUE } from '$lib/dialogues';
	import { COPY } from '$lib/copy';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ranked = [...USABLE_CORPUS].sort((a, b) => b.likes - a.likes);
	const rowOne = ranked.slice(0, 14);
	const rowTwo = ranked.slice(14, 28);

	/** Everything after the hero line. */
	const restDialogues = DIALOGUES.slice(1);

	const stats = $derived([
		{ value: data.total.toLocaleString('en-IN'), label: 'lines bhaified' },
		{ value: String(USABLE_CORPUS.length), label: 'posts in the corpus' },
		{ value: data.today.toLocaleString('en-IN'), label: 'in the last 24h' }
	]);
</script>

<svelte:head>
	<title>Bhaify — kuch bhi likho , bhai bana denge</title>
	<meta name="description" content="Kuch bhi likho . Bhai ki zubaan mein wapas milega ." />
</svelte:head>

<!-- ── hero ────────────────────────────────────────────────────────────── -->
<section class="mx-auto max-w-3xl px-6 pt-14 pb-14 sm:pt-20">
	<div class="flex items-start justify-between gap-8">
		<div class="min-w-0">
			<!-- Weight 400 at display size with heavy negative tracking is the whole
			     x.ai signature — never bold this. -->
			<h1 class="text-display-md font-normal text-ink sm:text-display-lg">Bhaify</h1>
			<p class="mt-4 text-body-lg text-body">{COPY.home.tagline}</p>
			<p class="mt-3 max-w-lg text-body-md text-body-mid">{COPY.home.intro}</p>
		</div>

		<img
			src="/images/salman-avatar.jpg"
			alt="Bhai"
			width="224"
			height="224"
			class="hidden h-28 w-28 shrink-0 rounded-full border border-hairline object-cover sm:block"
		/>
	</div>

	<blockquote class="mt-8 flex items-center gap-5">
		<img
			src={HERO_DIALOGUE.poster}
			alt="{HERO_DIALOGUE.film} poster"
			width="220"
			height="330"
			class="h-[108px] w-[72px] shrink-0 rounded-[4px] border border-hairline object-cover"
		/>
		<div class="border-l-2 border-accent-sunset pl-5">
			<p class="text-body-lg text-ink italic">{HERO_DIALOGUE.line}</p>
			<footer class="mt-2 font-mono text-caption-mono-sm text-mute">
				{HERO_DIALOGUE.film} &middot; {HERO_DIALOGUE.year}
			</footer>
		</div>
	</blockquote>

	<div class="mt-10">
		<BhaifyBox />
	</div>

	<!-- ── stats ───────────────────────────────────────────────────────── -->
	<dl class="mt-12 grid grid-cols-3 gap-4 border-t border-hairline pt-8">
		{#each stats as stat (stat.label)}
			<div>
				<dt class="text-display-xs font-normal text-ink tabular-nums sm:text-display-sm">
					{stat.value}
				</dt>
				<dd class="mt-1 font-mono text-caption-mono-sm text-mute">{stat.label}</dd>
			</div>
		{/each}
	</dl>
</section>

<!-- ── corpus marquees, full bleed ─────────────────────────────────────── -->
<section class="pb-16" aria-label="What bhai actually posted">
	<div class="mx-auto mb-4 flex max-w-3xl flex-wrap items-baseline justify-between gap-2 px-6">
		<p class="text-body-sm text-body-mid">{COPY.marquee.label}</p>
		<p class="font-mono text-caption-mono-sm text-mute">{COPY.marquee.note}</p>
	</div>
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

<!-- ── dialogues ───────────────────────────────────────────────────────── -->
<section class="mx-auto max-w-6xl px-6 pb-20">
	<div class="mx-auto max-w-3xl">
		<h2 class="text-display-sm font-normal text-ink">{COPY.dialogues.title}</h2>
		<p class="mt-2 text-body-md text-body-mid">{COPY.dialogues.intro}</p>
	</div>

	<ul class="mt-8 grid gap-4 sm:grid-cols-2">
		{#each restDialogues as d (d.line)}
			<li class="card flex gap-5 overflow-hidden p-5">
				<!-- 2:3 poster crop. Fixed width so every card's text column starts at
				     the same place regardless of the source poster's aspect ratio. -->
				<img
					src={d.poster}
					alt="{d.film} poster"
					width="220"
					height="330"
					loading="lazy"
					class="h-[132px] w-[88px] shrink-0 rounded-[4px] border border-hairline object-cover"
				/>
				<div class="flex min-w-0 flex-col justify-between">
					<p class="text-body-md text-ink">{d.line}</p>
					<p class="mt-3 font-mono text-caption-mono-sm text-mute">
						{d.film} &middot; {d.year}
					</p>
				</div>
			</li>
		{/each}
	</ul>
</section>

<!-- ── recent, if any ──────────────────────────────────────────────────── -->
{#if data.latest.length > 0}
	<section class="mx-auto max-w-3xl px-6 pb-24">
		<div class="flex items-baseline justify-between border-t border-hairline pt-8">
			<h2 class="text-body-sm text-body-mid">Abhi abhi</h2>
			<a
				href="/wall"
				class="font-mono text-caption-mono-sm text-mute transition-colors hover:text-body"
			>
				See all &rarr;
			</a>
		</div>
		<ul class="mt-2 divide-y divide-hairline">
			{#each data.latest as item (item.id)}
				<li>
					<a
						href="/b/{item.id}"
						class="block py-4 text-body-lg text-ink transition-colors hover:text-body"
					>
						{item.text}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
