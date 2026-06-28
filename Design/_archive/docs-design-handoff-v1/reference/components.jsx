/* global React */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ==================================================================
   Onduler — primitives
   Every component reads its colors from CSS variables on the closest
   .themed ancestor, so dropping it into any data-theme/data-mode
   wrapper themes it correctly. Numerals are tabular.
   ================================================================== */

/* ----- Themed island wrapper --------------------------------- */
function Themed({ theme = 'default', mode = 'light', className = '', style, children, padded = true, label, sublabel }) {
  return (
    <div
      data-theme={theme}
      data-mode={mode}
      className={`themed ${className}`}
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        borderRadius: 14,
        border: '1px solid var(--border-soft)',
        position: 'relative',
        overflow: 'hidden',
        ...(padded ? { padding: 0 } : {}),
        ...style,
      }}
    >
      {(label || sublabel) && (
        <div style={{
          position: 'absolute', top: 10, right: 12,
          fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--text-faint)', zIndex: 2,
        }}>
          {label}{sublabel ? <span style={{ opacity: 0.7 }}> · {sublabel}</span> : null}
        </div>
      )}
      {children}
    </div>
  );
}

/* ----- Tide bar --------------------------------------------------
   3px tall, low-saturation track, fills with the Swell's color.
   Crossing 100% does NOT trigger celebration here (that's a higher
   surface) — at the primitive level we just render.                 */
function TideBar({ value = 0, target = 100, color = 'var(--accent)', track = 'var(--border)', height = 3, animate = true, style }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div style={{ position: 'relative', height, borderRadius: height, background: track, overflow: 'hidden', ...style }}>
      <div
        style={{
          position: 'absolute', inset: 0, width: `${pct * 100}%`,
          background: color, borderRadius: height,
          transition: animate ? 'width 800ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
        }}
      />
    </div>
  );
}

/* ----- Paper-list motion row ------------------------------------
   No card chrome, no badges by default. Tap to log; checked state
   shows a soft, generous tick + dimmed name. The whole row is the
   target — 56px tall comfortably exceeds the 44px floor.            */
function MotionRow({ name, value = 1, unit = 'pt', checked = false, onToggle, color, dense = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        appearance: 'none', WebkitAppearance: 'none', border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'center', width: '100%',
        padding: dense ? '11px 16px' : '14px 18px',
        gap: 14, cursor: 'pointer', textAlign: 'left',
        color: 'inherit', fontFamily: 'inherit',
        transition: 'background 120ms ease, transform 80ms ease',
        position: 'relative',
      }}
      onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.985)'}
      onPointerUp={(e) => e.currentTarget.style.transform = ''}
      onPointerLeave={(e) => e.currentTarget.style.transform = ''}
    >
      {/* Hairline rule between rows */}
      <span style={{
        position: 'absolute', left: 18, right: 18, bottom: 0, height: 1,
        background: 'var(--border-soft)',
      }} />
      <Checkbox checked={checked} color={color} />
      <span style={{
        flex: 1, fontSize: 17, fontWeight: 500,
        color: checked ? 'var(--text-muted)' : 'var(--text)',
        textDecoration: checked ? 'line-through' : 'none',
        textDecorationColor: 'var(--text-faint)',
        transition: 'color 200ms ease',
      }}>{name}</span>
      <span className="tnum" style={{
        fontSize: 13, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums',
      }}>{value} {unit}</span>
    </button>
  );
}

function Checkbox({ checked, color }) {
  return (
    <span
      style={{
        width: 22, height: 22, borderRadius: 7,
        border: `1.5px solid ${checked ? (color || 'var(--accent)') : 'var(--border)'}`,
        background: checked ? (color || 'var(--accent)') : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 200ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        flexShrink: 0,
      }}
    >
      {checked && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" stroke="white" style={{ animation: 'check-in 240ms cubic-bezier(0.22, 0.61, 0.36, 1) both' }}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
}

/* ----- Daily progress bar ----------------------------------------
   Slim, soft, sits at the top of the Motions surface. 4px high.
   No numeric chrome by default — the bar is the chrome.             */
function DailyProgress({ value, target, label = "Today", showNumbers = true }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div style={{ padding: '14px 18px 12px' }}>
      {showNumbers && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 8,
        }}>
          <span className="serif" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{label}</span>
          <span className="tnum" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{value}</span>
            <span style={{ opacity: 0.6 }}> / {target}</span>
          </span>
        </div>
      )}
      <TideBar value={value} target={target} color="var(--accent)" track="var(--border-soft)" height={4} />
    </div>
  );
}

