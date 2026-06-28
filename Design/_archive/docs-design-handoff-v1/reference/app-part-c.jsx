/* global React */
const { useState: useStateC } = React;

/* ==================================================================
   6 — Surfaces (full-bleed surface samples per theme)
   ================================================================== */
function SurfacesSection() {
  return (
    <Section
      id="surfaces" kicker="6 — Surfaces"
      title="The three themes, alive."
      lead="Each theme is more than a swatch grid — it sets the temperature of the entire surface. Light and dark, side by side. Same screen, three weather systems."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {['default', 'bolinas', 'biarritz'].map(theme => (
          <div key={theme}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 26, color: 'var(--doc-ink)', fontWeight: 400, letterSpacing: '0.02em' }}>
                {THEME_DATA[theme].name}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--doc-muted)' }}>{THEME_DATA[theme].sub}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
              <SurfaceSample theme={theme} mode="light" />
              <SurfaceSample theme={theme} mode="dark" />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SurfaceSample({ theme, mode }) {
  return (
    <div data-theme={theme} data-mode={mode} className="themed" style={{
      borderRadius: 14, overflow: 'hidden', background: 'var(--bg)',
      border: '1px solid var(--border-soft)',
      boxShadow: mode === 'dark' ? '0 8px 24px -10px rgba(0,0,0,0.35)' : '0 8px 24px -10px rgba(14, 34, 56, 0.08)',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-soft)' }}>
        <p className="serif" style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>Motions</p>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{mode}</span>
      </div>
      <DailyProgress value={18} target={28} label="Today" />
      <MotionRow name="Walk" value={3} unit="pts" color="var(--swell-1)" checked={true} />
      <MotionRow name="Journal" value={2} unit="pts" color="var(--swell-2)" checked={true} />
      <MotionRow name="Cook dinner" value={4} unit="pts" color="var(--swell-3)" checked={false} />
      <MotionRow name="Kayak" value={6} unit="pts" color="var(--swell-9)" checked={false} />
      <div style={{ padding: '14px 18px', display: 'flex', gap: 8 }}>
        <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, background: 'var(--surface)', color: 'var(--text-muted)' }}>· flat</span>
        <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, background: 'var(--text)', color: 'var(--bg)', fontWeight: 500 }}>this week</span>
      </div>
    </div>
  );
}

/* ==================================================================
   7 — Phone-frame screens — the hero gallery
   ================================================================== */
