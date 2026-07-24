<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const r = $derived(data.result);

	const shareUrl = $derived(page.url.href);
	const ogUrl = $derived(new URL(`/b/${r.id}/og.png`, page.url.origin).href);

	let copied = $state(false);
	let reported = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard is permission-gated; silence is better than an error toast.
		}
	}

	async function report() {
		if (reported) return;
		reported = true;
		await fetch('/api/report', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: r.id })
		}).catch(() => {});
	}
</script>

<svelte:head>
	<title>{r.text.slice(0, 60)} — Bhaify</title>
	<meta name="description" content="Bhaified: {r.text.slice(0, 140)}" />

	<meta property="og:type" content="website" />
	<meta property="og:title" content="Bhaify" />
	<meta property="og:description" content={r.text.slice(0, 180)} />
	<meta property="og:image" content={ogUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={ogUrl} />
</svelte:head>

<div class="mx-auto max-w-3xl px-6 pt-12 pb-24">
	<p class="text-body-sm text-body-mid">Bhai ne kaha</p>

	<article class="card mt-6 p-6 sm:p-8">
		<p class="text-display-xs font-normal whitespace-pre-wrap text-ink sm:text-display-sm">
			{r.text}
		</p>
	</article>

	<p class="mt-4 font-mono text-caption-mono-sm text-mute">pehle : {r.inputText}</p>

	<div class="mt-8 flex flex-wrap items-center gap-2">
		<button type="button" class="pill-outline" onclick={copyLink}>
			{copied ? 'Link copied' : 'Copy link'}
		</button>
		<a class="pill-outline inline-block" href="/">Make your own</a>
		<a class="pill-outline inline-block" href="/wall">Wall</a>
	</div>

	<div class="mt-16 border-t border-hairline pt-6">
		<button
			type="button"
			class="font-mono text-caption-mono-sm text-mute transition-colors hover:text-body"
			onclick={report}
			disabled={reported}
		>
			{reported ? 'Reported' : 'Report'}
		</button>
	</div>
</div>
