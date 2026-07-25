<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	/**
	 * The action row under a bhaification — share, copy, download, card theme.
	 *
	 * One component so the result card on the home page and the permalink page
	 * cannot drift: they used to share differently (home shared text + link,
	 * the permalink shared the image), which meant the same button did two
	 * different things depending on where you pressed it.
	 */
	interface Props {
		id: string;
		text: string;
		/** Shown after the standard actions — page-specific links. */
		extra?: Snippet;
		onRegenerate?: () => void;
		regenerating?: boolean;
	}

	let { id, text, extra, onRegenerate, regenerating = false }: Props = $props();

	/** Everything works here — no need to visit the permalink to share it. */
	const shareUrl = $derived(new URL(`/b/${id}`, page.url.origin).href);

	const imageUrl = $derived(new URL(`/b/${id}/og.png`, page.url.origin).href);
	const fileName = $derived(`bhai-${id}.png`);

	type Flash = 'link' | 'text' | null;
	let flashed = $state<Flash>(null);
	let timer: ReturnType<typeof setTimeout>;

	async function copy(what: Exclude<Flash, null>) {
		try {
			await navigator.clipboard.writeText(what === 'link' ? shareUrl : text);
			flashed = what;
			clearTimeout(timer);
			timer = setTimeout(() => (flashed = null), 1800);
		} catch {
			// Clipboard is permission-gated and absent over plain http. Failing
			// silently beats an error toast for a nice-to-have.
		}
	}

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
	 * The image goes alone — no url, no text. A share sheet treats each of those
	 * as a separate item, and since the permalink's own preview image *is* this
	 * card, bundling the link makes the picture arrive twice: once as the file,
	 * once as the link's unfurled preview. Copy link covers anyone who wants the
	 * URL.
	 *
	 * Falls back to a link-only share where files are unsupported — desktop
	 * Safari and Firefox.
	 */
	async function share() {
		if (sharing) return;
		sharing = true;

		try {
			const file = await cardImage();
			const payload: ShareData =
				file && navigator.canShare?.({ files: [file] })
					? { files: [file] }
					: { title: 'Bhaify', text, url: shareUrl };
			await navigator.share(payload);
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
			const res = await fetch(imageUrl);
			if (!res.ok) return null;
			const blob = await res.blob();
			return new File([blob], fileName, { type: 'image/png' });
		} catch {
			return null;
		}
	}
</script>

{#if canShare}
	<button type="button" class="pill-filled" onclick={share} disabled={sharing}>
		{sharing ? 'Opening...' : 'Share'}
	</button>
{/if}

<button type="button" class={canShare ? 'pill-outline' : 'pill-filled'} onclick={() => copy('link')}>
	{flashed === 'link' ? 'Link copied' : 'Copy link'}
</button>

<button type="button" class="pill-outline" onclick={() => copy('text')}>
	{flashed === 'text' ? 'Copied' : 'Copy text'}
</button>

<!-- Same-origin, so the browser honours `download` instead of navigating. -->
<a class="pill-outline inline-block" href={imageUrl} download={fileName}>Download</a>

{#if onRegenerate}
	<button type="button" class="pill-outline" onclick={onRegenerate} disabled={regenerating}>
		{regenerating ? 'Working...' : 'Try again'}
	</button>
{/if}

{@render extra?.()}
