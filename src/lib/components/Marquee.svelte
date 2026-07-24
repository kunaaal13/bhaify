<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Full-bleed auto-scrolling marquee.
	 *
	 * The children snippet is rendered TWICE and the track translates by exactly
	 * -50%. At that point the second copy sits precisely where the first started,
	 * so the loop restarts invisibly — no JS, no scroll listener, no seam.
	 *
	 * Pauses on hover and on focus-within, so it can't drag a link out from under
	 * a pointer or a keyboard user mid-tab.
	 */
	interface Props {
		children: Snippet;
		/** Seconds for one full pass. Higher = slower. */
		duration?: number;
		/** Right-to-left by default; reverse gives the second row visual contrast. */
		reverse?: boolean;
	}

	let { children, duration = 70, reverse = false }: Props = $props();
</script>

<div class="marquee" style="--duration:{duration}s">
	<div class="track" class:reverse>
		<div class="row">{@render children()}</div>
		<!-- Duplicate. aria-hidden so screen readers don't announce every card twice. -->
		<div class="row" aria-hidden="true">{@render children()}</div>
	</div>
</div>

<style>
	.marquee {
		display: flex;
		overflow: hidden;
		/* Fade the edges so cards enter and leave instead of being cut off. */
		mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
	}

	.track {
		display: flex;
		width: max-content;
		gap: 16px;
		animation: scroll var(--duration) linear infinite;
	}
	.track.reverse {
		animation-direction: reverse;
	}

	.row {
		display: flex;
		gap: 16px;
		flex-shrink: 0;
	}

	.marquee:hover .track,
	.marquee:focus-within .track {
		animation-play-state: paused;
	}

	@keyframes scroll {
		from {
			transform: translateX(0);
		}
		to {
			/* -50% of the doubled track = exactly one copy. */
			transform: translateX(calc(-50% - 8px));
		}
	}

	/* Motion sensitivity: hold it still and let the row scroll manually instead. */
	@media (prefers-reduced-motion: reduce) {
		.track {
			animation: none;
		}
		.marquee {
			overflow-x: auto;
		}
	}
</style>
