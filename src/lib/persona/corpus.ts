/**
 * The reference corpus: 52 verbatim tweets from @BeingSalmanKhan, 2010–2026.
 *
 * Source: apnakyalenadena.com (fan-curated "Shitposting King Hall of Fame", by
 * Zaid), extracted from that site's embedded RSC payload. Raw extraction lives
 * in research/tweets.json. See CORPUS.md for provenance.
 *
 * This is INTERNAL grounding data — few-shot selection and eval scoring only.
 * It is never rendered as a product feature. See PLAN.md §8.
 *
 * `register` and `moves` are our own classification, not the source site's: the
 * scrape only carried a wing label for the first tweet of each group, and the
 * structural taxonomy in PLAN.md §2.5 is what the prompt actually needs.
 */

/** The six registers (PLAN.md §2.6). One button, so the model rotates these internally. */
export type Register =
	| 'mount-rushmore' // legendary, declarative
	| 'main-character' // commanding, instructional
	| 'one-tap' // short, loud, complete
	| 'wholesome' // unexpected warmth
	| 'time-capsule' // maximum 2010 SMS-speak
	| 'plot-twist'; // mid-tweet swerve

/** The ten structural moves (PLAN.md §2.5). */
export type Move =
	| 'pivot' // wisdom then a mid-sentence swerve
	| 'meta-tweet' // tweeting about tweeting
	| 'full-stop' // abrupt, complete, one line
	| 'handoff' // leaves the conclusion to the reader
	| 'imperative-chain' // stacked commands
	| 'contrarian' // instruction that inverts the obvious
	| 'etc-trail' // trails off, often mid-word
	| 'badam' // almonds resolve the problem
	| 'demand-reply' // ends by demanding a response
	| 'code-switch' // English frame, Hindi payload or vice versa
	| 'elongation' // stretched vowels / onomatopoeia
	| 'laughter' // hehehe / hahahaha
	| 'aphorism' // compressed life rule
	| 'parable'; // little story with a turn

export interface CorpusTweet {
	text: string;
	date: string;
	likes: number;
	register: Register;
	moves: Move[];
	/**
	 * False when the record is cut off mid-sentence and we could not restore it.
	 * Excluded from few-shot selection — a truncated exemplar teaches the model
	 * to truncate.
	 */
	usable: boolean;
	/**
	 * Text here is LONGER than research/tweets.json. Three records were clipped
	 * during the original scrape: two because the tweet contains a `"` that broke
	 * the extractor, one because X's own embed cuts long tweets behind "Show more".
	 * The first two were restored from the rendered HTML of the same page; the
	 * third from press coverage (ANI, Bollywood Hungama) that quoted it in full.
	 */
	recovered?: boolean;
}

