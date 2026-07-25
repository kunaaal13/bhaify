<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	/**
	 * Vercel Analytics. Runs once at module load, in the root layout, so it
	 * covers every route.
	 *
	 * `mode` is set explicitly: in dev it logs to the console instead of sending
	 * beacons, so local clicking around doesn't pollute production numbers.
	 *
	 * Page URLs here contain a bhaification id (/b/[id]) but no user text, so
	 * nothing a visitor typed is sent to the analytics endpoint.
	 */
	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children } = $props();

	const links = [
		{ href: '/dohe', label: 'Dohe' },
		{ href: '/wall', label: 'Wall' },
		{ href: '/about', label: 'About' }
	];

	const isActive = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(href + '/');
</script>

<svelte:head>
	<!-- Two sizes: browsers pick 32 for the tab, 96 for bookmarks and the
	     Android home screen. Serving only the 512 would make every tab decode a
	     400kB PNG to draw 32 pixels. -->
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
	<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-canvas">
	<!-- Sticky, translucent. The marquee runs under it, so a solid bar would look
	     detached while a transparent one would let cards collide with the links. -->
	<header class="sticky top-0 z-50 border-b border-hairline bg-canvas/80 backdrop-blur-md">
		<nav class="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
			<a href="/" class="group flex shrink-0 items-center gap-2.5">
				<img
					src="/images/salman-avatar.jpg"
					alt=""
					width="56"
					height="56"
					class="h-7 w-7 rounded-full border border-hairline object-cover"
				/>
				<span class="text-display-xs leading-none font-normal tracking-tight text-ink">Bhaify</span>
			</a>

			<div class="flex items-center gap-1">
				{#each links as link (link.href)}
					<a
						href={link.href}
						aria-current={isActive(link.href) ? 'page' : undefined}
						class="nav-link {isActive(link.href) ? 'is-active' : ''}"
					>
						{link.label}
					</a>
				{/each}
			</div>
		</nav>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="mt-auto border-t border-hairline">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between"
		>
			<!-- Parody disclaimer. PLAN.md §8 — the main thing separating commentary
			     from passing-off, so it stays on every page, not just /about. -->
			<p class="font-mono text-caption-mono-sm leading-relaxed text-mute">
				Fan parody project. Not affiliated with, endorsed by, or associated with Salman Khan.
			</p>
			<div class="flex shrink-0 items-center gap-4 font-mono text-caption-mono-sm text-mute">
				<span>
					Built by
					<a
						href="https://x.com/kunaaal13"
						target="_blank"
						rel="noopener noreferrer"
						class="footer-link">@kunaaal13</a
					>
				</span>
				<span aria-hidden="true" class="opacity-40">/</span>
				<a
					href="https://github.com/kunaaal13"
					target="_blank"
					rel="noopener noreferrer"
					class="footer-link">GitHub</a
				>
				<span aria-hidden="true" class="opacity-40">/</span>
				<a href="/about" class="footer-link">About &rarr;</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.nav-link {
		border-radius: var(--radius-pill);
		padding: 6px 14px;
		font-size: var(--text-body-sm);
		color: var(--color-body-mid);
		transition:
			color 150ms ease,
			background-color 150ms ease;
	}
	.nav-link:hover {
		color: var(--color-ink);
		background-color: var(--color-canvas-soft);
	}
	.nav-link.is-active {
		color: var(--color-ink);
		background-color: var(--color-canvas-soft);
	}
	.footer-link {
		color: var(--color-body);
		transition: color 150ms ease;
	}
	.footer-link:hover {
		color: var(--color-ink);
	}
</style>
