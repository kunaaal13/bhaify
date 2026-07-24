import { describe, it, expect } from 'vitest';
import { cleanModelOutput, inferRegister } from './postprocess';

describe('cleanModelOutput', () => {
	it('strips a fully-wrapping quote', () => {
		expect(cleanModelOutput('"Khamosh ."')).toBe('Khamosh .');
		expect(cleanModelOutput('“Khamosh .”')).toBe('Khamosh .');
	});

	it('keeps quotes that are part of the content', () => {
		const withInner = 'Mujhe tweet aaya ki "lage raho" !!';
		expect(cleanModelOutput(withInner)).toBe(withInner);
	});

	it('does not unwrap when only one side is quoted', () => {
		expect(cleanModelOutput('"Khamosh')).toBe('"Khamosh');
	});

	it('strips conversational preambles', () => {
		expect(cleanModelOutput("Here's your bhaified version: Khamosh .")).toBe('Khamosh .');
		expect(cleanModelOutput('Output: Buss aur kuch nahi')).toBe('Buss aur kuch nahi');
		expect(cleanModelOutput('Bhaified: Chalo phir')).toBe('Chalo phir');
	});

	it('strips markdown fences', () => {
		expect(cleanModelOutput('```\nKhamosh .\n```')).toBe('Khamosh .');
		expect(cleanModelOutput('```text\nKhamosh .\n```')).toBe('Khamosh .');
	});

	it('leaves clean output untouched', () => {
		const clean = 'Yaar thak gaya hoon iss job se . Buss .';
		expect(cleanModelOutput(clean)).toBe(clean);
	});

	it('does not eat a colon that is part of the sentence', () => {
		const text = 'Do cheezein hain : ek yeh , ek woh .';
		expect(cleanModelOutput(text)).toBe(text);
	});

	it('handles empty and whitespace input', () => {
		expect(cleanModelOutput('   ')).toBe('');
		expect(cleanModelOutput('')).toBe('');
	});
});

describe('inferRegister', () => {
	it('calls short lines one-tap', () => {
		expect(inferRegister('Khamosh .')).toBe('one-tap');
		expect(inferRegister('Aapna kya lena dena')).toBe('one-tap');
	});

	it('detects the badam signature', () => {
		expect(inferRegister('Pass word bhool gaya , badaam khaya toh yaad aa gaya phir se')).toBe(
			'plot-twist'
		);
	});

	it('detects wholesome family register', () => {
		expect(
			inferRegister('Meri family aur mere dost hain toh main akela kaise ho sakta hoon yaar')
		).toBe('wholesome');
	});

	it('detects a demand for reply', () => {
		expect(inferRegister('Yeh sab kya ho raha hai aajkal duniya mein bolo bolo')).toBe(
			'demand-reply'
		);
	});

	it('detects imperative main-character register', () => {
		expect(inferRegister('Sooch lo samaj lo clear ho jao decision lo aur aage badho')).toBe(
			'main-character'
		);
	});

	it('always returns a known register', () => {
		const known = new Set([
			'one-tap',
			'plot-twist',
			'wholesome',
			'demand-reply',
			'main-character',
			'time-capsule'
		]);
		const samples = ['a b c d e f g h', 'xyz', 'x'.repeat(200), ''];
		for (const s of samples) expect(known.has(inferRegister(s))).toBe(true);
	});
});
