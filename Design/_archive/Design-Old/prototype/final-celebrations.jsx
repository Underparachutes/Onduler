/* Per-theme celebrations:
   - Tjörnuvík → Ripple (checkbox spring + expanding ring)
   - Biarritz → Tide line (2px line drawn across bottom of row)
   Shown in light + dark for each theme. Tap any row to log it. */

const { useEffect, useState, useRef } = React;

/* -------------- helpers -------------- */
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
function easeOutBack(p) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

/* useAnim — runs from 0..1 over `duration` ms once, then settles. Reset
   it by changing the `key` argument's identity. Returns t (0..1) and
   done (boolean once finished). */
function useAnim(duration, runKey) {
  const [t, setT] = useState(runKey == null ? null : 0);
  useEffect(() => {
    if (runKey == null) { setT(null); return; }
    let raf, start = performance.now();
    function frame(now) {
      const e = Math.min(1, (now - start) / duration);
      setT(e);
      if (e < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [runKey, duration]);
  return t;
}

/* -------------- shared row primitives -------------- */
function CheckBox({ filled, swell, scale = 1, ringP = null }) {
  return (
    <span style={{
      position: 'relative',
      width: 20, height: 20, borderRadius: 5,
      border: `1.5px solid ${filled ? swell : 'var(--border)'}`,
      background: filled ? swell : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      transform: `scale(${scale})`,
      transition: scale === 1 ? 'transform 200ms ease' : 'none',
    }}>
      {filled && (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 6 L5 9 L10 3"
            fill="none" stroke="#fff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {ringP != null && ringP < 1 && (
        <span aria-hidden style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: 20 + ringP * 84,
          height: 20 + ringP * 84,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: `1.5px solid ${swell}`,
          opacity: (1 - ringP) * 0.55,
          pointerEvents: 'none',
        }} />
      )}
    </span>
  );
}

function MotionRow({ row, onTap, dim = false }) {
  return (
    <div
      onClick={onTap}
      style={{
        padding: '0 18px', height: 52,
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', userSelect: 'none',
        opacity: dim ? 0.45 : 1,
      }}>
      <CheckBox filled={dim} swell={row.swell} />
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: row.swell,
        flexShrink: 0, opacity: 0.85,
      }} />
      <span style={{
        fontSize: 14.5, color: 'var(--text)',
        flex: 1, letterSpacing: '-0.005em',
        textDecoration: dim ? 'line-through' : 'none',
        textDecorationColor: 'var(--text-faint)',
      }}>{row.name}</span>
      <span style={{
        fontSize: 12, color: 'var(--text-faint)',
        fontVariantNumeric: 'tabular-nums',
      }}>{row.pts}pt</span>
    </div>
  );
}

/* -------------- celebration: Ripple (Tjörnuvík) -------------- */
function RippleRow({ row, runKey, onDone }) {
  const DURATION = 900;
  const t = useAnim(DURATION, runKey);
  const doneFiredRef = useRef(false);
  useEffect(() => {
    if (t != null && t >= 1 && !doneFiredRef.current) {
      doneFiredRef.current = true;
      onDone();
    }
  }, [t, onDone]);
  // Phases
  // 0..0.10  checkbox fill in
  // 0..0.18  spring scale (1 → 1.18 → 1)
  // 0.05..0.50 ring expands + fades
  // 0.25..0.50 text dims
  // 0.55..1.00 row collapses
  const v = t == null ? 0 : t;
  const fillP = easeOutCubic(clamp01(v / 0.10));
  let scale = 1;
  if (v < 0.09) scale = 1 + (v / 0.09) * 0.18;
  else if (v < 0.18) scale = 1.18 - ((v - 0.09) / 0.09) * 0.18;
  const ringP = clamp01((v - 0.05) / 0.45);
  const ringActive = v > 0.05 && v < 0.50;
  const textP = easeOutCubic(clamp01((v - 0.25) / 0.25));
  const collapseP = easeOutCubic(clamp01((v - 0.55) / 0.45));
  const rowH = 52 * (1 - collapseP);

  return (
    <div style={{
      position: 'relative',
      height: rowH, overflow: 'hidden',
      borderBottom: rowH > 1 ? '1px solid var(--border-soft)' : 'none',
    }}>
      <div style={{
        padding: '0 18px', height: 52,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <CheckBox
          filled={fillP > 0.5}
          swell={row.swell}
          scale={scale}
          ringP={ringActive ? ringP : null}
        />
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: row.swell,
          flexShrink: 0, opacity: 0.85,
        }} />
        <span style={{
          fontSize: 14.5, color: 'var(--text)',
          flex: 1, letterSpacing: '-0.005em',
          opacity: 1 - textP * 0.55,
          textDecoration: textP > 0.5 ? 'line-through' : 'none',
          textDecorationColor: 'var(--text-faint)',
        }}>{row.name}</span>
        <span style={{
          fontSize: 12, color: 'var(--text-faint)',
          fontVariantNumeric: 'tabular-nums',
          opacity: 1 - textP * 0.55,
        }}>{row.pts}pt</span>
      </div>
    </div>
  );
}

