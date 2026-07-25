<script lang="ts">
	import { page } from '$app/state';
	import BhaiPost from '$lib/components/BhaiPost.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const r = $derived(data.result);

	const shareUrl = $derived(page.url.href);
	const ogUrl = $derived(new URL(`/b/${r.id}/og.png`, page.url.origin).href);

	let copied = $state(false);
	let reported = $state(false);

	// Resolved after mount, not during render: the server has no navigator, and
	// guessing would mismatch on hydration.
	let canShare = $state(false);
	$effect(() => {
		canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	});

	let sharing = $state(false);

	/**
	 * Puts the card image in the tray, so it lands in WhatsApp or Instagram as a
	 * picture rather than a link nobody taps.
	 *
	 * Which payloads a browser accepts varies, so each shape is offered to
	 * canShare() before it is used: image plus link, then image alone (iOS drops
	 * some combinations), then the link on its own if files are unsupported
	 * entirely — desktop Safari and Firefox.
	 */
	async function share() {
		if (sharing) return;
		sharing = true;

		try {
			const file = await cardImage();
			const payloads: ShareData[] = file
				? [
						{ files: [file], text: r.text, url: shareUrl },
						{ files: [file], text: r.text },
						{ files: [file] }
					]
				: [];
			payloads.push({ title: 'Bhaify', text: r.text, url: shareUrl });

			const payload = payloads.find((p) => (p.files ? navigator.canShare?.(p) : true));
			if (payload) await navigator.share(payload);
		} catch {
			// Dismissing the tray rejects with AbortError. Nothing went wrong.
		} finally {
			sharing = false;
		}
	}

	/** null if the image can't be fetched or the browser has no File support. */
	async function cardImage(): Promise<File | null> {
		if (typeof File !== 'function' || typeof navigator.canShare !== 'function') return null;
		try {
			const res = await fetch(ogUrl);
			if (!res.ok) return null;
			const blob = await res.blob();
			return new File([blob], `bhai-${r.id}.png`, { type: 'image/png' });
		} catch {
			return null;
		}
	}

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

{#snippet actions()}
	{#if canShare}
		<button type="button" class="pill-filled" onclick={share} disabled={sharing}>
			{sharing ? 'Opening…' : 'Share'}
		</button>
	{/if}
	<button type="button" class={canShare ? 'pill-outline' : 'pill-filled'} onclick={copyLink}>
		{copied ? 'Link copied' : 'Copy link'}
	</button>
	<!-- Same-origin, so the browser honours `download` instead of navigating. -->
	<a class="pill-outline inline-block" href={ogUrl} download="bhai-{r.id}.png">Download</a>
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
