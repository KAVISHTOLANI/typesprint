import { describe, expect, it } from 'vitest';
import { compare, computeStats, missedKeys, summary, visibleChar, type Session } from './typing';
import { PASSAGES } from './passages';

describe('comparison', () => {
  it('marks correct, wrong, pending and extra characters', () => {
    expect(compare('cat', 'cut!').map((c) => c.state)).toEqual(['correct', 'wrong', 'correct', 'extra']);
    expect(compare('dog', 'd').map((c) => c.state)).toEqual(['correct', 'pending', 'pending']);
  });
});

describe('stats', () => {
  it('computes net and raw WPM and accuracy', () => {
    // 50 chars correct in 60 s = 10 WPM; no errors
    const p = 'a'.repeat(50);
    expect(computeStats(p, p, 60000, 50, 0)).toMatchObject({ wpm: 10, rawWpm: 10, accuracy: 100, errors: 0 });
    // 2 uncorrected errors in 30 s → net subtracts 4/min
    const s = computeStats('a'.repeat(25), 'a'.repeat(23) + 'bb', 30000, 27, 4);
    expect(s.rawWpm).toBe(10);
    expect(s.wpm).toBe(6);
    expect(s.accuracy).toBeCloseTo(85.2, 1);
  });
  it('never divides by zero', () => {
    expect(computeStats('abc', '', 0, 0, 0)).toMatchObject({ wpm: 0, accuracy: 100 });
  });
  it('tallies missed keys and summarises history', () => {
    expect(missedKeys([{ expected: 'e', got: 'r' }, { expected: 'e', got: 'w' }, { expected: 'a', got: 'a' }, { expected: ' ', got: 'x' }])).toEqual([['e', 2], [' ', 1]]);
    const h = (wpm: number, accuracy: number): Session => ({ id: String(wpm), at: 0, passageId: 'x', mode: '30s', wpm, rawWpm: wpm, accuracy, errors: 0, seconds: 30, missed: [['e', 1]] });
    expect(summary([h(40, 95), h(60, 99)])).toMatchObject({ best: 60, avg: 50, acc: 97, sessions: 2, keys: [['e', 2]] });
    expect(summary([])).toBeNull();
    expect(visibleChar(' ')).toBe('␣');
  });
  it('has original passages at three levels', () => {
    expect(new Set(PASSAGES.map((p) => p.level))).toEqual(new Set(['easy', 'medium', 'hard']));
    expect(PASSAGES.every((p) => p.text.length > 150)).toBe(true);
  });
});