/* -------------- celebration: Tide line (Biarritz) -------------- */
function TideLineRow({ row, runKey, onDone }) {
  const DURATION = 950;
  const t = useAnim(DURATION, runKey);
  const doneFiredRef = useRef(false);
  useEffect(() => {
    if (t != null && t >= 1 && !doneFiredRef.current) {
      doneFiredRef.current = true;
      onDone();
    }
  }, [t, onDone]);
  // Phases
  // 0..0.08   checkbox fill
  // 0..0.55   line draws across (slightly eased)
  // 0.25..0.55 text dims behind line
  // 0.55..1.00 collapse + line fades
  const v = t == null ? 0 : t;
  const fillP = easeOutCubic(clamp01(v / 0.08));
  const lineP = easeOutCubic(clamp01(v / 0.55));
  const textP = easeOutCubic(clamp01((v - 0.25) / 0.30));
  const collapseP = easeOutCubic(clamp01((v - 0.55) / 0.45));
  const lineFade = v > 0.55 ? Math.max(0, 1 - (v - 0.55) / 0.30) : 1;
  const rowH = 52 * (1 - collapseP);

  return (
    <div style={{
      position: 'relative',
      height: rowH, overflow: 'hidden',
      borderBottom: rowH > 1 ? '1px solid var(--border-soft)' : 'none',
    }}>
      <div style={{
        padding: '0 18px', height: 52,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <CheckBox filled={fillP > 0.5} swell={row.swell} />
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: row.swell,
          flexShrink: 0, opacity: 0.85,
        }} />
        <span style={{
          fontSize: 14.5, color: 'var(--text)',
          flex: 1, letterSpacing: '-0.005em',
          opacity: 1 - textP * 0.55,
          textDecoration: textP > 0.5 ? 'line-through' : 'none',
          textDecorationColor: 'var(--text-faint)',
        }}>{row.name}</span>
        <span style={{
          fontSize: 12, color: 'var(--text-faint)',
          fontVariantNumeric: 'tabular-nums',
          opacity: 1 - textP * 0.55,
        }}>{row.pts}pt</span>
      </div>
      {/* tide line — across the row's bottom edge */}
      {v > 0 && (
        <div aria-hidden style={{
          position: 'absolute', left: 0, bottom: 0,
          height: 2,
          width: `${lineP * 100}%`,
          background: row.swell,
          opacity: lineFade,
        }} />
      )}
    </div>
  );
}

/* -------------- Dashboard mock -------------- */
const SEED = [
  { id: 'm1', name: 'Read 20 min',  pts: 1, swell: 'var(--swell-7)' },
  { id: 'm2', name: 'Walk 30 min',  pts: 2, swell: 'var(--swell-5)' },
  { id: 'm3', name: 'Cook dinner',  pts: 2, swell: 'var(--swell-3)' },
  { id: 'm4', name: 'Journal',      pts: 1, swell: 'var(--swell-2)' },
  { id: 'm5', name: 'Stretch',      pts: 1, swell: 'var(--swell-8)' },
];

