<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col bg-canvas">
	<header class="border-b border-hairline">
		<nav class="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
			<a href="/" class="text-body-sm text-ink">Bhaify</a>
			<div class="flex items-center gap-6">
				<a href="/gallery" class="text-body-sm text-body-mid transition-colors hover:text-ink">
					Gallery
				</a>
				<a href="/about" class="text-body-sm text-body-mid transition-colors hover:text-ink">
					About
				</a>
			</div>
		</nav>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-hairline">
		<div class="mx-auto max-w-3xl px-6 py-6">
			<!-- Parody disclaimer. PLAN.md §8 — the main thing separating commentary
			     from passing-off, so it stays on every page, not just /about. -->
			<p class="eyebrow leading-relaxed">
				Fan parody project. Not affiliated with, endorsed by, or associated with Salman Khan.
			</p>
		</div>
	</footer>
</div>
