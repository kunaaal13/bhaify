/**
 * Famous film dialogues, for the landing page.
 *
 * Separate from `persona/corpus.ts` on purpose: the corpus is real tweets used
 * to train the voice, these are screen lines used as decoration. Dialogues are
 * NEVER fed to the model — they're scripted lines written by screenwriters, and
 * training the persona on them would make it produce film dialogue rather than
 * the looser way he actually types.
 *
 * Wording verified against published dialogue collections; each is attributed to
 * its film. Anything that couldn't be confirmed was left out rather than
 * guessed at and misattributed.
 */

export interface Dialogue {
	line: string;
	film: string;
	year: number;
}

export const DIALOGUES: Dialogue[] = [
	{
		line: 'Mere baare mein itna mat sochna . Dil mein aata hoon , samajh mein nahi .',
		film: 'Kick',
		year: 2014
	},
	{
		line: 'Ek baar jo maine commitment kar di , uske baad toh main khud ki bhi nahi sunta .',
		film: 'Wanted',
		year: 2009
	},
	{
		line: 'Swagat nahi karoge aap hamara ?',
		film: 'Dabangg',
		year: 2010
	},
	{
		line: 'Mujhpe ek ehsaan karna , mujhpe koi ehsaan mat karna .',
		film: 'Bodyguard',
		year: 2011
	},
	{
		line: 'Zindagi mein teen cheezein kabhi underestimate mat karna — I , ME aur MYSELF .',
		film: 'Ready',
		year: 2011
	},
	{
		line: 'Main request nahi karta , ek hi baar bolta hoon , aur full and final ho jaata hai .',
		film: 'Tere Naam',
		year: 2003
	},
	{
		line: 'Aam aadmi sota hua sher hai . Ungli mat kar , jaag gaya toh cheer phaad dega .',
		film: 'Jai Ho',
		year: 2014
	},
	{
		line: 'Utna hi maro jitna ki khud bardasht kar sako .',
		film: 'Dabangg 2',
		year: 2012
	},
	{
		line: 'Kaam hi meri pooja hai aur pooja hi mera kaam hai .',
		film: 'Saajan',
		year: 1991
	},
	{
		line: 'Muscle dekha hai muscle ? Masal ke rakh doonga !',
		film: 'Andaz Apna Apna',
		year: 1994
	}
];

/** The one that gets top billing on the landing page. */
export const HERO_DIALOGUE = DIALOGUES[0];
