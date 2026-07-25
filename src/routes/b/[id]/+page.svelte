<script lang="ts">
	import { page } from '$app/state';
	import BhaiPost from '$lib/components/BhaiPost.svelte';
	import CardActions from '$lib/components/CardActions.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const r = $derived(data.result);

	/** The dark card is what unfurls in a timeline; light is a download choice. */
	const ogUrl = $derived(new URL(`/b/${r.id}/og.png`, page.url.origin).href);

	let reported = $state(false);

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

{#snippet actions()}
	<CardActions id={r.id} text={r.text} {extra} />
{/snippet}

{#snippet extra()}
	<a class="pill-outline inline-block" href="/">Make your own</a>
	<a class="pill-outline inline-block" href="/wall">Wall</a>
{/snippet}

{#snippet original()}
	<p class="mt-3 font-mono text-caption-mono-sm text-mute">pehle : {r.inputText}</p>
{/snippet}

<div class="mx-auto max-w-3xl px-6 pt-12 pb-24">
	<p class="mb-6 text-body-sm text-body-mid">Bhai ne kaha</p>

	<!-- Same component the result card uses, so the page matches the image that
	     was shared to get here. -->
	<BhaiPost text={r.text} size="large" {actions} footer={original} />

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
