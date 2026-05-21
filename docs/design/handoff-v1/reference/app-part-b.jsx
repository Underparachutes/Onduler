/* global React */
const { useState: useStateB } = React;

/* ==================================================================
   4 — Color system
   ================================================================== */
const THEME_DATA = {
  default: {
    name: 'Default',
    sub: 'Deep ocean at first light',
    desc: 'The everyday tide. Luminous off-white in light, deep slate-blue in dark. Cresting-wave accent.',
  },
  bolinas: {
    name: 'Bolinas',
    sub: 'Northern California fog',
    desc: 'Cooler, foggier, more eucalyptus and stone. Pacific overcast morning. Lower saturation; greens permitted.',
  },
  biarritz: {
    name: 'Biarritz',
    sub: 'Atlantic surf town',
    desc: 'Warmer light, sun-bleached pastels, a touch of terracotta and ocher in the neutrals. Brighter than Bolinas, softer than Default.',
  },
};

const SEMANTIC_TOKENS = [
  ['bg', 'Page surface — water'],
  ['surface', 'Cards, panels — sand'],
  ['text', 'Ink'],
  ['text-secondary', 'Subhead, value'],
  ['text-muted', 'Meta, label'],
  ['border', 'Hairline rule'],
  ['accent', 'Cresting wave'],
  ['success', 'Crest hit'],
  ['wave-wash', 'Wave-mode overlay'],
];

function Swatch({ varName, label, isOverlay, isText, dark }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        height: 56, borderRadius: 8,
        background: isOverlay ? `linear-gradient(135deg, var(--bg), var(--bg)), var(--${varName})` : `var(--${varName})`,
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isOverlay && <div style={{ position: 'absolute', inset: 0, background: `var(--${varName})` }} />}
        {isText && (
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--bg)', fontFamily: 'var(--font-display)', fontSize: 22,
          }}>Aa</span>
        )}
      </div>
      <p style={{
        margin: '6px 0 0', fontSize: 10, fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</p>
    </div>
  );
}

function SwellPaletteRow({ theme, mode }) {
  return (
    <div data-theme={theme} data-mode={mode} className="themed" style={{
      padding: 16, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border-soft)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.005em' }}>{mode === 'dark' ? 'Dark' : 'Light'}</span>
        <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>10 swells</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ aspectRatio: '1 / 1', borderRadius: 999, background: `var(--swell-${i + 1})` }} />
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--surface)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--swell-1)' }} />
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>Movement</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>78 / 100</span>
      </div>
      <div style={{ marginTop: 6, height: 3, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: '78%', height: '100%', background: 'var(--swell-1)' }} />
      </div>
    </div>
  );
}

