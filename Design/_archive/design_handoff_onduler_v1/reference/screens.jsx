/* global React */
/* ==================================================================
   Onduler — phone-frame screens
   Compose the primitives into the 4 hero surfaces:
     1. Motions (paper list + daily progress)
     2. Reflections (radar, weekly)
     3. Locked Reflections (vibe-only)
     4. Cycle-close ceremony
   Plus a small theme-comparison row.
   Wrap any screen in <PhoneFrame theme={…} mode={…}> to swatch it
   in any of the three themes.
   ================================================================== */

const { useState: useS } = React;

function PhoneFrame({ theme = 'default', mode = 'light', width = 320, children, hideNav = false, label }) {
  return (
    <div style={{ display: 'inline-block' }}>
      <div data-theme={theme} data-mode={mode} className="themed" style={{
        width, borderRadius: 38,
        background: 'var(--bg)',
        boxShadow: mode === 'dark' ?
          '0 0 0 11px #0a0a0a, 0 0 0 12px #1a1a1a, 0 30px 60px -20px rgba(0,0,0,0.5), 0 12px 30px -10px rgba(0,0,0,0.3)' :
          '0 0 0 11px #18181b, 0 0 0 12px #27272a, 0 30px 60px -20px rgba(14, 34, 56, 0.35), 0 12px 30px -10px rgba(14, 34, 56, 0.18)',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'var(--font-body)',
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          width: 96, height: 24, borderRadius: 16, background: mode === 'dark' ? '#0a0a0a' : '#18181b', zIndex: 10,
        }} />
        <StatusBar />
        <div style={{ minHeight: 540, position: 'relative' }}>
          {children}
        </div>
        {!hideNav && <BottomNav active="motions" />}
        {/* Home indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 8px', background: 'var(--bg)' }}>
          <div style={{ width: 110, height: 4, borderRadius: 999, background: 'var(--text)', opacity: 0.55 }} />
        </div>
      </div>
      {label && (
        <p style={{
          margin: '14px 0 0', textAlign: 'center', fontSize: 12,
          color: 'var(--doc-muted)', letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>{label}</p>
      )}
    </div>
  );
}

/* ----- 1. Motions screen ---------------------------------------- */
function MotionsScreen({ celebrate = false, dailyValue = 11 }) {
  const [logged, setLogged] = useS({ walk: true, journal: true, cook: false, swim: false, call: false, read: false, kayak: false });
  const [showCele, setShowCele] = useS(celebrate);

  const motions = [
    { key: 'walk',    name: 'Walk', value: 3, unit: 'pts', color: 'var(--swell-1)' },
    { key: 'journal', name: 'Journal', value: 2, unit: 'pts', color: 'var(--swell-2)' },
    { key: 'cook',    name: 'Cook dinner', value: 4, unit: 'pts', color: 'var(--swell-3)' },
    { key: 'swim',    name: 'Swim', value: 5, unit: 'pts', color: 'var(--swell-5)' },
    { key: 'call',    name: 'Call Mom', value: 3, unit: 'pts', color: 'var(--swell-6)' },
    { key: 'read',    name: 'Read 20 min', value: 2, unit: 'pts', color: 'var(--swell-2)' },
    { key: 'kayak',   name: 'Kayak Tomales', value: 6, unit: 'pts', color: 'var(--swell-9)' },
  ];
  const total = motions.reduce((a, m) => a + (logged[m.key] ? m.value : 0), 0);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <PhoneTopBar
        title="Motions"
        action={
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, padding: 4, cursor: 'pointer', fontFamily: 'inherit' }}>Hide done</button>
            <PlusButton />
          </div>
        }
      />
      <DailyProgress value={total + dailyValue - 5} target={28} label="Today" />
      <div>
        {motions.map(m => (
          <MotionRow
            key={m.key}
            name={m.name}
            value={m.value}
            unit={m.unit}
            color={m.color}
            checked={logged[m.key]}
            onToggle={() => {
              const wasChecked = logged[m.key];
              const next = { ...logged, [m.key]: !wasChecked };
              setLogged(next);
              if (!wasChecked && m.key === 'cook') {
                setShowCele(true);
                setTimeout(() => setShowCele(false), 2200);
              }
            }}
          />
        ))}
      </div>
      <Celebration playing={showCele} color="var(--swell-3)" />
    </div>
  );
}

