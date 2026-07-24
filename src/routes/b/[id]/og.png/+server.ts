import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ImageResponse } from '@ethercorps/sveltekit-og/takumi';
import { db } from '$lib/server/db';
import { bhaifications } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Share card.
 *
 * Uses the Takumi engine rather than the Satori path because it ships a built-in
 * font — the Satori path needs real font buffers passed in (it cannot resolve a
 * CSS font stack), and loading woff2 through `$app/server`'s read() crashed the
 * dev worker outright with no logged error.
 *
 * Deliberately NOT a replica of a real tweet (PLAN.md §3.6). An image that can't
 * be told apart from a genuine screenshot is a misinformation vector and the
 * single most likely thing to draw a complaint — it turns parody into a
 * fabricated quote. So: our own chrome, a BHAIFIED stamp, and the disclaimer
 * rendered INTO the pixels, because an OG image travels without its page.
 */
function template(text: string, register: string | null): string {
	const size = text.length > 180 ? 38 : text.length > 90 ? 50 : 62;
	const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const tag = register ? ` // ${register.replace(/-/g, ' ').toUpperCase()}` : '';

	// Every node needs an explicit display value — the renderer has no CSS
	// defaults to fall back on.
	return `<div style="display:flex;flex-direction:column;width:100%;height:100%;background-color:#0a0a0a;padding:64px;">
	<div style="display:flex;width:100%;justify-content:space-between;">
		<div style="display:flex;font-size:20px;letter-spacing:2px;color:#7d8187;">BHAI NE KAHA${tag}</div>
		<div style="display:flex;font-size:20px;letter-spacing:2px;color:#7d8187;">BHAIFY</div>
	</div>
	<div style="display:flex;flex-grow:1;align-items:center;width:100%;">
		<div style="display:flex;color:#ffffff;font-size:${size}px;line-height:1.3;">${escaped}</div>
	</div>
	<div style="display:flex;flex-direction:column;width:100%;border-top:1px solid #212327;padding-top:24px;">
		<div style="display:flex;font-size:18px;letter-spacing:1px;color:#7d8187;">MACHINE-GENERATED PARODY . NOT A REAL QUOTE .</div>
		<div style="display:flex;font-size:18px;letter-spacing:1px;color:#7d8187;padding-top:8px;">FAN PROJECT . NOT AFFILIATED WITH SALMAN KHAN .</div>
	</div>
</div>`;
}

export const GET: RequestHandler = async ({ params }) => {
	const [row] = await db
		.select({
			text: bhaifications.outputText,
			register: bhaifications.register,
			isFlagged: bhaifications.isFlagged
		})
		.from(bhaifications)
		.where(eq(bhaifications.id, params.id))
		.limit(1);

	if (!row || row.isFlagged) error(404, 'Not found');

	return new ImageResponse(template(row.text, row.register), {
		width: WIDTH,
		height: HEIGHT,
		format: 'png',
		headers: {
			// Content at a given id never changes.
			'Cache-Control': 'public, immutable, no-transform, max-age=31536000'
		}
	});
};