/* ----- Swell row --------------------------------------------------
   Name, color dot, weekly tide bar, small lifetime stat line.       */
function SwellRow({ name, color, value, target, lifetimePts, weeksRunning, unit = 'pts' }) {
  return (
    <div style={{
      padding: '14px 18px', borderBottom: '1px solid var(--border-soft)',
      cursor: 'pointer', display: 'block',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span className="serif" style={{ fontSize: 18, flex: 1, color: 'var(--text)' }}>{name}</span>
        <span className="tnum" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
          <span style={{ opacity: 0.6 }}> / {target} {unit}/wk</span>
        </span>
      </div>
      <TideBar value={value} target={target} color={color} height={3} />
      <div className="tnum" style={{
        marginTop: 6, fontSize: 11, color: 'var(--text-faint)',
        display: 'flex', gap: 12, fontVariantNumeric: 'tabular-nums',
      }}>
        <span>{lifetimePts} {unit} lifetime</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>{weeksRunning} weeks running</span>
      </div>
    </div>
  );
}

/* ----- Constellation ---------------------------------------------
   Per-Swell layout. Central node = weekly value / target. Surrounding
   Motion nodes sized by points earned, opacity by recency.           */
function Constellation({ swellName, swellColor, value, target, unit = 'pts', motions = [], size = 280 }) {
  const cx = size / 2, cy = size / 2;
  const centerR = 44;
  const orbitR = size / 2 - 56;
  // Bigger motions sit at slightly varied orbits.
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: 'block', maxWidth: size, margin: '0 auto', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`cglow-${swellName.replace(/\W/g, '')}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={swellColor} stopOpacity="0.25" />
          <stop offset="55%" stopColor={swellColor} stopOpacity="0.08" />
          <stop offset="100%" stopColor={swellColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Soft halo */}
      <circle cx={cx} cy={cy} r={orbitR + 12} fill={`url(#cglow-${swellName.replace(/\W/g, '')})`} />
      {/* Faint orbit ring */}
      <circle cx={cx} cy={cy} r={orbitR} fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
      {/* Motion nodes */}
      {motions.map((m, i) => {
        const angle = (i / motions.length) * Math.PI * 2 - Math.PI / 2;
        const r = orbitR + (i % 2 === 0 ? 0 : -10);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const nodeR = 14 + m.weight * 12;
        const op = m.recency === 'week' ? 1 : m.recency === 'month' ? 0.78 : m.recency === 'lifetime' ? 0.58 : 0.35;
        // Label position
        const labelDist = nodeR + 10;
        const lx = cx + Math.cos(angle) * (r + labelDist);
        const ly = cy + Math.sin(angle) * (r + labelDist);
        const anchor = Math.cos(angle) > 0.2 ? 'start' : Math.cos(angle) < -0.2 ? 'end' : 'middle';
        return (
          <g key={i} style={{ opacity: op }}>
            <circle cx={x} cy={y} r={nodeR} fill={swellColor} fillOpacity="0.18" stroke={swellColor} strokeWidth="1.25" />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="var(--text)" style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }}>
              {m.value}
            </text>
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="central" fontSize="10" fill="var(--text-secondary)" style={{ fontFamily: 'var(--font-body)' }}>
              {m.name}
            </text>
          </g>
        );
      })}
      {/* Center node */}
      <circle cx={cx} cy={cy} r={centerR} fill="var(--surface)" stroke={swellColor} strokeWidth="1.5" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="500" fill="var(--text)" style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="var(--text-muted)" style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }}>
        / {target} {unit}/wk
      </text>
    </svg>
  );
}

/* ----- Reflections Radar -----------------------------------------
   N-gon of pie-slice wedges (one per Swell), each in its Swell color
   at low opacity. Filled slice scales radially with this week's
   actual. Wedge target vertices are drag-handleable.                 */
