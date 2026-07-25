import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
// Takumi, not the default Satori export: it ships a built-in font. The Satori
// path needs font buffers passed in and crashed the dev worker with no logged
// error when fed woff2 through $app/server's read().
import { ImageResponse } from '@ethercorps/sveltekit-og/takumi';
import { db } from '$lib/server/db';
import { bhaifications } from '$lib/server/db/schema';
// ?inline gives a base64 data URI. The renderer has no network access and
// static/ is not processed by Vite, so the avatar has to be inlined.
import avatar from '$lib/assets/salman-avatar.jpg?inline';
import type { RequestHandler } from './$types';

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Two palettes, picked with ?theme=. Dark is the site's own tokens; light is
 * for anywhere the card lands on a white background — a deck, a doc, a light
 * timeline — where the dark card reads as a hole in the page.
 *
 * Nothing in the UI selects light: the toggle that did was removed as clutter,
 * so this is reachable by hand-editing the image URL only. Kept because it is
 * the whole cost of offering a light download again later.
 *
 * The light values are chosen here rather than read from layout.css because the
 * site has no light theme to borrow from. They stay warm-neutral to match the
 * off-white the dark theme already uses for hover ink.
 */
const THEMES = {
	dark: {
		card: '#191919',
		ink: '#ffffff',
		mute: '#7d8187'
	},
	light: {
		card: '#fdfdfb',
		ink: '#14161a',
		mute: '#6b6f76'
	}
} as const;

export type CardTheme = keyof typeof THEMES;

/**
 * Share card, styled as a post.
 *
 * The explicit "PARODY . NOT A REAL POST ." line and the `bhaify` wordmark were
 * both removed at the owner's request, so the image now carries no mark of its
 * own origin. What keeps it from reading as an X screenshot is that the card is
 * deliberately not a pixel replica of X's chrome, and that the page it links to
 * carries the full disclaimer (PLAN.md §3.6).
 *
 * Layout notes: the renderer supports flexbox only — no grid, no float — and
 * every node needs an explicit `display`, since there are no CSS defaults to
 * fall back on.
 */
function template(text: string, theme: CardTheme): string {
	const len = text.length;
	const size = len > 220 ? 34 : len > 140 ? 42 : len > 70 ? 52 : 62;
	const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const c = THEMES[theme];

	return `<div style="display:flex;flex-direction:column;width:100%;height:100%;background-color:${c.card};padding:72px;">

	<div style="display:flex;align-items:center;width:100%;">
		<img src="${avatar}" width="76" height="76" style="border-radius:76px;" />
		<div style="display:flex;flex-direction:column;margin-left:20px;">
			<div style="display:flex;color:${c.ink};font-size:30px;">Salman Khan</div>
			<div style="display:flex;color:${c.mute};font-size:24px;margin-top:4px;">@BeingSalmanKhan</div>
		</div>
	</div>

	<div style="display:flex;flex-grow:1;align-items:center;width:100%;padding-top:36px;">
		<div style="display:flex;color:${c.ink};font-size:${size}px;line-height:1.32;letter-spacing:-0.5px;">${escaped}</div>
	</div>

</div>`;
}

export const GET: RequestHandler = async ({ params, url }) => {
	const [row] = await db
		.select({ text: bhaifications.outputText, isFlagged: bhaifications.isFlagged })
		.from(bhaifications)
		.where(eq(bhaifications.id, params.id))
		.limit(1);

	if (!row || row.isFlagged) error(404, 'Not found');

	// Anything but an exact ?theme=light is dark, so a mangled param degrades to
	// the theme every existing share link already points at.
	const theme: CardTheme = url.searchParams.get('theme') === 'light' ? 'light' : 'dark';

	return new ImageResponse(template(row.text, theme), {
		width: WIDTH,
		height: HEIGHT,
		format: 'png',
		headers: {
			// Content at a given id and theme never changes, and the theme is part
			// of the URL, so the two variants cache separately.
			'Cache-Control': 'public, immutable, no-transform, max-age=31536000'
		}
	});
};