function ScreensSection() {
  return (
    <Section
      id="screens" kicker="7 — Screens"
      title="The four surfaces, in a phone."
      lead="Motions is the ritual surface. Reflections is the mirror. Locked is the welcome before there's data. Ceremony is the rare, designed pause. Tap into any."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>

        {/* Hero — Motions across 3 themes */}
        <div>
          <h3 className="serif" style={{ margin: '0 0 8px', fontSize: 24, color: 'var(--doc-ink)', fontWeight: 400 }}>Motions, three weathers</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--doc-muted)', maxWidth: 540, textWrap: 'pretty' }}>
            The daily surface is the most-touched. Paper list, no cards, no badge soup. Same content; three theme temperatures.
          </p>
          <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PhoneFrame theme="default"  mode="light" label="Default · Light"><MotionsScreen /></PhoneFrame>
            <PhoneFrame theme="bolinas"  mode="light" label="Bolinas · Light"><MotionsScreen /></PhoneFrame>
            <PhoneFrame theme="biarritz" mode="light" label="Biarritz · Light"><MotionsScreen /></PhoneFrame>
          </div>
        </div>

        <div>
          <h3 className="serif" style={{ margin: '0 0 8px', fontSize: 24, color: 'var(--doc-ink)', fontWeight: 400 }}>Same surfaces, after dark</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--doc-muted)', maxWidth: 540, textWrap: 'pretty' }}>
            Deep slate-blue in Default. Rain-wet stone in Bolinas. Warm atlantic deep in Biarritz. The Swell palette stays distinguishable in all three.
          </p>
          <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PhoneFrame theme="default"  mode="dark" label="Default · Dark"><MotionsScreen /></PhoneFrame>
            <PhoneFrame theme="bolinas"  mode="dark" label="Bolinas · Dark"><MotionsScreen /></PhoneFrame>
            <PhoneFrame theme="biarritz" mode="dark" label="Biarritz · Dark"><MotionsScreen /></PhoneFrame>
          </div>
        </div>

        <div>
          <h3 className="serif" style={{ margin: '0 0 8px', fontSize: 24, color: 'var(--doc-ink)', fontWeight: 400 }}>Reflections</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--doc-muted)', maxWidth: 540, textWrap: 'pretty' }}>
            The radar reads like fuel gauges in a flower. Each wedge is a Swell, filled radially with this week's actual. Drag a handle to tune. Wave-mode wash softens the same chart without alarm.
          </p>
          <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PhoneFrame theme="default" mode="light" label="This week"><ReflectionsScreen /></PhoneFrame>
            <PhoneFrame theme="default" mode="light" label="Wave-mode wash"><ReflectionsScreen wave /></PhoneFrame>
            <PhoneFrame theme="default" mode="dark" label="Dark"><ReflectionsScreen /></PhoneFrame>
          </div>
        </div>

        <div>
          <h3 className="serif" style={{ margin: '0 0 8px', fontSize: 24, color: 'var(--doc-ink)', fontWeight: 400 }}>Locked & Ceremony</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--doc-muted)', maxWidth: 540, textWrap: 'pretty' }}>
            Two designed pauses. Locked says <em>not yet, and that's beautiful</em>. Ceremony says <em>here's what was, here's what you saw</em>. Both are skippable. Neither carries dread.
          </p>
          <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PhoneFrame theme="default" mode="light" label="Locked · vibe only"><LockedReflectionsScreen /></PhoneFrame>
            <PhoneFrame theme="default" mode="light" label="Ceremony · expect"><CeremonyScreen step={0} /></PhoneFrame>
            <PhoneFrame theme="default" mode="light" label="Ceremony · reveal"><CeremonyScreen step={1} /></PhoneFrame>
            <PhoneFrame theme="default" mode="light" label="Ceremony · observe"><CeremonyScreen step={2} /></PhoneFrame>
            <PhoneFrame theme="default" mode="light" label="Ceremony · tune"><CeremonyScreen step={3} /></PhoneFrame>
            <PhoneFrame theme="biarritz" mode="light" label="Welcome back · Biarritz"><WelcomeBackScreen /></PhoneFrame>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ==================================================================
   8 — Motion specs
   ================================================================== */
