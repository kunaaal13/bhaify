/**
 * Site copy, kept in one file so the voice stays consistent.
 *
 * The register: declarative, slightly reverent, deadpan. Short fragments. State
 * the fact and stop — no exclamation marks, no "amazing", nothing that sounds
 * like a landing-page generator. It should read like someone who genuinely finds
 * this funny and is not going to explain the joke.
 *
 * These are our own lines. The tone was set by apnakyalenadena.com's framing,
 * but nothing here is lifted from it.
 */

export const COPY = {
	home: {
		// "keypad", not "zubaan": concrete, and it points at the exact thing that
		// makes the voice — a physical-keypad phone at 2am, which is where the
		// typos and the compression come from.
		tagline: 'Tumhara text . Bhai ka keypad .',
		intro:
			'Write one line. Get back what he would have sent at 2am — unspellchecked, unexplained, unbothered.'
	},

	dohe: {
		title: 'Bhai ke Dohe',
		intro:
			'Fifty-two posts, 2010 to 2026. No thread, no context, no follow-up — he typed it, sent it, and moved on. Collected here properly, because somebody had to.'
	},

	dialogues: {
		title: 'Bhai ke dialogue',
		intro:
			'The lines that outlived their films. Quoted at weddings, in group chats, and by people who never saw the movie.'
	},

	marquee: {
		label: 'Bhai ne kya kaha ...',
		note: 'Real posts. Nothing here is edited.'
	},

	wall: {
		title: 'Logon ne kya likhwaya',
		intro: 'Everything the internet has handed him so far. Newest first.',
		empty: 'Nothing yet. Somebody has to go first.',
		end: "that's everything"
	},

	about: {
		title: 'Baat cheet',
		intro:
			'A machine that types like bhai. Not a chatbot — it will not answer you, argue with you, or help you with anything. It takes what you wrote and sends it back in his voice.'
	}
} as const;
