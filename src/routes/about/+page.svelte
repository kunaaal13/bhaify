<svelte:head>
	<title>About — Bhaify</title>
	<meta
		name="description"
		content="What Bhaify is, what it isn't, and the disclaimer that matters."
	/>
</svelte:head>

<div class="mx-auto max-w-2xl px-6 pt-16 pb-24">
	<p class="eyebrow">About</p>
	<h1 class="mt-4 text-display-sm font-normal text-ink sm:text-display-md">
		A love letter, badly translated.
	</h1>
	<p class="mt-5 text-body-lg text-body">
		Bhaify takes anything you write and hands it back the way Bhai would have said it — same
		meaning, entirely different swagger.
	</p>

	<div class="mt-14 space-y-12">
		<section>
			<p class="eyebrow">The idea</p>
			<p class="mt-4 text-body-md text-body">
				Some people don't talk like everyone else. They talk in short lines that land like a
				dialogue, and half the fun is the delivery, not the point. This site is a small tribute to
				that — a machine that only knows one way to say things, and says everything that way.
			</p>
			<p class="mt-4 text-body-md text-body">
				It isn't a chatbot. It won't answer you, argue with you, or help you with anything. Give it
				a sentence and it gives that same sentence back, dressed differently. That's the whole
				trick.
			</p>
		</section>

		<section>
			<p class="eyebrow">Using it</p>
			<p class="mt-4 text-body-md text-body">
				Type something ordinary — a status update, an excuse, a bad opinion. Ordinary lines work
				best, because the gap between what you wrote and what comes back is where the joke lives.
			</p>
			<p class="mt-4 text-body-md text-body">
				The same words always come back the same way, so a link you share today will still read the
				same tomorrow. If you like one, put it on the Wall. If something on the Wall shouldn't be
				there, report it and it goes.
			</p>
		</section>

		<section>
			<p class="eyebrow">The serious bit</p>
			<div class="card mt-4 p-6">
				<!-- Deliberately plain. This paragraph is the thing that separates
				     parody from passing-off, so it stays blunt and unambiguous. -->
				<p class="text-body-md text-ink">
					Bhaify is a fan parody project. It is
					<strong class="font-normal"
						>not affiliated with, endorsed by, or associated with Salman Khan</strong
					>, or with any studio, production house, or platform.
				</p>
				<p class="mt-3 text-body-md text-body">
					Nothing here was written or said by him. Every line this site produces is machine-made
					parody in an imitated style, and is labelled that way wherever it can be shared.
				</p>
				<p class="mt-3 text-body-md text-body">
					Made with affection, not impersonation. If it ever reads like the real thing rather than
					an obvious joke about it, that's a bug.
				</p>
			</div>
		</section>

		<section>
			<p class="eyebrow">Your text</p>
			<p class="mt-4 text-body-md text-body">
				What you submit is saved so share links keep working. Rate limiting uses a one-way hash of
				your IP address — the address itself is never stored. Anything public can be reported and
				removed.
			</p>
		</section>

		<section class="border-t border-hairline pt-8">
			<p class="text-body-md text-body-mid">
				Built by
				<a
					href="https://x.com/kunaaal13"
					target="_blank"
					rel="noopener noreferrer"
					class="about-link">@kunaaal13</a
				>
				&middot;
				<a
					href="https://github.com/kunaaal13"
					target="_blank"
					rel="noopener noreferrer"
					class="about-link">GitHub</a
				>
			</p>
		</section>
	</div>
</div>

<style>
	.about-link {
		color: var(--color-ink);
		text-decoration: underline;
		text-decoration-color: var(--color-hairline);
		text-underline-offset: 4px;
		transition: text-decoration-color 150ms ease;
	}
	.about-link:hover {
		text-decoration-color: var(--color-ink);
	}
</style>
