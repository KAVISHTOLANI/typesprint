import { useEffect, useRef, useState } from 'react';
import { DemoTag, EmptyState, Landing, NotFound, Notice, PageHead, Shell, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
import { PASSAGES } from './lib/passages';
import { compare, computeStats, missedKeys, summary, visibleChar, type Session, type Stats } from './lib/typing';

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/test', label: 'Typing test' },
  { to: '/history', label: 'History' },
];
const MODES = [{ id: '15', label: '15 s', secs: 15 }, { id: '30', label: '30 s', secs: 30 }, { id: '60', label: '60 s', secs: 60 }, { id: 'full', label: 'Whole passage', secs: 0 }];

function demoHistory(): Session[] {
  const base = Date.now() - 9 * 86_400_000;
  const wpms = [38, 41, 40, 45, 43, 48, 47, 52, 50, 55];
  return wpms.map((w, i) => ({ id: `demo-${i}`, at: base + i * 20 * 3_600_000, passageId: PASSAGES[i % PASSAGES.length].id, mode: ['30', '60', '30', 'full'][i % 4], wpm: w, rawWpm: w + 3 + (i % 3), accuracy: 92 + (i % 5) * 1.5, errors: 4 - (i % 4), seconds: 30, missed: [['e', 2 - (i % 2)], [i % 2 ? ';' : 'q', 1]] as [string, number][] })).reverse();
}

export default function App() {
  const [route] = useRoute();
  const [history, setHistory] = usePersistentState<Session[]>('typesprint:history', demoHistory);
  let page;
  if (route === '/') page = <Home />;
  else if (route === '/test') page = <Test onFinish={(s) => setHistory([s, ...history].slice(0, 200))} best={summary(history)?.best ?? null} />;
  else if (route === '/history') page = <History history={history} setHistory={setHistory} />;
  else page = <NotFound />;
  return (
    <Shell name="TypeSprint" wordmark={['Type', 'Sprint']} nav={NAV} route={route} cta={{ to: '/test', label: 'Start a test' }}>
      {page}
    </Shell>
  );
}

function PassageView({ text, typed, focus }: { text: string; typed: string; focus: boolean }) {
  const chars = compare(text, typed);
  return (
    <p className={`passage ${focus ? 'is-focus' : ''}`} aria-hidden="true">
      {chars.map((c, i) => (
        <span key={i} className={`ch ${c.state} ${i === typed.length ? 'caret' : ''}`}>{c.state === 'wrong' && c.char === ' ' ? '␣' : c.char}</span>
      ))}
      {typed.length >= text.length && <span className="ch caret" />}
    </p>
  );
}

function Home() {
  const demo = PASSAGES[0].text.slice(0, 120);
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x >= demo.length ? 0 : x + 1)), 90);
    return () => clearInterval(id);
  }, [demo.length]);
  const typed = demo.slice(0, n).replace(/(.{37})./, '$1x');
  return (
    <Landing
      compact
      eyebrow="Typing practice · timed tests"
      title={<>Type faster, <em>with fewer mistakes.</em></>}
      lead="Short, original passages, a clock that starts when you do, and honest numbers at the end: words per minute, accuracy, every mistake highlighted, and the keys that trip you up most."
      primary={{ href: '#/test', label: 'Start a test' }}
      secondary={{ href: '#/history', label: 'See your history' }}
      previewLabel="Auto-typing demo — mistakes in red"
      meta={['15 s · 30 s · 60 s · full passage', 'Net WPM', 'History saved locally']}
      preview={<div className="hero-type"><PassageView text={demo} typed={typed} focus /></div>}
      steps={[
        { title: 'Pick a test', body: 'Choose a length and a passage — easy prose, or harder text with numbers and symbols.' },
        { title: 'Just start typing', body: 'The timer starts on your first key. Mistakes turn red; fix them or keep going.' },
        { title: 'Read the results', body: 'Net and raw WPM, accuracy, errors and the keys to practise, saved to your history.' },
      ]}
      features={[
        { title: 'Honest scoring', body: 'Net WPM subtracts uncorrected errors. Accuracy counts every keystroke, even ones you later fixed.' },
        { title: 'Mistake highlighting', body: 'Wrong characters are marked in place — including wrongly typed spaces.' },
        { title: 'Keys to practise', body: 'Your most-missed characters across recent tests, with counts.' },
        { title: 'Progress chart', body: 'WPM and accuracy over your last sessions, plus your personal best.' },
      ]}
      note="Pasting is disabled during a test. One word = five characters, the usual typing-test convention."
      closing={{ title: <>Thirty seconds. <em>Go.</em></>, action: { href: '#/test', label: 'Start a test' } }}
    />
  );
}

type Phase = 'ready' | 'running' | 'done';

