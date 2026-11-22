export type CharState = 'correct' | 'wrong' | 'pending' | 'extra';

/** Compares typed text with the passage character by character. */
export function compare(passage: string, typed: string): { char: string; state: CharState }[] {
  const out: { char: string; state: CharState }[] = [];
  for (let i = 0; i < passage.length; i++) {
    if (i >= typed.length) out.push({ char: passage[i], state: 'pending' });
    else out.push({ char: passage[i], state: typed[i] === passage[i] ? 'correct' : 'wrong' });
  }
  for (let i = passage.length; i < typed.length; i++) out.push({ char: typed[i], state: 'extra' });
  return out;
}

export interface Stats {
  wpm: number; // net words per minute (5 characters = 1 word), uncorrected errors subtracted
  rawWpm: number;
  accuracy: number; // correct keystrokes ÷ all character keystrokes, 0–100
  correctChars: number;
  errors: number; // uncorrected wrong characters in the final text
  seconds: number;
}

export function computeStats(passage: string, typed: string, elapsedMs: number, keystrokes: number, wrongKeystrokes: number): Stats {
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  const states = compare(passage, typed);
  const correctChars = states.filter((s) => s.state === 'correct').length;
  const errors = states.filter((s) => s.state === 'wrong' || s.state === 'extra').length;
  const rawWpm = typed.length / 5 / minutes;
  const wpm = Math.max(0, rawWpm - errors / minutes);
  const accuracy = keystrokes ? Math.max(0, ((keystrokes - wrongKeystrokes) / keystrokes) * 100) : 100;
  return { wpm: Math.round(wpm), rawWpm: Math.round(rawWpm), accuracy: Math.round(accuracy * 10) / 10, correctChars, errors, seconds: Math.round(elapsedMs / 100) / 10 };
}

/** Tallies which expected characters were mistyped (for the “keys to practise” list). */
export function missedKeys(log: { expected: string; got: string }[]): [string, number][] {
  const m = new Map<string, number>();
  for (const e of log) if (e.expected !== e.got) m.set(e.expected, (m.get(e.expected) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

export interface Session {
  id: string;
  at: number;
  passageId: string;
  mode: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  seconds: number;
  missed: [string, number][];
}

export function summary(history: Session[]) {
  if (!history.length) return null;
  const best = Math.max(...history.map((h) => h.wpm));
  const last10 = history.slice(0, 10);
  const avg = last10.reduce((a, h) => a + h.wpm, 0) / last10.length;
  const acc = last10.reduce((a, h) => a + h.accuracy, 0) / last10.length;
  const keys = new Map<string, number>();
  for (const h of history.slice(0, 20)) for (const [k, n] of h.missed) keys.set(k, (keys.get(k) ?? 0) + n);
  return { best, avg: Math.round(avg), acc: Math.round(acc * 10) / 10, sessions: history.length, keys: [...keys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) };
}

export const visibleChar = (c: string) => (c === ' ' ? '␣' : c === '\n' ? '⏎' : c);