function MiniDashboard({ kind, replayKey }) {
  const Celeb = kind === 'ripple' ? RippleRow : TideLineRow;
  const [doneIds, setDoneIds] = useState([]);
  const [celebratingId, setCelebratingId] = useState(null);
  const [runKey, setRunKey] = useState(0);
  // listen for replayKey changes to fire on the demo row
  useEffect(() => {
    if (replayKey > 0) {
      setDoneIds(prev => prev.filter(id => id !== 'm3'));
      setCelebratingId('m3');
      setRunKey(k => k + 1);
    }
  }, [replayKey]);

  function tap(motion) {
    if (celebratingId || doneIds.includes(motion.id)) return;
    setCelebratingId(motion.id);
    setRunKey(k => k + 1);
  }
  function onDone() {
    setDoneIds(d => [...d, celebratingId]);
    setCelebratingId(null);
  }

  const earned = SEED.filter(m => doneIds.includes(m.id)).reduce((s, m) => s + m.pts, 0);
  const total = SEED.reduce((s, m) => s + m.pts, 0);
  const pct = Math.round((earned / total) * 100);

  return (
    <div style={{
      width: '100%',
      background: 'var(--bg)',
      color: 'var(--text)',
      borderRadius: 14,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{
          fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--text-muted)', fontWeight: 600,
          fontFamily: 'Manrope, sans-serif',
        }}>Tuesday · May 26</div>
        <h2 style={{
          margin: '4px 0 0', fontSize: 22, fontWeight: 600, letterSpacing: '0.01em',
          fontFamily: 'Manrope, sans-serif', color: 'var(--text)',
        }}>Motions</h2>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, height: 3, background: 'var(--border)', borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--accent)',
              width: pct + '%',
              transition: 'width 600ms cubic-bezier(0.22, 0.61, 0.36, 1)',
            }} />
          </div>
          <span style={{
            fontSize: 11, color: 'var(--text-faint)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Manrope, sans-serif',
          }}>{earned}/{total} pts</span>
        </div>
      </div>

      {/* List */}
      <div>
        {SEED.map(m => {
          const isCele = celebratingId === m.id;
          const isDone = doneIds.includes(m.id);
          if (isCele) return <Celeb key={m.id} row={m} runKey={runKey} onDone={onDone} />;
          if (isDone) return null; // washed away (hide-done default)
          return <MotionRow key={m.id} row={m} onTap={() => tap(m)} />;
        })}
        {/* If everything's done, soft empty state */}
        {SEED.every(m => doneIds.includes(m.id)) && (
          <div style={{
            padding: '36px 18px 24px', textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'Manrope, sans-serif',
            fontSize: 15, fontStyle: 'italic', letterSpacing: '0.02em',
          }}>The water's still here.</div>
        )}
      </div>
    </div>
  );
}

/* -------------- theme wrapper + replay -------------- */
function ThemedCard({ themeKey, mode, kind, themeLabel }) {
  const [replayKey, setReplayKey] = useState(0);
  return (
    <div className="col">
      <div className="col-head">
        <div>
          <div className="name">{themeLabel} · {mode}</div>
          <div className="desc">
            {kind === 'ripple' ? 'Spring + expanding ring' : '2px swell-color line sweeps across bottom'}
          </div>
        </div>
        <div className="pill">{kind === 'ripple' ? 'Ripple' : 'Tide line'}</div>
      </div>
      <div data-theme={themeKey} data-mode={mode}>
        <MiniDashboard kind={kind} replayKey={replayKey} />
      </div>
      <div className="replay-bar">
        <button onClick={() => setReplayKey(k => k + 1)}>▶ Replay on Cook dinner</button>
        <span className="hint">or tap any row</span>
      </div>
    </div>
  );
}

/* -------------- App -------------- */
function App() {
  return (
    <div className="grid">
      <ThemedCard themeKey="default" mode="light" kind="ripple"    themeLabel="Tjörnuvík" />
      <ThemedCard themeKey="biarritz" mode="light" kind="tideline" themeLabel="Biarritz" />
      <ThemedCard themeKey="default" mode="dark"  kind="ripple"    themeLabel="Tjörnuvík" />
      <ThemedCard themeKey="biarritz" mode="dark"  kind="tideline" themeLabel="Biarritz" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
