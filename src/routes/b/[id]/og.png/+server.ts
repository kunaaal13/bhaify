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
 * Share card, styled as a post.
 *
 * It reads as a nice tweet-shaped card — avatar, name, handle — but is
 * deliberately NOT a pixel replica of X's chrome, and carries a visible
 * "bhaify — parody" mark (PLAN.md §3.6). An image indistinguishable from a real
 * screenshot turns parody into a fabricated quote, which is both a
 * misinformation vector and the likeliest thing to draw a complaint. The label
 * costs one line and keeps the whole thing defensible.
 *
 * Layout notes: the renderer supports flexbox only — no grid, no float — and
 * every node needs an explicit `display`, since there are no CSS defaults to
 * fall back on.
 */
function template(text: string): string {
	const len = text.length;
	const size = len > 220 ? 34 : len > 140 ? 42 : len > 70 ? 52 : 62;
	const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	return `<div style="display:flex;width:100%;height:100%;background-color:#0a0a0a;padding:56px;">
	<div style="display:flex;flex-direction:column;width:100%;height:100%;background-color:#191919;border:1px solid #212327;border-radius:24px;padding:48px;">

		<div style="display:flex;align-items:center;width:100%;">
			<img src="${avatar}" width="76" height="76" style="border-radius:76px;" />
			<div style="display:flex;flex-direction:column;margin-left:20px;">
				<div style="display:flex;color:#ffffff;font-size:30px;">Salman Khan</div>
				<div style="display:flex;color:#7d8187;font-size:24px;margin-top:4px;">@BeingSalmanKhan</div>
			</div>
		</div>

		<div style="display:flex;flex-grow:1;align-items:center;width:100%;padding-top:36px;padding-bottom:36px;">
			<div style="display:flex;color:#ffffff;font-size:${size}px;line-height:1.32;letter-spacing:-0.5px;">${escaped}</div>
		</div>

		<div style="display:flex;width:100%;align-items:center;justify-content:space-between;border-top:1px solid #212327;padding-top:28px;">
			<div style="display:flex;align-items:center;">
				<div style="display:flex;width:10px;height:10px;border-radius:10px;background-color:#ff7a17;"></div>
				<div style="display:flex;color:#ffffff;font-size:24px;margin-left:12px;">bhaify</div>
			</div>
			<div style="display:flex;color:#7d8187;font-size:20px;letter-spacing:1px;">PARODY . NOT A REAL POST .</div>
		</div>

	</div>
</div>`;
}

export const GET: RequestHandler = async ({ params }) => {
	const [row] = await db
		.select({ text: bhaifications.outputText, isFlagged: bhaifications.isFlagged })
		.from(bhaifications)
		.where(eq(bhaifications.id, params.id))
		.limit(1);

	if (!row || row.isFlagged) error(404, 'Not found');

	return new ImageResponse(template(row.text), {
		width: WIDTH,
		height: HEIGHT,
		format: 'png',
		headers: {
			// Content at a given id never changes.
			'Cache-Control': 'public, immutable, no-transform, max-age=31536000'
		}
	});
};
