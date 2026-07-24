/**
 * Shared feed constants.
 *
 * Lives here rather than in the route because SvelteKit restricts `+server.ts`
 * to HTTP verb exports (GET, POST, …) plus a short allowlist — exporting
 * anything else from it is a build error.
 */

/** Rows per page. The +page.server.ts first batch and /api/feed must agree. */
export const BATCH_SIZE = 50;

export interface FeedItem {
	id: string;
	text: string;
	inputText: string;
	register: string | null;
	createdAt: string;
}

export interface FeedCursor {
	t: string;
	i: string;
}

export interface FeedPage {
	items: FeedItem[];
	hasMore: boolean;
	cursor: FeedCursor | null;
}
