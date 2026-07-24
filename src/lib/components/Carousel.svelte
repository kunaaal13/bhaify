<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Horizontal snap carousel.
	 *
	 * Native scroll-snap rather than a JS transform track: it gets touch, trackpad,
	 * keyboard and screen-reader behaviour for free, and degrades to a plain
	 * scrollable row if JS never runs. The arrows just drive scrollBy().
	 */
	interface Props {
		label: string;
		/** Rendered once per item by the parent. */
		children: Snippet;
		/** Card width; also the scroll step. */
		itemWidth?: number;
	}

	let { label, children, itemWidth = 340 }: Props = $props();

	let track = $state<HTMLDivElement | null>(null);
	let atStart = $state(true);
	let atEnd = $state(false);

	/** Ties the arrow buttons to the track they drive, for assistive tech. */
	const trackId = $derived(`carousel-${label.replace(/\W+/g, '-').toLowerCase()}`);

	function updateEdges() {
		if (!track) return;
		atStart = track.scrollLeft <= 2;
		// 2px slack: sub-pixel layout means scrollLeft rarely hits the exact max.
		atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
	}

	function scrollByCards(direction: 1 | -1) {
		track?.scrollBy({ left: direction * itemWidth, behavior: 'smooth' });
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			scrollByCards(1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			scrollByCards(-1);
		}
	}

	$effect(() => {
		updateEdges();
	});
</script>

<section aria-label={label}>
	<div class="mb-3 flex items-center justify-between gap-4">
		<h2 class="eyebrow">{label}</h2>

		<div class="flex shrink-0 gap-2">
			<!-- Arrow-key handling lives on the buttons, which are genuinely
			     interactive. Putting tabindex on the scroll track would make a
			     non-interactive div focusable for no benefit — the buttons already
			     give keyboard users a complete path through the carousel. -->
			<button
				type="button"
				class="nav-btn"
				aria-label="Previous"
				aria-controls={trackId}
				disabled={atStart}
				onclick={() => scrollByCards(-1)}
				onkeydown={onKeydown}
			>
				&larr;
			</button>
			<button
				type="button"
				class="nav-btn"
				aria-label="Next"
				aria-controls={trackId}
				disabled={atEnd}
				onclick={() => scrollByCards(1)}
				onkeydown={onKeydown}
			>
				&rarr;
			</button>
		</div>
	</div>

	<div
		bind:this={track}
		id={trackId}
		onscroll={updateEdges}
		class="-mx-6 flex snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto scroll-smooth px-6 pb-2"
	>
		{@render children()}
	</div>
</section>

<style>
	.nav-btn {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-pill);
		border: 1px solid rgb(255 255 255 / 0.25);
		color: var(--color-ink);
		font-size: 14px;
		line-height: 1;
		transition:
			border-color 150ms ease,
			opacity 150ms ease;
	}
	.nav-btn:hover:not(:disabled) {
		border-color: rgb(255 255 255 / 0.5);
	}
	.nav-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	/* Hide the scrollbar — the arrows and snap points are the affordance. */
	.scrollbar-none {
		scrollbar-width: none;
	}
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
</style>
