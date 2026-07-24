<script lang="ts">
	import BhaifyBox from '$lib/components/BhaifyBox.svelte';
</script>

<svelte:head>
	<title>Bhaify — text ko bhai bana do</title>
	<meta
		name="description"
		content="Type anything. Get it back in bhai's voice. A fan parody text transformer."
	/>
</svelte:head>

<!-- Hero band. Nothing else above the fold (PLAN.md §3.5) — the box IS the
     product, so the page shouldn't argue for it. -->
<section class="mx-auto max-w-3xl px-6 pt-16 pb-24 sm:pt-24">
	<p class="eyebrow">Persona transfer model // v1</p>

	<h1 class="mt-4 text-display-sm font-normal text-ink sm:text-display-md">Bhaify</h1>

	<p class="mt-3 text-body-lg text-body">Kuch bhi likho . Bhai bana denge .</p>

	<div class="mt-10">
		<BhaifyBox />
	</div>
</section>