function ReflectionsRadar({
  swells = [], actuals = [], waveWash = false, draggable = true, size = 300,
  onChange,
}) {
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 38;
  const N = swells.length;
  const [targets, setTargets] = useState(() => swells.map(s => s.target));
  const [drag, setDrag] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => { setTargets(swells.map(s => s.target)); }, [swells]);

  const maxTarget = Math.max(...targets, ...actuals, 1) * 1.15;
  const axisAngle = i => (i / N) * Math.PI * 2 - Math.PI / 2;

  const vertex = (i, value) => {
    const a = axisAngle(i);
    const r = (Math.min(value, maxTarget) / maxTarget) * R;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  // Wedge boundary along bisector — uses chord-bisector intersection between
  // adjacent target vertices so neighbors don't visually empty each other.
  const wedgeBoundary = (i) => {
    const a = axisAngle(i) + Math.PI / N;
    const Ra = (Math.min(targets[i], maxTarget) / maxTarget) * R;
    const Rb = (Math.min(targets[(i + 1) % N], maxTarget) / maxTarget) * R;
    const r = (2 * Ra * Rb * Math.cos(Math.PI / N)) / (Ra + Rb || 1);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  const wedgePath = (i) => {
    const va = vertex(i, targets[i]);
    const vb = vertex((i + 1) % N, targets[(i + 1) % N]);
    const b1 = wedgeBoundary((i - 1 + N) % N);
    const b2 = wedgeBoundary(i);
    return `M ${cx} ${cy} L ${b1.x} ${b1.y} L ${va.x} ${va.y} L ${b2.x} ${b2.y} Z`;
  };

  const slicePath = (i) => {
    if (!actuals[i]) return null;
    const a = axisAngle(i);
    const targetR = (Math.min(targets[i], maxTarget) / maxTarget) * R;
    const actualR = (Math.min(actuals[i], maxTarget) / maxTarget) * R;
    // Slice never extends past the wedge — cap the spike at the target.
    const fillR = Math.min(actualR, targetR);
    if (fillR < 4) return null;
    // Wedge edges are the bisector radials to neighboring axes. The slice
    // chord ends must NEVER extend past the wedge boundary, or the slice
    // visually bleeds into the neighbor's territory at the chord intersection.
    const leftBoundary  = wedgeBoundary((i - 1 + N) % N);
    const rightBoundary = wedgeBoundary(i);
    const leftBoundaryR  = Math.hypot(leftBoundary.x  - cx, leftBoundary.y  - cy);
    const rightBoundaryR = Math.hypot(rightBoundary.x - cx, rightBoundary.y - cy);
    const halfAngle = Math.PI / N;
    const leftChordR  = Math.min(fillR, leftBoundaryR);
    const rightChordR = Math.min(fillR, rightBoundaryR);
    const va = { x: cx + Math.cos(a) * fillR, y: cy + Math.sin(a) * fillR };
    const b1x = cx + Math.cos(a - halfAngle) * leftChordR;
    const b1y = cy + Math.sin(a - halfAngle) * leftChordR;
    const b2x = cx + Math.cos(a + halfAngle) * rightChordR;
    const b2y = cy + Math.sin(a + halfAngle) * rightChordR;
    return `M ${cx} ${cy} L ${b1x} ${b1y} L ${va.x} ${va.y} L ${b2x} ${b2y} Z`;
  };

  const ptToSvg = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const local = pt.matrixTransform(svg.getScreenCTM().inverse());
    return local;
  };

  const projectOnAxis = (p, i) => {
    const a = axisAngle(i);
    const dx = p.x - cx, dy = p.y - cy;
    return Math.max(0, Math.min(R, dx * Math.cos(a) + dy * Math.sin(a)));
  };

  function startDrag(e, i) {
    if (!draggable) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ i, value: targets[i] });
  }
  function moveDrag(e) {
    if (!drag) return;
    const p = ptToSvg(e);
    const px = projectOnAxis(p, drag.i);
    const value = Math.round((px / R) * maxTarget);
    setDrag({ ...drag, value });
    setTargets(prev => { const out = prev.slice(); out[drag.i] = value; return out; });
  }
  function endDrag(e) {
    if (!drag) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (onChange) onChange(drag.i, drag.value);
    setDrag(null);
  }

  return (
    <div style={{ position: 'relative' }}>
      {waveWash && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, background: 'var(--wave-wash)',
          borderRadius: 12, pointerEvents: 'none', animation: 'wash-fade-in 700ms ease-out',
        }} />
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        style={{ display: 'block', maxWidth: size, margin: '0 auto', touchAction: drag ? 'none' : 'auto', overflow: 'visible' }}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Faint full polygon target outline at the chart edge */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
        {/* Wedges */}
        {swells.map((s, i) => (
          <path key={`w-${i}`} d={wedgePath(i)} fill={s.color} fillOpacity="0.32" />
        ))}
        {/* Bisector radials between wedges */}
        {swells.map((_, i) => {
          const b = wedgeBoundary(i);
          return <line key={`r-${i}`} x1={cx} y1={cy} x2={b.x} y2={b.y} stroke="var(--text)" strokeWidth="0.4" opacity="0.22" />;
        })}
        {/* Slices */}
        {swells.map((s, i) => {
          const d = slicePath(i);
          if (!d) return null;
          return <path key={`s-${i}`} d={d} fill={s.color} fillOpacity="0.68" />;
        })}
        {/* Axis labels */}
        {swells.map((s, i) => {
          const a = axisAngle(i);
          const r = R + 18;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          const anchor = Math.cos(a) > 0.2 ? 'start' : Math.cos(a) < -0.2 ? 'end' : 'middle';
          return (
            <text key={`l-${i}`} x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize="10.5" fill="var(--text-muted)" style={{ fontFamily: 'var(--font-body)' }}>
              {s.name}
            </text>
          );
        })}
        {/* Handles */}
        {swells.map((s, i) => {
          const v = vertex(i, targets[i]);
          const active = drag?.i === i;
          return (
            <circle
              key={`h-${i}`}
              cx={v.x} cy={v.y}
              r={active ? 8 : 5}
              fill={active ? s.color : 'var(--bg)'}
              stroke={s.color} strokeWidth="1.75"
              style={{ cursor: draggable ? 'grab' : 'default', touchAction: 'none' }}
              onPointerDown={(e) => startDrag(e, i)}
            />
          );
        })}
      </svg>
      {drag && (
        <div style={{
          position: 'absolute', bottom: 4, left: 4,
          padding: '4px 10px', borderRadius: 999,
          background: swells[drag.i].color, color: 'white',
          fontSize: 11, fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
        }}>
          {swells[drag.i].name} · {drag.value} pts/wk
        </div>
      )}
    </div>
  );
}