/* ----- 2. Reflections (radar) ---------------------------------- */
function ReflectionsScreen({ wave = false }) {
  const swells = [
    { name: 'Movement',  color: 'var(--swell-1)', target: 100 },
    { name: 'Mind',      color: 'var(--swell-2)', target: 60 },
    { name: 'Food',      color: 'var(--swell-3)', target: 80 },
    { name: 'Home',      color: 'var(--swell-4)', target: 40 },
    { name: 'Family',    color: 'var(--swell-5)', target: 90 },
    { name: 'Creativity',color: 'var(--swell-6)', target: 70 },
    { name: 'Adventure', color: 'var(--swell-9)', target: 50 },
  ];
  const actuals = wave ? [22, 8, 30, 12, 18, 0, 5] : [78, 52, 90, 24, 64, 40, 32];
  return (
    <div>
      <PhoneTopBar title="Reflections" action={<PlusButton />} />
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <span style={{ flex: 1 }}>Your swells this week</span>
        <span style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--surface)', textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'var(--text-muted)' }}>maker + scholar</span>
      </div>
      <div style={{ padding: '18px 12px 8px' }}>
        <ReflectionsRadar swells={swells} actuals={actuals} waveWash={wave} size={272} />
      </div>
      <div style={{ padding: '4px 18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          {wave ? 'Easing back in. Hitting these still counts.' : 'Drag a handle to tune.'}
        </p>
        {wave ? (
          <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'var(--wave-wash)', color: 'var(--accent)' }}>Ramp · 70%</span>
        ) : (
          <button style={{ border: '1px solid var(--border)', background: 'var(--bg)', padding: '5px 11px', borderRadius: 999, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit', cursor: 'pointer' }}>
            ↻ Reset
          </button>
        )}
      </div>
    </div>
  );
}

/* ----- 3. Locked Reflections ----------------------------------- */
function LockedReflectionsScreen() {
  return (
    <div>
      <PhoneTopBar title="Reflections" />
      <LockedPage cadence="weekly" copy="Glimpses of where you've been. Come back as you log." />
      <div style={{ padding: '0 18px 22px' }}>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p className="serif" style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)' }}>Coming together</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textWrap: 'pretty' }}>
            Soon the shape of your week will surface here.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----- 4. Cycle-close ceremony --------------------------------- */
function CeremonyScreen({ step = 1 }) {
  const swells = [
    { name: 'Movement',  color: 'var(--swell-1)', target: 100 },
    { name: 'Mind',      color: 'var(--swell-2)', target: 60 },
    { name: 'Food',      color: 'var(--swell-3)', target: 80 },
    { name: 'Family',    color: 'var(--swell-5)', target: 90 },
    { name: 'Creativity',color: 'var(--swell-6)', target: 70 },
    { name: 'Adventure', color: 'var(--swell-9)', target: 50 },
  ];
  const actuals = [78, 52, 90, 64, 40, 32];
  return (
    <div>
      <PhoneTopBar title="" />
      <CycleCeremony step={step} swells={swells} actuals={actuals} cycle="this week" />
    </div>
  );
}

/* ----- 5. Add-entry overlay screen ----------------------------- */
function AddEntryScreen() {
  return (
    <div>
      <PhoneTopBar title="Motions" action={<PlusButton />} />
      <DailyProgress value={11} target={28} label="Today" />
      <MotionRow name="Walk" value={3} unit="pts" checked={true} />
      <MotionRow name="Journal" value={2} unit="pts" checked={true} />
      <MotionRow name="Cook dinner" value={4} unit="pts" checked={false} />
      <AddEntry kind="Motion" />
    </div>
  );
}

/* ----- 6. Welcome-back screen ---------------------------------- */
function WelcomeBackScreen() {
  return (
    <div>
      <PhoneTopBar title="" />
      <div style={{ padding: '8px 22px 0' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: 0 }}>
          Welcome back
        </p>
        <p className="serif" style={{ fontSize: 28, margin: '8px 0 4px', color: 'var(--text)', lineHeight: 1.2 }}>
          The water's still here.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px', textWrap: 'pretty' }}>
          Still showing up: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Walk</span> · <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Journal</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={cardBtn(true)}>
            <span className="serif" style={{ fontSize: 18 }}>Ease back in</span>
            <span style={{ fontSize: 12, opacity: 0.7, marginTop: 4, fontWeight: 400 }}>Recommended · soft targets for 3 weeks</span>
          </button>
          <button style={cardBtn(false)}>
            <span className="serif" style={{ fontSize: 18 }}>Pick up your shape</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 400 }}>The maker, full targets</span>
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <SkipLink label="Try a different shape →" />
        </div>
      </div>
    </div>
  );
}

function cardBtn(primary) {
  return {
    appearance: 'none', border: primary ? 'none' : '1px solid var(--border)',
    background: primary ? 'var(--btn)' : 'var(--surface)',
    color: primary ? 'var(--btn-text)' : 'var(--text)',
    padding: '18px 18px', borderRadius: 16,
    textAlign: 'left', display: 'flex', flexDirection: 'column',
    fontFamily: 'inherit', cursor: 'pointer',
    transition: 'transform 120ms ease',
  };
}

Object.assign(window, {
  PhoneFrame,
  MotionsScreen,
  ReflectionsScreen,
  LockedReflectionsScreen,
  CeremonyScreen,
  AddEntryScreen,
  WelcomeBackScreen,
});
