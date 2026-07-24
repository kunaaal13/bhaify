<svelte:head>
	<title>About — Bhaify</title>
	<meta
		name="description"
		content="What Bhaify is, where the corpus came from, and the fine print."
	/>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 pt-12 pb-24">
	<p class="eyebrow">Colophon</p>
	<h1 class="mt-4 text-display-sm font-normal text-ink sm:text-display-md">About</h1>

	<div class="mt-10 space-y-10">
		<section>
			<h2 class="eyebrow">What this is</h2>
			<p class="mt-3 text-body-lg text-body">
				A text transformer. You type a message, it comes back rewritten in a Hinglish "bhai" voice.
				It is not a chatbot — it never answers your message, only re-voices it.
			</p>
		</section>

		<section>
			<h2 class="eyebrow">How it works</h2>
			<p class="mt-3 text-body-md text-body">
				A language model does the rewriting, guided by a style guide and a set of examples derived
				from a corpus of 52 real posts. A second, deterministic pass then applies the orthography —
				the SMS-era compression, the doubled Hindi vowels, the space before a full stop. Language
				models consistently under-apply those tics and drift back toward clean prose, so they are
				forced in code rather than hoped for in the prompt.
			</p>
			<p class="mt-3 text-body-md text-body">
				Every result is deterministic: the same input always produces the same three variants, which
				is what lets a share link keep working.
			</p>
		</section>

		<section>
			<h2 class="eyebrow">Corpus</h2>
			<p class="mt-3 text-body-md text-body">
				The 52 reference posts were collected by
				<a
					href="https://apnakyalenadena.com"
					class="text-ink underline underline-offset-4"
					rel="noopener"
				>
					apnakyalenadena.com</a
				>, a fan project by Zaid. Credit to them — this would not exist otherwise.
			</p>
		</section>

		<section>
			<h2 class="eyebrow">Photos</h2>
			<p class="mt-3 text-body-md text-body">
				All photographs come from Wikimedia Commons under Creative Commons licences, credited to
				<span class="text-ink">Bollywood Hungama</span> (CC BY 3.0). They are not press-agency
				images. Full provenance is recorded in <code class="text-ink">ASSETS.md</code> in the repository.
			</p>
		</section>

		<!-- The disclaimer that does the actual work. Prominent, not buried. -->
		<section class="card p-6">
			<h2 class="eyebrow">Fine print</h2>
			<p class="mt-3 text-body-md text-ink">
				Bhaify is a fan parody project. It is <strong class="font-normal"
					>not affiliated with, endorsed by, or associated with Salman Khan</strong
				>, or with any studio, production house, or platform.
			</p>
			<p class="mt-3 text-body-md text-body">
				Nothing this site generates was written or said by him. Outputs are machine-generated parody
				in an imitated style, and are labelled as such wherever they can be shared.
			</p>
			<p class="mt-3 text-body-md text-body">
				Submitted text is stored so share links keep working, along with a hashed IP for rate
				limiting. Raw IP addresses are never stored. Anything on the gallery can be reported and
				removed.
			</p>
		</section>
	</div>
</div>