function ThemeCard({ theme }) {
  const data = THEME_DATA[theme];
  return (
    <SpecCard
      title={data.name}
      sub={data.sub}
    >
      <p style={{ padding: '12px 18px 0', margin: 0, fontSize: 13, color: 'var(--doc-secondary)', lineHeight: 1.55, textWrap: 'pretty' }}>{data.desc}</p>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {['light', 'dark'].map(mode => (
          <div key={mode} data-theme={theme} data-mode={mode} className="themed" style={{
            padding: 14, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{mode}</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>9 tokens</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {SEMANTIC_TOKENS.map(([t, lab]) => (
                <Swatch key={t} varName={t} label={t} isOverlay={t === 'wave-wash'} isText={t === 'text'} dark={mode === 'dark'} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 18px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SwellPaletteRow theme={theme} mode="light" />
        <SwellPaletteRow theme={theme} mode="dark" />
      </div>
    </SpecCard>
  );
}

function ColorSection() {
  return (
    <Section
      id="color" kicker="4 — Color"
      title="Three themes, two modes each."
      lead="Onduler ships multiple themes. Users pick one; the entire palette flows from it. Each theme provides nine semantic tokens (light + dark) and ten Swell colors — one per Swell, randomly assigned at onboarding. Toggle-active controls always use bg-text + text-bg so the inversion works in both modes."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <ThemeCard theme="default" />
        <ThemeCard theme="bolinas" />
        <ThemeCard theme="biarritz" />
      </div>
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        <SpecCard title="Toggle-active = inversion" sub="bg-text + text-bg, so it survives any theme/mode flip.">
          <div data-theme="default" data-mode="light" className="themed" style={{ padding: 18, background: 'var(--bg)', display: 'flex', gap: 10 }}>
            {['Week', 'Month', 'All time'].map((l, i) => (
              <button key={l} style={{
                flex: 1, padding: '10px 12px', borderRadius: 999,
                border: `1px solid ${i === 0 ? 'var(--text)' : 'var(--border)'}`,
                background: i === 0 ? 'var(--text)' : 'transparent',
                color: i === 0 ? 'var(--bg)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
          <div data-theme="default" data-mode="dark" className="themed" style={{ padding: 18, background: 'var(--bg)', display: 'flex', gap: 10 }}>
            {['Week', 'Month', 'All time'].map((l, i) => (
              <button key={l} style={{
                flex: 1, padding: '10px 12px', borderRadius: 999,
                border: `1px solid ${i === 0 ? 'var(--text)' : 'var(--border)'}`,
                background: i === 0 ? 'var(--text)' : 'transparent',
                color: i === 0 ? 'var(--bg)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
        </SpecCard>
        <SpecCard title="Swell family check" sub="Side-by-side at radar opacity (0.32). They read as a family.">
          <div data-theme="default" data-mode="light" className="themed" style={{ padding: 18, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ flex: 1, height: 40, background: `var(--swell-${i + 1})`, opacity: 0.32, borderRadius: 4 }} />
              ))}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>opacity 0.32 — radar wedge fill</p>
          </div>
        </SpecCard>
      </div>
    </Section>
  );
}

/* ==================================================================
   5 — Component primitives
   Each one rendered live in a Themed island. Default theme.
   ================================================================== */
function PrimitivesSection() {
  return (
    <Section
      id="primitives" kicker="5 — Primitives"
      title="Eleven things, and the rules they live by."
      lead="Every primitive is small. None of them shadow-card themselves into looking important — list rows do not escalate to card containers just because they're tappable. Tap any primitive to see how it responds."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>

        {/* Motion row */}
        <SpecCard title="Motion row" sub="Paper-list. No card chrome, no badges, no shadow. Tap to log; long-press to drag.">
          <Themed style={{ borderRadius: 0, border: 'none' }}>
            <PaperListDemo />
          </Themed>
        </SpecCard>

        {/* Daily progress */}
        <SpecCard title="Daily progress bar" sub="Slim, soft. Sits at the top of Motions. 4px high. The bar is the chrome.">
          <Themed style={{ borderRadius: 0, border: 'none' }}>
            <DailyProgress value={18} target={28} label="Today" />
          </Themed>
          <Themed theme="default" mode="dark" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--doc-line)' }}>
            <DailyProgress value={18} target={28} label="Today" />
          </Themed>
        </SpecCard>

        {/* Swell row */}
        <SpecCard title="Swell row" sub="Name, color dot, weekly tide bar, small lifetime line. No tier badges.">
          <Themed style={{ borderRadius: 0, border: 'none' }}>
            <SwellRow name="Movement" color="var(--swell-1)" value={78} target={100} lifetimePts={4280} weeksRunning={12} />
            <SwellRow name="Mind" color="var(--swell-2)" value={52} target={60} lifetimePts={2680} weeksRunning={11} />
            <SwellRow name="Adventure" color="var(--swell-9)" value={32} target={50} lifetimePts={918} weeksRunning={6} />
          </Themed>
        </SpecCard>

        {/* Tide bar — the primitive */}
        <SpecCard title="Tide bar" sub="3px tall, low-saturation track, fills with the Swell's color. Crossing 100% triggers celebration upstream.">
          <div style={{ padding: '22px 22px 24px', background: 'var(--doc-surface)' }}>
            <TideBarDemo />
          </div>
        </SpecCard>

        {/* Constellation */}
        <SpecCard title="Constellation" sub="Per-Swell. Center = weekly value / target. Surrounding Motion nodes sized by points earned, opacity by recency. Planetarium-like.">
          <Themed style={{ borderRadius: 0, border: 'none', padding: '22px 12px 18px' }}>
            <Constellation
              swellName="Mind"
              swellColor="var(--swell-2)"
              value={52} target={60}
              motions={[
                { name: 'Journal',  weight: 0.9, value: 14, recency: 'week' },
                { name: 'Read',     weight: 0.7, value: 11, recency: 'week' },
                { name: 'Meditate', weight: 0.5, value: 12, recency: 'week' },
                { name: 'Walk',     weight: 0.4, value: 8,  recency: 'month' },
                { name: 'Sketch',   weight: 0.3, value: 4,  recency: 'month' },
                { name: 'Letters',  weight: 0.2, value: 3,  recency: 'lifetime' },
              ]}
              size={300}
            />
          </Themed>
        </SpecCard>

        {/* Radar */}
        <SpecCard title="Reflections radar" sub="N-gon of pie-slice wedges, one per Swell. Drag any target vertex to tune. Try it.">
          <Themed style={{ borderRadius: 0, border: 'none', padding: '22px 12px 18px' }}>
            <ReflectionsRadar
              size={300}
              swells={[
                { name: 'Movement',  color: 'var(--swell-1)', target: 100 },
                { name: 'Mind',      color: 'var(--swell-2)', target: 60 },
                { name: 'Food',      color: 'var(--swell-3)', target: 80 },
                { name: 'Family',    color: 'var(--swell-5)', target: 90 },
                { name: 'Creativity',color: 'var(--swell-6)', target: 70 },
                { name: 'Adventure', color: 'var(--swell-9)', target: 50 },
              ]}
              actuals={[78, 52, 90, 64, 40, 32]}
            />
          </Themed>
        </SpecCard>

        {/* Bottom nav */}
        <SpecCard title="Bottom nav" sub="Four tabs. Active is high-contrast; inactive quiet. When a ceremony is pending, the Reflections icon tide-pulses and other tabs slightly dim.">
          <NavDemo />
        </SpecCard>

        {/* Celebration */}
        <SpecCard title="Celebration moment" sub="A single wave swelling and breaking outward from the Swell. Foam bloom, then settle. 1.8s. Tap to play.">
          <CelebrationDemo />
        </SpecCard>

        {/* Wave wash */}
        <SpecCard title="Wave-mode wash" sub="Soft full-screen overlay on the Reflections radar when the current week intersects a Wave. Subtractive, calming, never alarming.">
          <Themed style={{ borderRadius: 0, border: 'none' }}>
            <WaveWash rampLabel="Ramp · 70%" />
          </Themed>
        </SpecCard>

        {/* Skip */}
        <SpecCard title="Skip affordance" sub="Always visible, never penalized. Same consistent treatment across every prompt and ceremony. Skip is always a door.">
          <Themed style={{ borderRadius: 0, border: 'none', padding: 22, display: 'flex', gap: 18, alignItems: 'center' }}>
            <SkipLink />
            <SkipLink label="Not today" />
            <SkipLink label="Maybe later" />
          </Themed>
        </SpecCard>
      </div>

      {/* Wider primitives below */}
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        <SpecCard title="Locked Reflections page" sub="Cadence not yet unlocked. Pure vibe — no data, no date, no counter. Mystery, not gating.">
          <Themed style={{ borderRadius: 0, border: 'none' }}>
            <LockedPage cadence="weekly" copy="Glimpses of where you've been. Come back as you log." />
          </Themed>
        </SpecCard>
        <SpecCard title="Cycle-close ceremony" sub="Three steps. Both prompts skippable. Skip is a visible door.">
          <Themed style={{ borderRadius: 0, border: 'none' }}>
            <CycleCeremony step={0} cycle="this week" />
          </Themed>
        </SpecCard>
      </div>

      <div style={{ marginTop: 22 }}>
        <SpecCard title="Add-entry pattern" sub="Tap + to create a Motion. The keyboard fills the bottom half; a compact form sits just above it. No bottom sheet, no modal chrome — the keyboard is the experience.">
          <div style={{ background: 'var(--doc-bg)', padding: 22, display: 'flex', justifyContent: 'center' }}>
            <PhoneFrame theme="default" mode="light" width={300} hideNav>
              <AddEntryScreen />
            </PhoneFrame>
          </div>
        </SpecCard>
      </div>
    </Section>
  );
}

/* ---- live demos for primitives ---- */
function PaperListDemo() {
  const [done, setDone] = useStateB({ a: false, b: true, c: false, d: false });
  return (
    <div>
      <MotionRow name="Walk" value={3} unit="pts" color="var(--swell-1)" checked={done.a} onToggle={() => setDone({ ...done, a: !done.a })} />
      <MotionRow name="Journal" value={2} unit="pts" color="var(--swell-2)" checked={done.b} onToggle={() => setDone({ ...done, b: !done.b })} />
      <MotionRow name="Cook dinner" value={4} unit="pts" color="var(--swell-3)" checked={done.c} onToggle={() => setDone({ ...done, c: !done.c })} />
      <MotionRow name="Kayak Tomales" value={6} unit="pts" color="var(--swell-9)" checked={done.d} onToggle={() => setDone({ ...done, d: !done.d })} />
    </div>
  );
}

function TideBarDemo() {
  const [pct, setPct] = useStateB(0.62);
  return (
    <Themed style={{ borderRadius: 10, border: '1px solid var(--border)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'baseline' }}>
        <span className="serif" style={{ fontSize: 18, color: 'var(--text)' }}>Movement</span>
        <span className="tnum" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Math.round(pct * 100)} / 100</span>
      </div>
      <TideBar value={pct * 100} target={100} color="var(--swell-1)" height={3} />
      <div style={{ display: 'flex', gap: 6, marginTop: 14, alignItems: 'center' }}>
        <button onClick={() => setPct(Math.max(0, pct - 0.15))} style={tinyBtn()}>−</button>
        <button onClick={() => setPct(Math.min(1, pct + 0.15))} style={tinyBtn()}>+</button>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 6 }}>animate · 800ms · ease-out</span>
      </div>
    </Themed>
  );
}

function tinyBtn() {
  return {
    width: 28, height: 28, borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text-secondary)',
    fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
  };
}

function NavDemo() {
  const [pending, setPending] = useStateB(true);
  return (
    <div>
      <Themed style={{ borderRadius: 0, border: 'none' }}>
        <BottomNav active="motions" pending={pending} />
      </Themed>
      <Themed theme="default" mode="dark" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--doc-line)' }}>
        <BottomNav active="reflections" pending={pending} />
      </Themed>
      <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--doc-line)' }}>
        <label style={{ fontSize: 12, color: 'var(--doc-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={pending} onChange={e => setPending(e.target.checked)} />
          ceremony pending
        </label>
        <span style={{ fontSize: 11, color: 'var(--doc-faint)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>nav-tide-pulse · 2.4s</span>
      </div>
    </div>
  );
}

function CelebrationDemo() {
  const [playing, setPlaying] = useStateB(false);
  return (
    <Themed style={{ borderRadius: 0, border: 'none', position: 'relative', minHeight: 220 }}>
      <div style={{ padding: '22px 22px 60px', position: 'relative' }}>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
          target crossed
        </p>
        <p className="serif" style={{ fontSize: 26, margin: '8px 0 4px', color: 'var(--text)', textWrap: 'pretty' }}>
          <em>Mind — full this week.</em>
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Twelve hours in. Beautiful.</p>
        <button
          onClick={() => { setPlaying(true); setTimeout(() => setPlaying(false), 2200); }}
          style={{
            marginTop: 18, padding: '9px 16px', borderRadius: 999,
            background: 'var(--swell-2)', color: 'white', border: 'none',
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
          ▶ Play celebration
        </button>
        <Celebration playing={playing} color="var(--swell-2)" />
      </div>
    </Themed>
  );
}

Object.assign(window, { ColorSection, PrimitivesSection, ThemeCard, SwellPaletteRow, Swatch });