function MotionSection() {
  const specs = [
    { name: 'Tide bar fill',         dur: '800ms', easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', desc: 'Smooth, water-rising. Width animates from 0 → target. Never bouncy.' },
    { name: 'Celebration wave',      dur: '1800ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', desc: 'A single circle swells from the Swell, breaks outward, and disappears. Companioned by a foam bloom (1100ms) and 10 droplets.' },
    { name: 'Foam bloom',            dur: '1100ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', desc: 'White radial gradient blooms outward from the celebration center. Delayed 120ms after the wave starts.' },
    { name: 'Tide-pulse (nav)',      dur: '2400ms', easing: 'ease-in-out · infinite',         desc: 'Reflections icon breathes when a ceremony is pending. Subtle: 0.7 → 1.0 opacity, -1.5px lift. Other tabs dim to 0.55.' },
    { name: 'Drifting tide lines',   dur: '18s',    easing: 'ease-in-out · infinite',         desc: 'Locked page background. Horizontal sine paths drift -12% → 12% → -12%. Continuous; never restarts harshly.' },
    { name: 'Wave-mode wash fade-in',dur: '700ms',  easing: 'ease-out',                       desc: 'When the Reflections radar acquires its wash, the overlay fades up softly. Subtractive, never alarming.' },
    { name: 'Press feedback',        dur: '120ms',  easing: 'ease',                           desc: 'Every nav tap, every Motion row tap. Scale 1.0 → 0.94 on pointerdown, instant. Latency must never read as broken.' },
    { name: 'Slow breathe',          dur: '4s',     easing: 'ease-in-out · infinite',         desc: 'The Locked page silhouette pulses 0.85 → 1.0 → 0.85 opacity. Calmer than a heartbeat.' },
  ];
  return (
    <Section
      id="motion" kicker="8 — Motion"
      title="Water-aware, not RPG-aware."
      lead="Fills rise. Wedges fill radially. Celebrations swell and break. No bouncy spring physics, no confetti-cannon energy. Every motion is short of three seconds or invisible. Spec table below; tap to preview where applicable."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {specs.map(s => (
          <SpecCard key={s.name} title={s.name} sub={`${s.dur} · ${s.easing}`}>
            <p style={{ padding: '14px 18px 18px', margin: 0, fontSize: 14, color: 'var(--doc-secondary)', lineHeight: 1.5, textWrap: 'pretty' }}>
              {s.desc}
            </p>
            <MotionPreview name={s.name} />
          </SpecCard>
        ))}
      </div>
    </Section>
  );
}

function MotionPreview({ name }) {
  const [tick, setTick] = useStateC(0);
  if (name === 'Tide bar fill') {
    return (
      <div style={{ padding: '0 18px 18px' }}>
        <div key={tick}>
          <Themed style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
            <TideBar value={86} target={100} color="var(--swell-1)" height={4} />
          </Themed>
        </div>
        <button onClick={() => setTick(tick + 1)} style={replayBtn()}>↻ Replay</button>
      </div>
    );
  }
  if (name === 'Celebration wave') {
    const [play, setPlay] = useStateC(false);
    return (
      <div style={{ padding: '0 18px 18px' }}>
        <Themed style={{ padding: 28, borderRadius: 8, border: '1px solid var(--border)', position: 'relative', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="serif" style={{ fontSize: 18, color: 'var(--text)', whiteSpace: 'nowrap' }}><em>Full this week.</em></span>
          <Celebration playing={play} color="var(--swell-2)" />
        </Themed>
        <button onClick={() => { setPlay(true); setTimeout(() => setPlay(false), 2200); }} style={replayBtn()}>▶ Play</button>
      </div>
    );
  }
  if (name === 'Tide-pulse (nav)') {
    return (
      <div style={{ padding: '0 18px 18px' }}>
        <Themed style={{ borderRadius: 8, border: '1px solid var(--border)' }}>
          <BottomNav active="motions" pending />
        </Themed>
      </div>
    );
  }
  if (name === 'Drifting tide lines') {
    return (
      <div style={{ padding: '0 18px 18px' }}>
        <Themed style={{ borderRadius: 8, border: '1px solid var(--border)', height: 120, position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 400 120" style={{ position: 'absolute', inset: 0, width: '120%', left: '-10%', animation: 'tide-drift 18s ease-in-out infinite' }}>
            {Array.from({ length: 5 }, (_, i) => {
              const y = 12 + i * 24;
              return <path key={i} d={`M 0 ${y} Q 50 ${y - 4}, 100 ${y} T 200 ${y} T 300 ${y} T 400 ${y}`} fill="none" stroke="var(--text)" strokeWidth="0.5" opacity={0.18 + (i % 2) * 0.08} />;
            })}
          </svg>
        </Themed>
      </div>
    );
  }
  if (name === 'Wave-mode wash fade-in') {
    const [show, setShow] = useStateC(true);
    return (
      <div style={{ padding: '0 18px 18px' }}>
        <Themed style={{ position: 'relative', padding: 24, borderRadius: 8, border: '1px solid var(--border)', minHeight: 80, overflow: 'hidden' }}>
          {show && <div style={{ position: 'absolute', inset: 0, background: 'var(--wave-wash)', animation: 'wash-fade-in 700ms ease-out' }} />}
          <p className="serif" style={{ margin: 0, fontSize: 16, color: 'var(--text-secondary)', position: 'relative' }}>Easing back in.</p>
        </Themed>
        <button onClick={() => { setShow(false); setTimeout(() => setShow(true), 60); }} style={replayBtn()}>↻ Replay</button>
      </div>
    );
  }
  if (name === 'Press feedback') {
    return (
      <div style={{ padding: '0 18px 18px' }}>
        <Themed style={{ padding: 18, borderRadius: 8, border: '1px solid var(--border)' }}>
          <MotionRow name="Tap me" value={3} unit="pts" color="var(--swell-1)" checked={false} />
        </Themed>
      </div>
    );
  }
  if (name === 'Slow breathe') {
    return (
      <div style={{ padding: '0 18px 18px' }}>
        <Themed style={{ padding: 22, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <svg viewBox="0 0 100 100" width="64" height="64" style={{ animation: 'slow-breathe 4s ease-in-out infinite' }}>
            <polygon points="50,8 86,30 86,70 50,92 14,70 14,30" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6" />
          </svg>
        </Themed>
      </div>
    );
  }
  if (name === 'Foam bloom') {
    const [play, setPlay] = useStateC(false);
    return (
      <div style={{ padding: '0 18px 18px' }}>
        <Themed style={{ padding: 24, borderRadius: 8, border: '1px solid var(--border)', position: 'relative', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <span className="serif" style={{ fontSize: 16, color: 'var(--text-secondary)' }}>foam</span>
          {play && <div style={{ position: 'absolute', top: '50%', left: '50%', width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%)', animation: 'celebration-foam 1100ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }} />}
        </Themed>
        <button onClick={() => { setPlay(false); setTimeout(() => setPlay(true), 60); }} style={replayBtn()}>▶ Play</button>
      </div>
    );
  }
  return null;
}

function replayBtn() {
  return {
    marginTop: 10, padding: '5px 11px', borderRadius: 999,
    border: '1px solid var(--doc-line)', background: 'var(--doc-bg)',
    color: 'var(--doc-muted)', fontSize: 11, fontFamily: 'var(--font-body)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  };
}

/* ==================================================================
   9 — Voice
   ================================================================== */
function VoiceSection() {
  const empties = [
    { ctx: 'No Motions logged today',  copy: 'Hey — small or large, what feels good today?' },
    { ctx: 'A Swell sat at zero for a week', copy: 'Mind has been quiet. Want to give it a moment?' },
    { ctx: 'No Waypoints yet',          copy: 'No waypoints yet. Add one to mark something you\'re navigating toward.' },
    { ctx: 'A Wave week, ending',       copy: "We'll be here when you're back on the board." },
    { ctx: 'First open after a Wave',   copy: "Welcome back. The water's still here." },
  ];
  const ceremonyPrompts = [
    'What did you expect to see this week?',
    'What did you actually see?',
    'Want to tune something?',
    'Want to start a new chapter?',
  ];
  const dont = [
    { bad: "You haven't logged in 4 days. Don't break your streak!", why: 'Punishment framing. Counts the gap.' },
    { bad: "You missed Mind today.",                                  why: '"Missed" doesn\'t exist in Onduler.' },
    { bad: "Streak: 0 days — start over!",                            why: 'Visible reset. Guilt.' },
    { bad: "Complete your daily goal!",                               why: 'The word "goal" is banned. The word "complete" is heavy.' },
  ];
  return (
    <Section
      id="voice" kicker="9 — Voice"
      title="A calm friend at the water's edge."
      lead="Warm, direct, brief. Empty states use the mirror principle — they reflect what the user has done, not what they haven't. Never the language of failure, deficit, or falling behind. Showing up at all is honored."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        <SpecCard title="Empty states" sub="The mirror principle. Reflect what's there, never demand more.">
          <div>
            {empties.map(e => (
              <div key={e.ctx} style={{ padding: '14px 18px', borderBottom: '1px solid var(--doc-line)' }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--doc-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{e.ctx}</p>
                <p className="serif" style={{ margin: '4px 0 0', fontSize: 19, color: 'var(--doc-secondary)', lineHeight: 1.4, textWrap: 'pretty' }}>{e.copy}</p>
              </div>
            ))}
          </div>
        </SpecCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <SpecCard title="Ceremony prompts" sub="Same shape at every cadence. Cadence is the depth knob, not the question.">
            <div style={{ padding: 18 }}>
              {ceremonyPrompts.map(p => (
                <p key={p} className="serif" style={{ margin: '0 0 14px', fontSize: 22, color: 'var(--doc-secondary)', lineHeight: 1.35, textWrap: 'pretty' }}>
                  <em>{p}</em>
                </p>
              ))}
            </div>
          </SpecCard>
          <SpecCard title="Don't say this" sub="Visible failure language. Cut on sight.">
            <div>
              {dont.map(d => (
                <div key={d.bad} style={{ padding: '14px 18px', borderBottom: '1px solid var(--doc-line)' }}>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--doc-faint)', textDecoration: 'line-through', textDecorationColor: 'var(--doc-accent)' }}>{d.bad}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--doc-muted)' }}>{d.why}</p>
                </div>
              ))}
            </div>
          </SpecCard>
        </div>
      </div>
    </Section>
  );
}

/* ==================================================================
   10 — Icons
   ================================================================== */
function IconsSection() {
  const icons = [
    { name: 'Motions',     svg: NavIcons.motions },
    { name: 'Swells',      svg: NavIcons.swells },
    { name: 'Reflections', svg: NavIcons.reflections },
    { name: 'Settings',    svg: NavIcons.settings },
    { name: 'Plus',        svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.75" strokeLinecap="round" stroke="currentColor"><path d="M12 5v14M5 12h14" /></svg> },
    { name: 'Check',       svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> },
    { name: 'Kebab',       svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg> },
    { name: 'Skip arrow',  svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg> },
    { name: 'Waypoint',    svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-3.3 0-6 2.5-6 5.7 0 4.3 6 13.3 6 13.3s6-9 6-13.3c0-3.2-2.7-5.7-6-5.7Z" /><circle cx="12" cy="7.7" r="1.8" stroke="currentColor" /></svg> },
    { name: 'Wave',        svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round"><path d="M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9s3-3 4.5-3 3 1.5 4.5 1.5S22 6 22 6" /><path d="M2 17c1.5-3 3-4.5 4.5-4.5S9 14 10.5 14s3-3 4.5-3 3 1.5 4.5 1.5S22 11 22 11" /></svg> },
    { name: 'Drag handle', svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" /></svg> },
    { name: 'Hex',         svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinejoin="round"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7" /></svg> },
  ];
  return (
    <Section
      id="icons" kicker="10 — Icons"
      title="Twelve glyphs. 1.75 stroke. Round joins."
      lead="Stroke icons at 22px on a 24px box. Stroke 1.75, line-cap round, line-join round. Swells is a north-pointing compass — orientation. Reflections is an anchor — your swells anchor you. Settings is sliders — the verb is already tune."
    >
      <NavRefreshPanel />
      <div style={{ marginTop: 24 }} />
      <SpecCard title="System glyphs">
        <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {icons.map(i => (
            <div key={i.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', borderRadius: 10, background: 'var(--doc-bg)' }}>
              <div style={{ color: 'var(--doc-ink)' }}>{i.svg}</div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--doc-muted)', fontFamily: 'var(--font-mono)' }}>{i.name}</p>
            </div>
          ))}
        </div>
      </SpecCard>
    </Section>
  );
}

/* Bottom-nav icon refresh — before, picked, and alternatives. */
const NAV_REFRESH = {
  swells: [
    {
      key: 'before',
      label: 'Before',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round">
          <path d="M2 10c1.4-2.6 2.8-3.9 4.2-3.9S8.8 7.8 10.2 7.8s2.8-2.6 4.2-2.6 2.8 1.3 4.2 1.3S22 5.2 22 5.2" />
          <path d="M2 15c1.4-2.6 2.8-3.9 4.2-3.9S8.8 12.8 10.2 12.8s2.8-2.6 4.2-2.6 2.8 1.3 4.2 1.3S22 10.2 22 10.2" />
          <path d="M2 20c1.4-2.6 2.8-3.9 4.2-3.9S8.8 17.8 10.2 17.8s2.8-2.6 4.2-2.6 2.8 1.3 4.2 1.3S22 15.2 22 15.2" />
        </svg>
      ),
    },
    {
      key: 'picked', picked: true, label: 'Compass',
      svg: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 5 L14.2 11.6 L9.8 11.6 Z" fill="currentColor" />
          <path d="M12 19 L14.2 12.4 L9.8 12.4 Z" fill="none" />
        </svg>
      ),
    },
    {
      key: 'rising', label: 'Rising swell',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 18 C 6 18, 8 5, 13 5 C 17.5 5, 21 11, 22 18" />
          <path d="M5 21 C 8 21, 10 14, 14 14 C 18 14, 20.5 18.5, 22 21" strokeOpacity="0.5" />
        </svg>
      ),
    },
    {
      key: 'topo', label: 'Topo lines',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round">
          <path d="M4 17 Q 12 9 20 17" />
          <path d="M2 20 Q 12 11 22 20" strokeOpacity="0.5" />
        </svg>
      ),
    },
  ],
  reflections: [
    {
      key: 'before', label: 'Before',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="12" rx="9" ry="9" />
          <path d="M12 3a9 9 0 0 0 0 18" fill="currentColor" fillOpacity="0.18" />
          <path d="M12 3v18" />
        </svg>
      ),
    },
    {
      key: 'picked', picked: true, label: 'Anchor',
      svg: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="4.5" r="1.9" />
          <path d="M12 6.4 V 20" />
          <path d="M8.6 10.5 H 15.4" />
          <path d="M4.6 13.5 C 4.6 17.6, 8.2 20, 12 20 C 15.8 20, 19.4 17.6, 19.4 13.5" />
          <path d="M4.6 13.5 L 6.6 14.7 M 4.6 13.5 L 4.6 15.7" />
          <path d="M19.4 13.5 L 17.4 14.7 M 19.4 13.5 L 19.4 15.7" />
        </svg>
      ),
    },
    {
      key: 'radar', label: 'Radar hex',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12,2.5 20.5,7 20.5,17 12,21.5 3.5,17 3.5,7" />
          <path d="M 12 12 L 20.5 7 L 20.5 17 Z" fill="currentColor" fillOpacity="0.22" strokeWidth="1.25" />
        </svg>
      ),
    },
    {
      key: 'ripple', label: 'Pool ripple',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="13" rx="9" ry="3" />
          <ellipse cx="12" cy="13" rx="5" ry="1.6" strokeOpacity="0.55" />
          <circle cx="12" cy="13" r="1.1" fill="currentColor" />
        </svg>
      ),
    },
  ],
  settings: [
    {
      key: 'before', label: 'Before',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2.8" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4" />
        </svg>
      ),
    },
    {
      key: 'picked', picked: true, label: 'Sliders',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h9 M17 8h4" />
          <circle cx="14.5" cy="8" r="2.25" fill="var(--doc-bg)" />
          <path d="M3 16h4 M12 16h9" />
          <circle cx="9.5" cy="16" r="2.25" fill="var(--doc-bg)" />
        </svg>
      ),
    },
    {
      key: 'tuner', label: 'Tuner',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      ),
    },
    {
      key: 'soft-cog', label: 'Soft cog',
      svg: (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" />
        </svg>
      ),
    },
  ],
};

function NavRefreshPanel() {
  const rows = [
    { tab: 'Swells',      key: 'swells',      copy: 'A compass — north filled (where you are heading), south hollow (where you have been). The yin-yang treatment reads as a real compass at small size instead of a closed eye shape.' },
    { tab: 'Reflections', key: 'reflections', copy: 'An anchor — your swells anchor you. Reads as steady, not surveillance.' },
    { tab: 'Settings',    key: 'settings',    copy: 'Sliders — the verb is already "tune." Knobs at different positions read at small size.' },
  ];
  return (
    <SpecCard title="Bottom-nav refresh" sub="Motions stays. The other three get something with a point of view. Picked is the recommendation; the others are alternatives if any feel closer.">
      <div>
        {rows.map(r => (
          <div key={r.tab} style={{ padding: '18px 18px', borderBottom: '1px solid var(--doc-line)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
              <p className="serif" style={{ margin: 0, fontSize: 18, color: 'var(--doc-ink)', width: 130, flexShrink: 0 }}>{r.tab}</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--doc-muted)', lineHeight: 1.5, textWrap: 'pretty', flex: 1 }}>{r.copy}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {NAV_REFRESH[r.key].map(o => (
                <div key={o.key} style={{
                  position: 'relative',
                  border: o.picked ? '1.5px solid var(--doc-accent)' : '1px solid var(--doc-line)',
                  borderRadius: 10, background: o.key === 'before' ? 'repeating-linear-gradient(135deg, var(--doc-bg), var(--doc-bg) 6px, transparent 6px, transparent 12px)' : 'var(--doc-bg)',
                  padding: '20px 8px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                  {o.picked && (
                    <span style={{
                      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                      padding: '2px 10px', borderRadius: 999,
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: 'var(--doc-accent)', color: 'white', whiteSpace: 'nowrap',
                    }}>Picked</span>
                  )}
                  <div style={{ color: o.key === 'before' ? 'var(--doc-faint)' : 'var(--doc-ink)' }}>{o.svg}</div>
                  <p style={{ margin: 0, fontSize: 11, color: o.key === 'before' ? 'var(--doc-faint)' : 'var(--doc-muted)', fontFamily: 'var(--font-mono)' }}>{o.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ padding: 18 }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--doc-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>The picked set, in context</p>
          <Themed style={{ borderRadius: 12 }}>
            <BottomNav active="motions" pending />
          </Themed>
        </div>
      </div>
    </SpecCard>
  );
}

/* ==================================================================
   11 — Anti-patterns
   ================================================================== */
function AntiPatternsSection() {
  const bad = [
    {
      title: 'Red badges, red counters',
      desc: 'Red is the color of alarm. Onduler never uses it for "missed" anything. Counters of any kind for missed Motions are a permanent no.',
      demo: <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ position: 'relative', width: 28, height: 28 }}>
          {NavIcons.motions}
          <span style={{ position: 'absolute', top: -4, right: -8, background: '#e23d3d', color: 'white', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '2px 6px', fontFamily: 'var(--font-body)' }}>3</span>
        </span>
        <span style={{ fontSize: 13, color: '#e23d3d', fontWeight: 600 }}>3 missed today</span>
      </div>,
    },
    {
      title: '"You haven\'t done X in N days"',
      desc: 'Counts the gap. The mirror principle inverts this: reflect what the user did, not what they didn\'t.',
      demo: <p style={{ margin: 0, fontSize: 14, color: 'var(--doc-ink)' }}>
        You haven't journaled in <strong style={{ color: '#e23d3d' }}>11 days.</strong>
      </p>,
    },
    {
      title: 'Streak resetting visibly to zero',
      desc: 'Visible reset = visible failure. Onduler does not show streaks. Period.',
      demo: <p style={{ margin: 0, fontSize: 24, fontFamily: 'var(--font-display)', color: 'var(--doc-ink)' }}>
        🔥 Streak: <span style={{ color: '#e23d3d' }}>0</span>
      </p>,
    },
    {
      title: 'Card-stacks with shadows on the daily list',
      desc: 'List rows do not escalate to card containers just because they\'re tappable. Paper-list, no chrome.',
      demo: <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['Walk', 'Journal', 'Cook'].map(n => (
          <div key={n} style={{ padding: '14px 18px', background: 'white', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span>{n}</span><span style={{ background: '#e6e8ec', borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>2 pt</span>
          </div>
        ))}
      </div>,
    },
    {
      title: 'RPG vocabulary on a user surface',
      desc: 'Build / skill tree / class is an internal design heuristic only. The surface stays in surf voice: Tide, Wave, Swell, Motion, Waypoint. (Internally a "build"; user-facing it\'s a "shape.")',
      demo: <p style={{ margin: 0, fontSize: 14, color: 'var(--doc-ink)' }}>
        Choose your <strong>class</strong>: <span style={{ color: '#e23d3d' }}>Warrior</span> · <span>Mage</span> · <span>Rogue</span>
      </p>,
    },
    {
      title: 'The banned words anywhere',
      desc: 'tasks, activities, goals, domains. Permanent list. Includes button labels, settings copy, onboarding.',
      demo: <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--doc-ink)' }}>
        <p style={{ margin: 0 }}>Daily <strong style={{ color: '#e23d3d' }}>tasks</strong>: 4 of 6</p>
        <p style={{ margin: 0 }}>Pick your <strong style={{ color: '#e23d3d' }}>activities</strong>.</p>
        <p style={{ margin: 0 }}>Set a <strong style={{ color: '#e23d3d' }}>goal</strong> for each <strong style={{ color: '#e23d3d' }}>domain</strong>.</p>
      </div>,
    },
    {
      title: 'Forced, required, non-skippable prompts',
      desc: 'No required text fields. No "you must answer to continue." Skip is always a visible door. Both ceremony prompts skip individually.',
      demo: <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="serif" style={{ margin: 0, fontSize: 16, color: 'var(--doc-ink)' }}>What did you see?</p>
        <input placeholder="Required" style={{ padding: 8, border: '1.5px solid #e23d3d', borderRadius: 6, fontSize: 13 }} />
        <button style={{ background: '#e23d3d', color: 'white', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 13, alignSelf: 'flex-start', fontFamily: 'var(--font-body)', fontWeight: 600 }}>You must answer to continue</button>
      </div>,
    },
    {
      title: 'Celebration as confetti cannon',
      desc: 'Celebrations are water-aware: a wave swells and breaks. No bouncy springs, no fireworks, no emoji rain. One wave, one break, settle.',
      demo: <div style={{ display: 'flex', gap: 4, fontSize: 22, alignItems: 'center' }}>
        🎉 🎊 ✨ 🎈 🥳 <span style={{ fontSize: 12, color: '#e23d3d', marginLeft: 6, fontWeight: 600 }}>+12 levels!</span>
      </div>,
    },
  ];
  return (
    <Section
      id="antipat" kicker="11 — Anti-patterns"
      title="The things that look like engagement, and aren't."
      lead="Each of these breaks the posture. They optimize for retention through guilt. Onduler optimizes for retention through joy. Crossed-out is the only acceptable orientation."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {bad.map(b => (
          <div key={b.title} style={{
            border: '1px solid var(--doc-line)', borderRadius: 14, overflow: 'hidden',
            background: 'var(--doc-surface)', position: 'relative',
          }}>
            <div style={{
              padding: '14px 18px 14px',
              borderBottom: '1px solid var(--doc-line)',
              display: 'flex', alignItems: 'baseline', gap: 8,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                border: '1.5px solid #e23d3d',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', transform: 'translateY(2px)',
              }}>
                <span style={{ width: 12, height: 1.5, background: '#e23d3d', display: 'block', transform: 'rotate(-45deg)' }} />
              </span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--doc-ink)' }}>{b.title}</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--doc-muted)', lineHeight: 1.5, textWrap: 'pretty' }}>{b.desc}</p>
              </div>
            </div>
            <div style={{
              padding: 18, background: 'repeating-linear-gradient(135deg, #fbf3f3, #fbf3f3 8px, #fcf6f6 8px, #fcf6f6 16px)',
              position: 'relative',
            }}>
              {b.demo}
              <div aria-hidden style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, transparent 49.5%, rgba(226, 61, 61, 0.4) 49.5%, rgba(226, 61, 61, 0.4) 50.5%, transparent 50.5%)',
                pointerEvents: 'none',
              }} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

Object.assign(window, { SurfacesSection, SurfaceSample, ScreensSection, MotionSection, VoiceSection, IconsSection, AntiPatternsSection });
