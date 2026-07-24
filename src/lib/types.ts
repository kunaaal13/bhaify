/** Shape returned by POST /api/bhaify. Shared by the endpoint and the UI. */
export interface BhaifyResult {
	id: string;
	text: string;
	register: string | null;
	quirkDensity: number;
	markers: number;
	model: string;
	latencyMs: number | null;
	variantSlot: number;
	cached: boolean;
	variantSlots?: number;
}

export interface BhaifyError {
	error: string;
	reason?: string;
	rule?: string;
}