function Test({ onFinish, best }: { onFinish: (s: Session) => void; best: number | null }) {
  const [mode, setMode] = usePersistentState('typesprint:mode', '30');
  const [pid, setPid] = usePersistentState('typesprint:passage', PASSAGES[0].id);
  const passage = PASSAGES.find((p) => p.id === pid) ?? PASSAGES[0];
  const secs = MODES.find((m) => m.id === mode)?.secs ?? 30;
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>('ready');
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(0);
  const [keys, setKeys] = useState({ total: 0, wrong: 0 });
  const [log, setLog] = useState<{ expected: string; got: string }[]>([]);
  const [result, setResult] = useState<Stats | null>(null);
  const [flash, setFlash] = useFlash();
  const ref = useRef<HTMLTextAreaElement>(null);
  const state = useRef({ typed, keys, log, start });
  state.current = { typed, keys, log, start };

  const elapsed = phase === 'running' ? now - start : 0;
  const left = secs ? Math.max(0, secs - elapsed / 1000) : null;
  const live = phase === 'running' && elapsed > 1500 ? computeStats(passage.text, typed, elapsed, keys.total, keys.wrong) : null;

  function finish(end = Date.now()) {
    const s = state.current;
    const st = computeStats(passage.text, s.typed, end - s.start, s.keys.total, s.keys.wrong);
    setResult(st);
    setPhase('done');
    onFinish({ id: uid('s'), at: end, passageId: passage.id, mode, wpm: st.wpm, rawWpm: st.rawWpm, accuracy: st.accuracy, errors: st.errors, seconds: st.seconds, missed: missedKeys(s.log) });
  }

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (secs && t - state.current.start >= secs * 1000) finish(state.current.start + secs * 1000);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secs]);

  function reset(newPid?: string) {
    if (newPid) setPid(newPid);
    setTyped('');
    setPhase('ready');
    setKeys({ total: 0, wrong: 0 });
    setLog([]);
    setResult(null);
    setTimeout(() => ref.current?.focus(), 0);
  }

  function onChange(v: string) {
    if (phase === 'done') return;
    const nowT = Date.now();
    if (phase === 'ready') {
      if (!v) return;
      setPhase('running');
      setStart(nowT);
      setNow(nowT);
      state.current.start = nowT;
    }
    if (v.length > typed.length) {
      const added = v.slice(typed.length);
      let wrong = 0;
      const entries = [...added].map((ch, i) => {
        const expected = passage.text[typed.length + i] ?? '';
        if (ch !== expected) wrong++;
        return { expected, got: ch };
      });
      setKeys((k) => ({ total: k.total + added.length, wrong: k.wrong + wrong }));
      setLog((l) => [...l, ...entries]);
      state.current.keys = { total: keys.total + added.length, wrong: keys.wrong + wrong };
      state.current.log = [...log, ...entries];
    }
    const capped = v.slice(0, passage.text.length);
    setTyped(capped);
    state.current.typed = capped;
    if (capped.length >= passage.text.length) finish(nowT);
  }

  return (
    <div className="stack">
      <PageHead
        eyebrow={`Typing test · ${passage.level}`}
        title={<>{passage.title}</>}
        description={best != null ? `Your best so far: ${best} WPM` : 'Your first test sets the baseline.'}
        actions={
          <>
            <div className="seg" role="radiogroup" aria-label="Test length">
              {MODES.map((m) => <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} disabled={phase === 'running'} onClick={() => { setMode(m.id); reset(); }}>{m.label}</button>)}
            </div>
            <select aria-label="Passage" value={pid} disabled={phase === 'running'} onChange={(e) => reset(e.target.value)}>
              {PASSAGES.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.level})</option>)}
            </select>
          </>
        }
      />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      <div className="live-stats" aria-live="off">
        <div><span className="label-mono">Time</span><strong data-testid="time">{left != null ? `${Math.ceil(left)}s` : `${Math.round(elapsed / 1000)}s`}</strong></div>
        <div><span className="label-mono">WPM</span><strong>{live?.wpm ?? '—'}</strong></div>
        <div><span className="label-mono">Accuracy</span><strong>{live ? `${live.accuracy}%` : '—'}</strong></div>
        <div><span className="label-mono">Progress</span><strong>{Math.round((typed.length / passage.text.length) * 100)}%</strong></div>
      </div>
      <section className={`card type-card phase-${phase}`}>
        <PassageView text={passage.text} typed={typed} focus={phase !== 'done'} />
        {phase !== 'done' && (
          <>
            <label htmlFor="typing" className="label">{phase === 'ready' ? 'Start typing the passage above — the timer begins with your first key' : 'Keep going…'}</label>
            <textarea
              id="typing"
              ref={ref}
              className="type-input"
              rows={3}
              value={typed}
              onChange={(e) => onChange(e.target.value)}
              onPaste={(e) => { e.preventDefault(); setFlash({ kind: 'error', text: 'Pasting is disabled during a test.' }); }}
              onKeyDown={(e) => { if (e.key === 'Escape') reset(); }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="type-hint"
              autoFocus
            />
            <p id="type-hint" className="hint">Esc restarts. Backspace fixes mistakes but they still count against accuracy.</p>
          </>
        )}
        {phase === 'done' && result && (
          <div className="result" role="status">
            <div className="res-main">
              <div><span className="label-mono">Net speed</span><strong data-testid="wpm">{result.wpm}</strong><span>WPM</span></div>
              <div><span className="label-mono">Accuracy</span><strong data-testid="accuracy">{result.accuracy}%</strong></div>
            </div>
            <p className="muted">{result.rawWpm} raw WPM · {result.errors} uncorrected error{result.errors === 1 ? '' : 's'} · {result.correctChars} correct characters · {result.seconds}s{best != null && result.wpm > best ? ' · new personal best!' : ''}</p>
            {missedKeys(log).length > 0 && (
              <p className="small">Missed most: {missedKeys(log).map(([k, n]) => <kbd key={k} className="key">{visibleChar(k)}<sup>{n}</sup></kbd>)}</p>
            )}
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
              <button type="button" className="btn" onClick={() => reset(PASSAGES[(PASSAGES.indexOf(passage) + 1) % PASSAGES.length].id)}>Next passage</button>
              <a className="btn btn-ghost" href="#/history">History</a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function History({ history, setHistory }: { history: Session[]; setHistory: (h: Session[]) => void }) {
  const s = summary(history);
  const [tip, setTip] = useState<{ x: number; text: string } | null>(null);
  if (!s) return <EmptyState title="No tests yet" actions={<a className="btn btn-primary" href="#/test">Take your first test</a>}>Finished tests are saved here with speed and accuracy.</EmptyState>;
  const series = [...history].slice(0, 20).reverse();
  const max = Math.max(...series.map((h) => h.wpm), 10);
  const isDemo = history.some((h) => h.id.startsWith('demo'));
  return (
    <div className="stack">
      <PageHead eyebrow={<>History {isDemo && <DemoTag />}</>} title={<>Your <em>progress</em></>} description={`${s.sessions} test${s.sessions === 1 ? '' : 's'} saved`} actions={isDemo ? <button type="button" className="btn" onClick={() => setHistory(history.filter((h) => !h.id.startsWith('demo')))}>Remove demo tests</button> : <button type="button" className="btn btn-ghost" onClick={() => window.confirm('Delete all history?') && setHistory([])}>Clear history</button>} />
      <div className="stats">
        <div className="stat"><div className="stat-label">Personal best</div><div className="stat-value" data-testid="best">{s.best} WPM</div></div>
        <div className="stat"><div className="stat-label">Average (last 10)</div><div className="stat-value">{s.avg} WPM</div></div>
        <div className="stat"><div className="stat-label">Accuracy (last 10)</div><div className="stat-value">{s.acc}%</div></div>
      </div>
      <div className="grid-2">
        <section className="card">
          <h2>Speed over time</h2>
          <div className="wpm-chart" role="img" aria-label={`Net WPM for the last ${series.length} tests: ${series.map((h) => h.wpm).join(', ')}`} onMouseLeave={() => setTip(null)}>
            <div className="wc-y" aria-hidden="true"><span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span></div>
            <div className="wc-bars">
              {series.map((h, i) => (
                <span key={h.id} className="wc-col" onMouseEnter={(e) => setTip({ x: (e.currentTarget as HTMLElement).offsetLeft + 8, text: `${new Date(h.at).toLocaleDateString()} · ${h.wpm} WPM · ${h.accuracy}%` })}>
                  <span className={`wc-bar grow-in ${h.wpm === s.best ? 'best' : ''}`} style={{ height: `${(h.wpm / max) * 100}%`, ['--i' as string]: i }} />
                </span>
              ))}
              {tip && <span className="chart-tip" style={{ left: tip.x, top: 0 }}>{tip.text}</span>}
            </div>
          </div>
          <p className="hint">Net WPM per test, oldest to newest. Your best is highlighted.</p>
        </section>
        <section className="card">
          <h2>Keys to practise</h2>
          {s.keys.length === 0 ? <p className="muted">No repeated mistakes — nice.</p> : (
            <div className="keys">{s.keys.map(([k, n]) => <kbd key={k} className="key big">{visibleChar(k)}<sup>{n}</sup></kbd>)}</div>
          )}
          <p className="hint">Most-missed characters in your last 20 tests.</p>
        </section>
      </div>
      <section className="card">
        <h2>All tests</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Passage</th><th>Length</th><th className="num">WPM</th><th className="num">Raw</th><th className="num">Accuracy</th><th className="num">Errors</th></tr></thead>
            <tbody>
              {history.slice(0, 50).map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} {h.id.startsWith('demo') && <DemoTag />}</td>
                  <td>{PASSAGES.find((p) => p.id === h.passageId)?.title ?? '—'}</td>
                  <td>{MODES.find((m) => m.id === h.mode)?.label}</td>
                  <td className="num"><strong>{h.wpm}</strong></td>
                  <td className="num">{h.rawWpm}</td>
                  <td className="num">{h.accuracy}%</td>
                  <td className="num">{h.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