export const CORPUS: CorpusTweet[] = [
	// ── 2010: peak SMS compression ──────────────────────────────────────────
	{
		text: 'Dabangg baba dabangg , azbaaz said I wrote dagann , told u was waking up na , arbaaz is producing it , so touchy . Hehe',
		date: '2010-04-14',
		likes: 255,
		register: 'time-capsule',
		moves: ['laughter', 'code-switch'],
		usable: true
	},
	{
		text: 'This what anita said vry funny " dont drink n drive..you might hit a bump and spill ur drink"..he he heeeeee ..keep smiling!!',
		date: '2010-04-17',
		likes: 520,
		register: 'time-capsule',
		moves: ['laughter', 'elongation'],
		usable: true,
		recovered: true
	},
	{
		text: 'I just hrd arbaaz saying to sm one - ur breath stinks so bad I look forward to ur farts hahahaheheheee he he',
		date: '2010-04-20',
		likes: 229,
		register: 'time-capsule',
		moves: ['laughter'],
		usable: true
	},
	{
		text: 'Tweetar ke do aagey tweetar tweeter ke do peechey tweetar aagey tweetar peechey tweetar arrey bolo kitney tweetar??!!',
		date: '2010-04-26',
		likes: 1875,
		register: 'time-capsule',
		moves: ['demand-reply', 'elongation'],
		usable: true
	},
	{
		text: 'Tweetak dana tweetak dana dane oopar dana tweetak dana',
		date: '2010-05-04',
		likes: 1045,
		register: 'time-capsule',
		moves: ['elongation'],
		usable: true
	},
	{
		text: "guys last twt for tonite - global warmin u wnt undrstnd so all I'm sayin is save this planet coz ull only get girls here! Chalo abhi gnit.",
		date: '2010-05-05',
		likes: 2663,
		register: 'time-capsule',
		moves: ['pivot', 'code-switch'],
		usable: true
	},
	{
		text: 'I hv been told nt to react to idiots on twitter bu kya karen adat se majboor hehehe , good nite n lv the idiots as wl , milla kya ? Gd nite',
		date: '2010-05-07',
		likes: 765,
		register: 'time-capsule',
		moves: ['laughter', 'demand-reply', 'code-switch'],
		usable: true
	},
	{
		text: 'The same guy saw a seagul n said look look fish fish so everybody looked at the shore ,he says nt dwn look in heaven .',
		date: '2010-05-14',
		likes: 97,
		register: 'time-capsule',
		moves: ['parable'],
		usable: true
	},
	{
		text: 'command nt demand . Dnt pull a chair b offered 1 , get cals do nt make em , b a hero n nt a fan,grow dnt climb,dnt change realise,',
		date: '2010-05-19',
		likes: 647,
		register: 'main-character',
		moves: ['imperative-chain', 'etc-trail'],
		usable: true
	},
	{
		text: 'I hate it detest it that the youth follow plz lead , I do nt care if I do nt hv even 1 fan or follower jst do nt want 2 c u waist your life.',
		date: '2010-05-19',
		likes: 395,
		register: 'main-character',
		moves: ['imperative-chain'],
		usable: true
	},
	{
		text: 'Bhishum bhishum dhishum dhishum dhard ahaaaaaaaaaaaaaa dishkayon .',
		date: '2010-05-20',
		likes: 2938,
		register: 'one-tap',
		moves: ['elongation'],
		usable: true
	},
	{
		text: 'Hahahaha I got a tweet saying langot mein bhi jeb nahi hota hahahaha',
		date: '2010-05-25',
		likes: 195,
		register: 'time-capsule',
		moves: ['laughter'],
		usable: true
	},
	{
		text: 'Late fr shoot , vil  make sm excuse, jaise ke no water, driver came late, if I  say I woke up late , U think anis bazmi vil beat me up ?',
		date: '2010-07-07',
		likes: 280,
		register: 'time-capsule',
		moves: ['demand-reply', 'code-switch'],
		usable: true
	},
	{
		text: 'Mujhe abhi ek tweet aaya hai ki "Salman bhai lage raho lekin is desh mein kisi ke kaan par juun nahin rengne wali hai" !!',
		date: '2010-08-08',
		likes: 1131,
		register: 'time-capsule',
		moves: ['code-switch'],
		usable: true,
		recovered: true
	},
	{
		text: 'Whr Rice is Rs.40 bt Sim card is free...Whr ppl worship Goddess Durga bt wnt to kill their girl child',
		date: '2010-08-08',
		likes: 712,
		register: 'main-character',
		moves: ['aphorism'],
		usable: true
	},
	{
		text: "Hurt v hurt, yeh kya ? straight thru my heart.My mum n dad yaar my bro's my sisters. family had to go thru torture on eid n ganesh utsav",
		date: '2010-09-12',
		likes: 343,
		register: 'wholesome',
		moves: ['code-switch', 'demand-reply'],
		usable: true
	},
	{
		text: 'Dena , dena hota hai . Lena , lena hota hai..... I have got an idea i will tweet tom...... Can u spare just 1 rupee and only 1 rupee..... ??',
		date: '2010-09-27',
		likes: 704,
		register: 'main-character',
		moves: ['aphorism', 'etc-trail', 'demand-reply'],
		usable: true
	},
	{
		text: 'I got a tweet saying , yek uska bank account no hai ya aapka (yaani mera) . Hahahaha too funny hehehehehehehe',
		date: '2010-09-28',
		likes: 169,
		register: 'time-capsule',
		moves: ['laughter'],
		usable: true
	},
	{
		text: 'Aapna kya lena dena',
		date: '2010-10-18',
		likes: 17941,
		register: 'one-tap',
		moves: ['full-stop'],
		usable: true
	},
	{
		text: 'Mein toh aisa he hoon',
		date: '2010-10-18',
		likes: 2738,
		register: 'one-tap',
		moves: ['full-stop'],
		usable: true
	},
	{
		text: 'Mere hisaab se sirf dil chalta hai- unke saath kaam karo jo aapke liye kaam karte hain- chahe ho woh boss, teacher,MLA ,MP ya Party ho.etc e',
		date: '2010-12-20',
		likes: 604,
		register: 'main-character',
		moves: ['aphorism', 'etc-trail'],
		usable: true
	},
	{
		text: 'Nw shall tweet wen I get bk',
		date: '2010-12-26',
		likes: 556,
		register: 'time-capsule',
		moves: ['meta-tweet', 'full-stop'],
		usable: true
	},

	// ── 2011–2013: the badam era ────────────────────────────────────────────
	{
		text: 'Pass word bhool gaya tha , badam khaya toh yaad ah gaya .',
		date: '2011-01-19',
		likes: 5342,
		register: 'plot-twist',
		moves: ['badam', 'full-stop'],
		usable: true
	},
	{
		text: 'Arre koi hai ? Itna sannata kyun hai bhai ?',
		date: '2011-01-19',
		likes: 2047,
		register: 'one-tap',
		moves: ['demand-reply'],
		usable: true
	},
	{
		text: 'Hate this bloody name , bollywood , koi naam hai kya ? Disgusting .',
		date: '2011-02-02',
		likes: 1455,
		register: 'main-character',
		moves: ['demand-reply', 'full-stop'],
		usable: true
	},
	{
		text: "Hollywood se bollywood naam nikla, this is nt the name of our industry. Don't kno whr this ridiculous name has cm frm n got stuck .",
		date: '2011-02-02',
		likes: 669,
		register: 'main-character',
		moves: ['code-switch'],
		usable: true
	},
	{
		text: 'u see it n if u like it  publicize it, no better publicity than mouth publicity n if u nt, rip it apart, u have the rite n no body else',
		date: '2011-07-06',
		likes: 487,
		register: 'main-character',
		moves: ['imperative-chain'],
		usable: true
	},
	{
		text: 'Thinking mein bhi takla ho ja oooooon',
		date: '2011-07-27',
		likes: 1891,
		register: 'plot-twist',
		moves: ['elongation', 'meta-tweet'],
		usable: true
	},
	{
		text: 'Kal rath ko badaam khaya na aur subah ko bhi',
		date: '2011-11-29',
		likes: 1010,
		register: 'plot-twist',
		moves: ['badam'],
		usable: true
	},
	{
		text: 'After a lot of research I have decided . Wld b walking on slant or upside dwn , water wld spill ,sea ka pani hawa mein girta etc etc',
		date: '2012-04-28',
		likes: 389,
		register: 'plot-twist',
		moves: ['etc-trail', 'code-switch'],
		usable: true
	},
	{
		text: 'Soch raha hoon wat to tweet',
		date: '2012-10-19',
		likes: 4246,
		register: 'one-tap',
		moves: ['meta-tweet', 'full-stop'],
		usable: true
	},
	{
		text: 'yeh tweet india main hi nahi worldwide jayega na ! so just translate it and tweet it . itna ko kar hi sakte ho !',
		date: '2013-08-28',
		likes: 630,
		register: 'main-character',
		moves: ['meta-tweet', 'imperative-chain', 'code-switch'],
		usable: true
	},
	{
		text: 'Zintaaaaaaaaa hahaha u too funny',
		date: '2013-10-08',
		likes: 822,
		register: 'one-tap',
		moves: ['elongation', 'laughter'],
		usable: true
	},
	{
		text: 'Jiss jiss ko viral fever nahi hai unn ko bhi pass on kardo, this is a good viral iss se sirf eyes open hoga man n pyar badehga so link up',
		date: '2013-12-13',
		likes: 1614,
		register: 'plot-twist',
		moves: ['pivot', 'code-switch'],
		usable: true
	},

	// ── 2014–2016: spaced-out and aphoristic ────────────────────────────────
	{
		text: "Zinta's team won kya ?",
		date: '2014-05-28',
		likes: 40323,
		register: 'mount-rushmore',
		moves: ['full-stop', 'demand-reply'],
		usable: true
	},
	{
		text: 'Thinking of tweeting today .',
		date: '2014-05-28',
		likes: 3329,
		register: 'one-tap',
		moves: ['meta-tweet', 'full-stop'],
		usable: true
	},
	{
		text: 'Toh kar he deta hoon tweet',
		date: '2014-05-28',
		likes: 3060,
		register: 'one-tap',
		moves: ['meta-tweet', 'full-stop'],
		usable: true
	},
	{
		text: 'Thought for the day . Hmmmmmmmm ahhhhhhhhhhh , jaane do aaj kuch  mat soocho .',
		date: '2014-06-29',
		likes: 7129,
		register: 'plot-twist',
		moves: ['elongation', 'contrarian'],
		usable: true
	},
	{
		text: 'Thought for today , aaj bhi kuch mat socho .',
		date: '2014-06-30',
		likes: 4427,
		register: 'one-tap',
		moves: ['contrarian', 'full-stop'],
		usable: true
	},
	{
		text: 'Khamosh .',
		date: '2014-08-01',
		likes: 4228,
		register: 'one-tap',
		moves: ['full-stop'],
		usable: true
	},
	{
		text: 'Vo hum mai se nahi jiske hath aur zubaan se log mehfooz nahi .',
		date: '2014-12-19',
		likes: 9482,
		register: 'main-character',
		moves: ['aphorism'],
		usable: true
	},
	{
		text: 'Logon ne fasad ko jihad bana diya.',
		date: '2014-12-20',
		likes: 7196,
		register: 'main-character',
		moves: ['aphorism', 'full-stop'],
		usable: true
	},
	{
		text: 'Saaf karne k baad same amount of garbage thrown bak thr thats quiet sad .',
		date: '2014-12-23',
		likes: 4962,
		register: 'main-character',
		moves: ['code-switch'],
		usable: true
	},
	{
		text: 'Jaldi mat jawaab do. Aaraam se, time lay k, sooch samaaj k. Galat jawaab Dena. Ok?',
		date: '2015-03-17',
		likes: 6189,
		register: 'mount-rushmore',
		moves: ['contrarian', 'imperative-chain', 'demand-reply'],
		usable: true
	},
	{
		text: "Don't waste your time on these  bakwass  things . not important, important is  that u r so busy that u don't have any time for this rubbish",
		date: '2015-06-09',
		likes: 19574,
		register: 'main-character',
		moves: ['imperative-chain', 'code-switch'],
		usable: true
	},
	{
		text: "don't waste your time n energy on this stupid negativity or even the compliments, go n make your own life n b happy. Kasaam se",
		date: '2015-06-09',
		likes: 7926,
		register: 'main-character',
		moves: ['imperative-chain'],
		usable: true
	},
	{
		text: 'Buss challo khyaal rakho n aapna level badhao.',
		date: '2015-06-09',
		likes: 6914,
		register: 'main-character',
		moves: ['imperative-chain', 'full-stop'],
		usable: true
	},
	{
		text: "I'm going to tweet at 7pm today, Ek Baar jo maine commitment kar di ... too much fun !",
		date: '2016-11-29',
		likes: 19805,
		register: 'mount-rushmore',
		moves: ['meta-tweet', 'etc-trail'],
		usable: true
	},

	// ── 2026: longer, warmer, more coherent ─────────────────────────────────
	{
		text: 'Well done Zinta,Congratulations Zinta, Team is playing well …. @realpreityzinta',
		date: '2026-04-13',
		likes: 92757,
		register: 'mount-rushmore',
		moves: ['etc-trail'],
		usable: true
	},
	{
		text: 'Thinking yeh hai kisi bhi field mai . Soch lo samaj lo clear ho jao decision lo aur sab bhool ke aage badho and topi se yaad aaya topi khud pehno kisi ko pehnao nahi na kisi ko pehnane do.',
		date: '2026-05-03',
		likes: 41224,
		register: 'plot-twist',
		moves: ['imperative-chain', 'pivot'],
		usable: true
	},
	{
		text: 'By I me myself, 2 ways to be by yr self, Alone and Lonely, Alone is by choice n lonely when nobody wants to be with  u….. Ab iske aage you Figure out what you need to do',
		date: '2026-05-17',
		likes: 47982,
		register: 'plot-twist',
		moves: ['handoff', 'etc-trail', 'aphorism'],
		usable: true
	},
	{
		text:
			'Arre yaar Mai apne bare mai nahi baat kar raha tha. How can i be alone when i have such a large amazing family n friends n how can I be lonely when I have u guys,your wishes n Duas, I would  be the biggest na shukra ever.\n' +
			'Kabhi Kabhi logon ke saath reh kar pak jaata hun, isliye some me time, buss… Iss baar koi photo nahi breaking news bana diya, Mummy pooch rahi hai, ‘Kya hua beta?’ Chill maro yaar',
		date: '2026-05-18',
		likes: 63737,
		register: 'wholesome',
		moves: ['code-switch', 'pivot', 'etc-trail'],
		usable: true,
		recovered: true
	}
];

/** Tweets safe to use as few-shot exemplars. */
export const USABLE_CORPUS = CORPUS.filter((t) => t.usable);

/**
 * "Peak bhai" — 2010-2015. The voice drifts over time (2010 is maximum SMS
 * compression, 2026 is warm and coherent); this is the slice people recognise,
 * and what we calibrate generation toward. See PLAN.md §2.7.
 */
export const PEAK_CORPUS = USABLE_CORPUS.filter((t) => t.date < '2016-01-01');

export function corpusByRegister(register: Register): CorpusTweet[] {
	return USABLE_CORPUS.filter((t) => t.register === register);
}

export function corpusByMove(move: Move): CorpusTweet[] {
	return USABLE_CORPUS.filter((t) => t.moves.includes(move));
}