/* ----- Bottom nav ------------------------------------------------ */
const NavIcons = {
  motions: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" />
      <path d="M8 12.5l3 3 5-6" stroke="currentColor" />
    </svg>
  ),
  swells: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* compass — yin-yang needle: north filled, south hollow */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" />
      <path d="M12 5 L14.2 11.6 L9.8 11.6 Z" fill="currentColor" stroke="currentColor" />
      <path d="M12 19 L14.2 12.4 L9.8 12.4 Z" fill="none" stroke="currentColor" />
    </svg>
  ),
  reflections: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* anchor — your swells anchor you */}
      <circle cx="12" cy="4.5" r="1.9" stroke="currentColor" />
      <path d="M12 6.4 V 20" stroke="currentColor" />
      <path d="M8.6 10.5 H 15.4" stroke="currentColor" />
      <path d="M4.6 13.5 C 4.6 17.6, 8.2 20, 12 20 C 15.8 20, 19.4 17.6, 19.4 13.5" stroke="currentColor" />
      <path d="M4.6 13.5 L 6.6 14.7 M 4.6 13.5 L 4.6 15.7" stroke="currentColor" />
      <path d="M19.4 13.5 L 17.4 14.7 M 19.4 13.5 L 19.4 15.7" stroke="currentColor" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* sliders — two rails, two knobs at different positions */}
      <path d="M3 8h9 M17 8h4" stroke="currentColor" />
      <circle cx="14.5" cy="8" r="2.25" fill="var(--bg, white)" stroke="currentColor" />
      <path d="M3 16h4 M12 16h9" stroke="currentColor" />
      <circle cx="9.5" cy="16" r="2.25" fill="var(--bg, white)" stroke="currentColor" />
    </svg>
  ),
};

