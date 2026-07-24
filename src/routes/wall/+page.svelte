<script lang="ts">
	import { untrack } from 'svelte';
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import { COPY } from '$lib/copy';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	interface FeedItem {
		id: string;
		text: string;
		inputText: string;
		register: string | null;
		createdAt: string;
	}

	// Seeded from the server payload, then appended to as the reader scrolls.
	// untrack() makes the "initial value only" intent explicit rather than
	// accidental — the re-seed below handles the case where it does change.
	let items = $state<FeedItem[]>(untrack(() => data.items));
	let cursor = $state(untrack(() => data.cursor));
	let hasMore = $state(untrack(() => data.hasMore));
	let loading = $state(false);
	let loadError = $state<string | null>(null);

	// If SvelteKit re-runs load for this route (navigating back to it), start the
	// feed over instead of appending fresh rows onto a stale list.
	let seededFrom = untrack(() => data.items);
	$effect(() => {
		if (data.items === seededFrom) return;
		seededFrom = data.items;
		items = data.items;
		cursor = data.cursor;
		hasMore = data.hasMore;
	});

	/** The element that actually scrolls; the virtualiser measures against it. */
	let viewport = $state<HTMLDivElement | null>(null);

	/**
	 * The virtualiser needs a measured scroll element, which does not exist during
	 * SSR — it returns zero rows there. Without this flag the page would ship with
	 * an empty list: nothing for readers without JS, nothing for crawlers, and a
	 * blank flash before hydration. So render a plain list until mounted, then
	 * hand over to the virtualiser.
	 */
	let mounted = $state(false);
	$effect(() => {
		mounted = true;
	});

	/**
	 * Windowed rendering. Rows have variable height (a bhai line can be one word
	 * or four lines), so `estimateSize` is only a starting guess — measureElement
	 * corrects each row once it has been laid out.
	 */
	const virtualizer = $derived(
		createVirtualizer<HTMLDivElement, HTMLDivElement>({
			count: items.length,
			getScrollElement: () => viewport,
			estimateSize: () => 132,
			overscan: 8,
			getItemKey: (index) => items[index]?.id ?? index
		})
	);

	const rows = $derived($virtualizer.getVirtualItems());

	async function loadMore() {
		if (loading || !hasMore || !cursor) return;
		loading = true;
		loadError = null;
		try {
			const params = new URLSearchParams({ t: cursor.t, i: cursor.i });
			const res = await fetch(`/api/feed?${params}`);
			if (!res.ok) throw new Error(String(res.status));
			const next = (await res.json()) as {
				items: FeedItem[];
				hasMore: boolean;
				cursor: { t: string; i: string } | null;
			};
			items = [...items, ...next.items];
			cursor = next.cursor;
			hasMore = next.hasMore;
		} catch {
			loadError = 'Could not load more. Try again.';
		} finally {
			loading = false;
		}
	}

	// Fetch the next batch once the reader is within a few rows of the end.
	$effect(() => {
		const last = rows.at(-1);
		if (!last) return;
		if (last.index >= items.length - 6) void loadMore();
	});

	function ago(iso: string): string {
		const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
		if (min < 1) return 'abhi abhi';
		if (min < 60) return `${min} min pehle`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr} ghante pehle`;
		return `${Math.floor(hr / 24)} din pehle`;
	}
</script>

<svelte:head>
	<title>Wall — Bhaify</title>
	<meta name="description" content="Everything people have run through bhai." />
</svelte:head>

<!-- One row shape, used by both the virtualised and the plain path. -->
{#snippet feedRow(item: FeedItem)}
	<a href="/b/{item.id}" class="block border-b border-hairline py-5">
		<p class="text-body-lg text-ink">{item.text}</p>
		<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
			<span class="truncate font-mono text-caption-mono-sm text-mute">
				pehle : {item.inputText}
			</span>
			<span class="font-mono text-caption-mono-sm text-mute">{ago(item.createdAt)}</span>
		</div>
	</a>
{/snippet}

<div class="mx-auto max-w-3xl px-6 pt-12 pb-6">
	<h1 class="text-display-sm font-normal text-ink sm:text-display-md">Logon ne kya likhwaya</h1>
	<p class="mt-3 text-body-lg text-body">
		{COPY.wall.intro}
	</p>
</div>

{#if items.length === 0}
	<div class="mx-auto max-w-3xl px-6 pb-24">
		<p class="text-body-md text-body-mid">
			{COPY.wall.empty}
			<a href="/" class="text-ink underline underline-offset-4">Be the first</a> .
		</p>
	</div>
{:else}
	<!--
		Only the rows near the viewport exist in the DOM. The spacer div carries the
		full scroll height so the scrollbar stays honest, and each row is absolutely
		positioned at its measured offset.
	-->
	<div bind:this={viewport} class="feed-viewport">
		<div class="mx-auto max-w-3xl px-6">
			{#if mounted}
				<div style="position:relative;height:{$virtualizer.getTotalSize()}px;">
					{#each rows as row (row.key)}
						{@const item = items[row.index]}
						<div
							data-index={row.index}
							use:$virtualizer.measureElement
							style="position:absolute;top:0;left:0;width:100%;transform:translateY({row.start}px);"
						>
							{@render feedRow(item)}
						</div>
					{/each}
				</div>
			{:else}
				<!-- Pre-hydration / no-JS: a plain list of the server-rendered batch. -->
				{#each items as item (item.id)}
					{@render feedRow(item)}
				{/each}
			{/if}

			<div class="py-8">
				{#if loadError}
					<p class="text-body-sm text-accent-sunset">{loadError}</p>
					<button type="button" class="pill-outline mt-3" onclick={loadMore}>Try again</button>
				{:else if loading}
					<p class="font-mono text-caption-mono-sm text-mute">loading ...</p>
				{:else if !hasMore}
					<p class="font-mono text-caption-mono-sm text-mute">that's everything</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* The virtualiser needs a bounded scroll container to measure against. */
	.feed-viewport {
		height: calc(100vh - 260px);
		min-height: 420px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
</style>
