<script lang="ts">
	/**
	 * Pipeline values presented as model telemetry.
	 *
	 * The joke and the debug panel are the same element (PLAN.md §3.5): the page
	 * is styled as a frontier-model launch, so real generation metadata reads as
	 * deadpan instrumentation rather than decoration. Every value here is genuine.
	 */
	interface Props {
		register?: string | null;
		markers: number;
		model: string;
		latencyMs?: number | null;
		cached?: boolean;
	}

	let { register, markers, model, latencyMs, cached = false }: Props = $props();

	const cells = $derived(
		[
			register ? { label: 'Andaaz', value: register.replace(/-/g, ' ') } : null,
			{ label: 'Nishaan', value: String(markers) },
			{ label: 'Dimaag', value: model },
			// A cache hit has no meaningful latency — showing the original call's
			// duration would be a lie about this request.
			cached
				? { label: 'Kahan se', value: 'yaad se' }
				: latencyMs != null
					? { label: 'Waqt', value: `${latencyMs}ms` }
					: null
		].filter((c) => c !== null)
	);
</script>

<dl class="flex flex-wrap items-center gap-x-5 gap-y-2">
	{#each cells as cell (cell.label)}
		<div class="flex items-baseline gap-2">
			<dt class="eyebrow">{cell.label}</dt>
			<dd class="eyebrow text-body">{cell.value}</dd>
		</div>
	{/each}
</dl>