function BottomNav({ active = 'motions', pending = false }) {
  const items = [
    { key: 'motions', label: 'Motions', icon: NavIcons.motions },
    { key: 'swells', label: 'Swells', icon: NavIcons.swells },
    { key: 'reflections', label: 'Reflections', icon: NavIcons.reflections },
    { key: 'settings', label: 'Settings', icon: NavIcons.settings },
  ];
  return (
    <div style={{
      borderTop: '1px solid var(--border-soft)',
      background: 'var(--bg)',
      display: 'flex', justifyContent: 'space-around',
      padding: '8px 8px 10px',
    }}>
      {items.map(item => {
        const isActive = item.key === active;
        const isReflections = item.key === 'reflections';
        const dim = pending && !isReflections && !isActive;
        return (
          <button
            key={item.key}
            type="button"
            style={{
              appearance: 'none', border: 'none', background: 'transparent',
              padding: '8px 16px', borderRadius: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: isActive ? 'var(--text)' : 'var(--text-faint)',
              opacity: dim ? 0.5 : 1,
              cursor: 'pointer',
              transition: 'transform 120ms ease, background 120ms ease',
              fontFamily: 'inherit',
            }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
            onPointerUp={e => e.currentTarget.style.transform = ''}
            onPointerLeave={e => e.currentTarget.style.transform = ''}
          >
            <span style={{
              position: 'relative',
              animation: pending && isReflections ? 'nav-tide-pulse 2.4s ease-in-out infinite' : undefined,
            }}>
              {item.icon}
              {pending && isReflections && !isActive && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--text)',
                }} />
              )}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '-0.005em' }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----- Celebration moment ---------------------------------------
   Wave swells outward, foam blooms, settles. 2–3 seconds.           */
function Celebration({ playing, color = 'var(--accent)' }) {
  if (!playing) return null;
  const droplets = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
    const r = 60 + Math.random() * 70;
    return { dx: `${Math.cos(a) * r}px`, dy: `${Math.sin(a) * r}px`, delay: i * 30 };
  });
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, overflow: 'hidden',
    }}>
      {/* Main wave */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: 80, height: 80,
        borderRadius: '50%', background: color,
        animation: 'celebration-wave 1800ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }} />
      {/* Foam bloom */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: 80, height: 80,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.8), rgba(255,255,255,0) 70%)',
        animation: 'celebration-foam 1100ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        animationDelay: '120ms',
      }} />
      {/* Droplets */}
      {droplets.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 7, height: 7, borderRadius: '50%', background: color,
          opacity: 0.65,
          animation: `celebration-droplet 1200ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
          animationDelay: `${d.delay + 200}ms`,
          '--dx': d.dx,
          '--dy': d.dy,
        }} />
      ))}
    </div>
  );
}

/* ----- Canvas wave field --------------------------------------
   Stacked sine waves drawn back-to-front. Each wave's fill is the
   ancestor --bg, so it masks the waves above it at every crossing
   — the way layered water surfaces should read. Strokes the wave
   line in --text at a low opacity that the brief calls for.       */
function WaveField({ height = 360, lines, themeKey, mode }) {
  const canvasRef = useRef(null);
  // Resolve theme tokens once per render — the canvas needs concrete
  // colors, not CSS variables.
  const resolve = (varName) => {
    if (typeof window === 'undefined') return '#000';
    const el = canvasRef.current?.parentElement;
    if (!el) return '#000';
    return getComputedStyle(el).getPropertyValue(varName).trim() || '#000';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let raf = 0;
    let t = 0;

    function fit() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    function frame() {
      const rect = canvas.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      const bg = resolve('--bg');
      const ink = resolve('--text');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      t += 1;
      for (let i = 0; i < lines.length; i++) {
        const wv = lines[i];
        ctx.beginPath();
        for (let x = 0; x <= W; x++) {
          const angle = x * wv.frequency + t * wv.speed + wv.phase;
          // gentle second harmonic so peaks don't all line up identically
          const y2 = Math.sin(angle * 2 + 1.3) * wv.amplitude * 0.18;
          const y = H * wv.yBase + Math.sin(angle) * wv.amplitude + y2;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        // close to bottom corners so the fill masks waves drawn earlier
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = bg;
        ctx.fill();
        // stroke the wave line in ink at the configured opacity / weight
        ctx.beginPath();
        for (let x = 0; x <= W; x++) {
          const angle = x * wv.frequency + t * wv.speed + wv.phase;
          const y2 = Math.sin(angle * 2 + 1.3) * wv.amplitude * 0.18;
          const y = H * wv.yBase + Math.sin(angle) * wv.amplitude + y2;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = wv.width;
        ctx.globalAlpha = wv.opacity;
        ctx.strokeStyle = ink;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [lines, themeKey, mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        display: 'block', pointerEvents: 'none',
      }}
    />
  );
}

/* ----- Locked Reflections ---------------------------------------
   Canvas wave-field background + blurred irregular radar silhouette.  */
function LockedPage({ cadence = 'weekly', copy = "Glimpses of where you've been. Come back as you log." }) {
  const N = 7;
  const radii = [0.92, 0.62, 0.78, 0.55, 0.88, 0.7, 0.5];
  const baseR = 70;
  const cx = 90, cy = 90;
  const verts = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = baseR * radii[i];
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  const polygonPts = verts.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');

  // Wave field — back to front, each masks behind it. yBase rises down
  // the screen so the lower waves visually sit "in front" of the upper.
  const waveLines = [
    { yBase: 0.18, amplitude: 6,  frequency: 0.026, speed: 0.0030, phase: 0.2, width: 0.9, opacity: 0.10 },
    { yBase: 0.28, amplitude: 9,  frequency: 0.022, speed: 0.0040, phase: 1.6, width: 1.0, opacity: 0.13 },
    { yBase: 0.38, amplitude: 7,  frequency: 0.028, speed: 0.0025, phase: 0.8, width: 1.1, opacity: 0.16 },
    { yBase: 0.50, amplitude: 14, frequency: 0.018, speed: 0.0050, phase: 2.4, width: 1.4, opacity: 0.20 },
    { yBase: 0.62, amplitude: 9,  frequency: 0.024, speed: 0.0035, phase: 1.1, width: 1.5, opacity: 0.24 },
    { yBase: 0.74, amplitude: 16, frequency: 0.020, speed: 0.0045, phase: 3.0, width: 1.8, opacity: 0.30 },
    { yBase: 0.86, amplitude: 12, frequency: 0.022, speed: 0.0030, phase: 0.5, width: 2.0, opacity: 0.38 },
    { yBase: 0.98, amplitude: 20, frequency: 0.018, speed: 0.0040, phase: 2.0, width: 2.6, opacity: 0.46 },
  ];

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      padding: '36px 24px 56px',
      minHeight: 420, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    }}>
      <WaveField lines={waveLines} />
      {/* Blurred irregular radar silhouette */}
      <div style={{ position: 'relative', marginBottom: 22, width: 180, height: 180, zIndex: 1 }}>
        <svg viewBox="0 0 180 180" width="180" height="180" style={{ filter: 'blur(7px)', opacity: 0.7, position: 'absolute', inset: 0 }}>
          <polygon points={polygonPts} fill="var(--accent)" fillOpacity="0.22" stroke="var(--accent)" strokeOpacity="0.5" strokeWidth="1.5" />
        </svg>
        <svg viewBox="0 0 180 180" width="180" height="180" style={{ position: 'absolute', inset: 0, animation: 'slow-breathe 4s ease-in-out infinite' }}>
          <polygon points={polygonPts} fill="none" stroke="var(--text-faint)" strokeWidth="0.6" opacity="0.55" />
          {verts.map((v, i) => (
            <line key={i} x1={cx} y1={cy} x2={v.x} y2={v.y} stroke="var(--text-faint)" strokeWidth="0.4" opacity="0.35" />
          ))}
        </svg>
      </div>
      <p className="serif" style={{
        position: 'relative', zIndex: 1,
        fontSize: 20, lineHeight: 1.55, margin: 0,
        color: 'var(--text-secondary)', maxWidth: 280, textWrap: 'pretty',
        letterSpacing: '0.04em',
      }}>
        {copy}
      </p>
      <p style={{
        position: 'relative', zIndex: 1,
        fontSize: 12, marginTop: 14, color: 'var(--text-faint)',
        letterSpacing: '0.04em', textTransform: 'lowercase',
      }}>
        {cadence}
      </p>
    </div>
  );
}

/* ----- Cycle-close ceremony --------------------------------------
   Three steps: expectation → reveal → observation → CTAs.            */
function CycleCeremony({ step = 0, onAdvance, onSkip, swells = [], actuals = [], cycle = 'this week' }) {
  const [stepIndex, setStepIndex] = useState(step);
  useEffect(() => setStepIndex(step), [step]);

  const stepData = [
    {
      prompt: `What did you expect to see ${cycle}?`,
      placeholder: 'Type, or skip.',
      cta: 'Reveal',
    },
    null, // radar reveal — no input
    {
      prompt: 'What did you actually see?',
      placeholder: 'A noticing, a feeling, a phrase. Or skip.',
      cta: 'Continue',
    },
  ];
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');

  if (stepIndex === 1) {
    // Radar reveal
    return (
      <div style={{ padding: '28px 22px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: 0 }}>
          {cycle} · frozen
        </p>
        <p className="serif" style={{ fontSize: 22, margin: '6px 0 18px', color: 'var(--text-secondary)' }}>
          Here's what was.
        </p>
        <ReflectionsRadar swells={swells} actuals={actuals} draggable={false} size={250} />
        <button
          type="button"
          onClick={() => { setStepIndex(2); onAdvance?.(2); }}
          style={{
            marginTop: 24, padding: '12px 22px', borderRadius: 999,
            border: 'none', background: 'var(--btn)', color: 'var(--btn-text)',
            fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em',
            fontFamily: 'inherit', cursor: 'pointer',
            transition: 'transform 120ms ease',
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onPointerUp={e => e.currentTarget.style.transform = ''}
        >
          Continue
        </button>
        <SkipLink onClick={onSkip} />
      </div>
    );
  }

  if (stepIndex === 3) {
    return (
      <div style={{ padding: '28px 22px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: 0 }}>
          a small adjustment
        </p>
        <p className="serif" style={{ fontSize: 22, margin: '6px 0 24px', color: 'var(--text-secondary)' }}>
          Want to tune something?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CTAButton label="Tune a swell" />
          <CTAButton label="Tune motions" />
          <SkipLink label="Not today" onClick={onSkip} />
        </div>
      </div>
    );
  }

  const data = stepData[stepIndex];
  return (
    <div style={{ padding: '28px 22px 24px', display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: 0 }}>
        {cycle} · {stepIndex === 0 ? 'expectation' : 'observation'}
      </p>
      <p className="serif" style={{ fontSize: 24, margin: '8px 0 18px', color: 'var(--text-secondary)', textWrap: 'pretty', lineHeight: 1.25 }}>
        {data.prompt}
      </p>
      <textarea
        value={stepIndex === 0 ? textA : textB}
        onChange={e => stepIndex === 0 ? setTextA(e.target.value) : setTextB(e.target.value)}
        placeholder={data.placeholder}
        rows={4}
        style={{
          width: '100%', resize: 'none',
          border: 'none', borderBottom: '1px solid var(--border)',
          background: 'transparent', padding: '8px 0',
          fontFamily: 'inherit', fontSize: 15, color: 'var(--text)',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
        <SkipLink onClick={onSkip} />
        <button
          type="button"
          onClick={() => { const next = stepIndex + 1; setStepIndex(next); onAdvance?.(next); }}
          style={{
            padding: '10px 18px', borderRadius: 999,
            border: 'none', background: 'var(--btn)', color: 'var(--btn-text)',
            fontSize: 14, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {data.cta}
        </button>
      </div>
    </div>
  );
}

function CTAButton({ label, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '13px 18px', borderRadius: 12,
        border: '1px solid var(--border)', background: primary ? 'var(--btn)' : 'var(--surface)',
        color: primary ? 'var(--btn-text)' : 'var(--text)',
        fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
        transition: 'transform 120ms ease, background 120ms ease',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
      onPointerUp={e => e.currentTarget.style.transform = ''}
    >
      {label}
    </button>
  );
}

/* ----- Skip affordance ---------------------------------------- */
function SkipLink({ label = 'Skip', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none', border: 'none', background: 'transparent',
        padding: '10px 14px', color: 'var(--text-muted)',
        fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
        letterSpacing: '-0.005em',
        textDecoration: 'underline', textDecorationColor: 'var(--text-faint)',
        textUnderlineOffset: 4,
      }}
    >
      {label}
    </button>
  );
}

/* ----- Add entry pattern -----------------------------------------
   When the user taps "+" the keyboard fills the bottom half. Compact
   form sitting just above it. No bottom sheet, no modal chrome.       */
function AddEntry({ kind = 'Motion', onSave, onCancel }) {
  const [name, setName] = useState('');
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      <div style={{ flex: 1, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <SkipLink label="Cancel" onClick={onCancel} />
          <p className="serif" style={{ fontSize: 16, margin: 0, color: 'var(--text-secondary)' }}>
            New {kind}
          </p>
          <button
            type="button"
            onClick={() => onSave?.(name)}
            disabled={!name.trim()}
            style={{
              border: 'none', background: 'transparent',
              color: name.trim() ? 'var(--accent)' : 'var(--text-faint)',
              fontSize: 15, fontWeight: 600, padding: 4, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Save
          </button>
        </div>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={kind === 'Motion' ? 'kayak' : kind === 'Swell' ? 'Adventure' : 'Health'}
          style={{
            width: '100%', border: 'none', background: 'transparent',
            fontSize: 32, fontFamily: 'var(--font-display)',
            color: 'var(--text)', outline: 'none', padding: '4px 0',
          }}
        />
        {kind === 'Motion' && (
          <div style={{ marginTop: 14, display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            <Chip>1 pt</Chip>
            <Chip>0.5 hr</Chip>
            <Chip>+ Swell</Chip>
          </div>
        )}
      </div>
      <FakeKeyboard />
    </div>
  );
}

function Chip({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '6px 12px', borderRadius: 999,
      border: '1px solid var(--border)',
      fontSize: 12, color: 'var(--text-secondary)',
      background: 'var(--surface)',
    }}>
      {children}
    </span>
  );
}

function FakeKeyboard() {
  const rows = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['⇧','z','x','c','v','b','n','m','⌫'],
  ];
  return (
    <div style={{
      background: 'var(--surface-2, var(--surface))',
      padding: '6px 4px 18px',
      borderTop: '1px solid var(--border-soft)',
    }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
          {row.map(k => (
            <div key={k} style={{
              width: k.length > 1 ? 36 : 28, height: 32,
              borderRadius: 5, background: 'var(--bg)',
              boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>{k}</div>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
        <div style={{ width: 36, height: 32, borderRadius: 5, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>123</div>
        <div style={{ width: 180, height: 32, borderRadius: 5, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)' }}>space</div>
        <div style={{ width: 50, height: 32, borderRadius: 5, background: 'var(--accent)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>return</div>
      </div>
    </div>
  );
}

/* ----- Wave-mode wash overlay ----------------------------------- */
function WaveWash({ rampLabel = 'Ramp · 70%' }) {
  return (
    <div style={{ position: 'relative', padding: 20 }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'var(--wave-wash)',
        animation: 'wash-fade-in 700ms ease-out',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p className="serif" style={{ fontSize: 15, margin: 0, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
          Easing in.
        </p>
        <span style={{
          padding: '3px 9px', borderRadius: 999,
          fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          background: 'var(--wave-wash)', color: 'var(--accent)',
          fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
        }}>{rampLabel}</span>
      </div>
    </div>
  );
}

/* ----- Status bar (iOS-like) ---------------------------------- */
function StatusBar() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 26px 6px', fontSize: 14, fontWeight: 600,
      color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg viewBox="0 0 18 12" width="17" height="11"><path fill="currentColor" d="M1 11 L17 11 L17 8 L13 8 L13 11 M9 11 L9 5 L5 5 L5 11 M9 11 L9 1 L17 1 L17 5 L13 5" opacity=".95"/></svg>
        <svg viewBox="0 0 16 12" width="15" height="11"><path fill="currentColor" d="M8 11 a5 5 0 0 1 -3.5 -1.4 L8 6 z M8 8 a2 2 0 0 0 -1.4 .6 L8 10 z" /><path fill="currentColor" opacity="0.4" d="M8 4 a8 8 0 0 0 -5.7 2.4 L8 12 z M8 0 a12 12 0 0 0 -8.5 3.5 L8 12 z" /></svg>
        <div style={{ width: 24, height: 11, border: '1.2px solid currentColor', borderRadius: 3, padding: 1, position: 'relative' }}>
          <div style={{ width: '78%', height: '100%', background: 'currentColor', borderRadius: 1 }} />
          <div style={{ position: 'absolute', right: -3, top: 3, width: 2, height: 5, background: 'currentColor', borderRadius: '0 1px 1px 0' }} />
        </div>
      </div>
    </div>
  );
}

/* ----- Top bar (in-phone) ------------------------------------- */
function PhoneTopBar({ title, action }) {
  return (
    <div style={{
      padding: '14px 18px 12px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-soft)',
    }}>
      <p className="serif" style={{ fontSize: 22, margin: 0, color: 'var(--text)' }}>{title}</p>
      {action}
    </div>
  );
}

function PlusButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none', border: 'none', background: 'transparent',
        width: 32, height: 32, borderRadius: 999, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-secondary)',
        transition: 'transform 120ms ease, background 120ms ease',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
      onPointerUp={e => e.currentTarget.style.transform = ''}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

/* ----- Export to global scope ---------------------------------- */
Object.assign(window, {
  Themed,
  TideBar,
  MotionRow,
  Checkbox,
  DailyProgress,
  SwellRow,
  Constellation,
  ReflectionsRadar,
  BottomNav,
  NavIcons,
  Celebration,
  WaveField,
  LockedPage,
  CycleCeremony,
  SkipLink,
  AddEntry,
  Chip,
  FakeKeyboard,
  WaveWash,
  StatusBar,
  PhoneTopBar,
  PlusButton,
  CTAButton,
});
