/* global React, ReactDOM */
const { useState, useRef, useEffect } = React;

/* ==================================================================
   Onduler design system — page composition
   Long scrollable doc. Sticky section nav. Each section is a card.
   ================================================================== */

/* ---------- Section nav (sticky) ---------- */
const SECTIONS = [
  { id: 'cover',     label: '1 — Posture' },
  { id: 'vocab',     label: '2 — Vocabulary' },
  { id: 'type',      label: '3 — Type' },
  { id: 'color',     label: '4 — Color' },
  { id: 'primitives',label: '5 — Primitives' },
  { id: 'surfaces',  label: '6 — Surfaces' },
  { id: 'screens',   label: '7 — Screens' },
  { id: 'motion',    label: '8 — Motion' },
  { id: 'voice',     label: '9 — Voice' },
  { id: 'icons',     label: '10 — Icons' },
  { id: 'antipat',   label: '11 — Anti-patterns' },
];

function SideNav() {
  const [active, setActive] = useState('cover');
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return (
    <nav style={{
      position: 'sticky', top: 32, alignSelf: 'flex-start',
      width: 200, paddingLeft: 12, paddingRight: 24,
      fontSize: 13, lineHeight: 1.9,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 400,
        color: 'var(--doc-ink)', marginBottom: 4, letterSpacing: '0.08em',
      }}>Onduler</div>
      <div style={{ fontSize: 11, color: 'var(--doc-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 18 }}>Design system · v1</div>
      {SECTIONS.map(s => (
        <a key={s.id} href={`#${s.id}`} style={{
          display: 'block',
          color: active === s.id ? 'var(--doc-ink)' : 'var(--doc-muted)',
          textDecoration: 'none',
          fontWeight: active === s.id ? 600 : 400,
          paddingLeft: active === s.id ? 10 : 0,
          borderLeft: active === s.id ? '1.5px solid var(--doc-accent)' : '1.5px solid transparent',
          transition: 'all 200ms ease',
        }}>{s.label}</a>
      ))}
    </nav>
  );
}

/* ---------- Section wrapper ---------- */
function Section({ id, kicker, title, lead, children, dense }) {
  return (
    <section id={id} style={{ scrollMarginTop: 32, paddingTop: 56, paddingBottom: 24 }}>
      {kicker && <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--doc-accent)', margin: '0 0 12px', fontWeight: 600 }}>{kicker}</p>}
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 400,
        margin: 0, letterSpacing: '0.05em', color: 'var(--doc-ink)', lineHeight: 1.25,
      }}>{title}</h2>
      {lead && <p style={{ fontSize: 17, color: 'var(--doc-secondary)', maxWidth: 640, margin: '14px 0 0', lineHeight: 1.55, textWrap: 'pretty' }}>{lead}</p>}
      <div style={{ marginTop: dense ? 24 : 36 }}>{children}</div>
    </section>
  );
}

/* ---------- Mini card for specs/examples ---------- */
function SpecCard({ title, sub, children, style }) {
  return (
    <div style={{
      background: 'var(--doc-surface)', borderRadius: 14,
      border: '1px solid var(--doc-line)',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || sub) && (
        <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--doc-line)' }}>
          {title && <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--doc-ink)' }}>{title}</p>}
          {sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--doc-muted)' }}>{sub}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ==================================================================
   1 — Cover / posture
   ================================================================== */
function CoverSection() {
  return (
    <section id="cover" style={{ scrollMarginTop: 32, paddingTop: 16 }}>
      <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--doc-accent)', margin: '0 0 18px', fontWeight: 600 }}>1 — Posture</p>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 68, fontWeight: 400,
        letterSpacing: '0.05em', margin: 0, lineHeight: 1.1, color: 'var(--doc-ink)',
      }}>
        A calm app<br/>
        punctuated by<br/>
        <em style={{ fontStyle: 'italic' }}>small celebrations.</em>
      </h1>
      <p style={{ fontSize: 18, maxWidth: 580, color: 'var(--doc-secondary)', margin: '32px 0 0', lineHeight: 1.55, textWrap: 'pretty' }}>
        Onduler is built on a single posture: celebrate the user showing up — for themselves, for their life — and never make them feel watched, judged, or behind. Every visual decision gets measured against that bar. The competition optimizes retention through guilt; we optimize for joy.
      </p>
      <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {[
          { word: 'Tide', sub: 'the steady, default rhythm' },
          { word: 'Wave', sub: 'a period that pulls you under' },
          { word: 'Swell', sub: 'an area of life you want to invest in' },
        ].map(t => (
          <div key={t.word} style={{ borderTop: '1px solid var(--doc-rule)', paddingTop: 14 }}>
            <p className="serif" style={{ margin: 0, fontSize: 28, color: 'var(--doc-ink)' }}>{t.word}</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--doc-muted)' }}>{t.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ==================================================================
   2 — Vocabulary
   ================================================================== */
function VocabSection() {
  const locked = [
    { term: 'Tide', mean: 'The default daily mode. The steady rhythm.' },
    { term: 'Wave', mean: 'A period of disruption, recovery, focus, grief, illness. The app does not chase.' },
    { term: 'Swell', mean: 'A noun-shaped area of life. Has a weekly target. Many Motions feed many Swells.' },
    { term: 'Motion', mean: 'A trackable daily action. Verb-shaped: walk, cook, journal, kayak.' },
    { term: 'Waypoint', mean: 'A user-authored marker within a Swell. A point being navigated toward inside an ongoing rhythm.' },
    { term: 'Group', mean: 'An organizational folder for Motions and Swells. No target, no scoring.' },
  ];
  const banned = ['tasks', 'activities', 'goals', 'domains'];
  return (
    <Section
      id="vocab" kicker="2 — Vocabulary"
      title="Six words. Forever."
      lead="The locked terms are non-negotiable in copy. The mental model: Swells are nouns. Motions are verbs. A Swell is a part of life (Movement); a Motion is something you do (run). The banned words never reach a surface."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <SpecCard title="Locked vocabulary" sub="Use these exact words — never deviate.">
          <div>
            {locked.map(l => (
              <div key={l.term} style={{ padding: '14px 18px', borderBottom: '1px solid var(--doc-line)', display: 'flex', alignItems: 'baseline', gap: 18 }}>
                <p className="serif" style={{ margin: 0, fontSize: 20, color: 'var(--doc-ink)', width: 110, flexShrink: 0 }}>{l.term}</p>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--doc-secondary)', lineHeight: 1.5, textWrap: 'pretty' }}>{l.mean}</p>
              </div>
            ))}
          </div>
        </SpecCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SpecCard title="Banned words" sub="Permanent list. Never use anywhere a user can see.">
            <div style={{ padding: 18 }}>
              {banned.map(b => (
                <p key={b} className="serif" style={{
                  margin: '0 0 10px', fontSize: 26, color: 'var(--doc-faint)',
                  textDecoration: 'line-through', textDecorationColor: 'var(--doc-accent)',
                  textDecorationThickness: 1.5,
                }}>{b}</p>
              ))}
            </div>
          </SpecCard>
          <SpecCard title="Posture in one line" sub="The bar every decision gets measured against.">
            <p className="serif" style={{ margin: 0, padding: 18, fontSize: 19, color: 'var(--doc-secondary)', lineHeight: 1.5, textWrap: 'pretty' }}>
              <em>Celebrate the user showing up</em> — and never make them feel watched, judged, or behind.
            </p>
          </SpecCard>
        </div>
      </div>
    </Section>
  );
}

/* ==================================================================
   3 — Type
   ================================================================== */
function TypeSection() {
  const scale = [
    { sample: 'Aa', name: 'Display 68', spec: 'Courier Prime · 400 · +0.05em · 1.1', size: 68 },
    { sample: 'Aa', name: 'Display 44', spec: 'Courier Prime · 400 · +0.05em · 1.15', size: 44 },
    { sample: 'Aa', name: 'Title 26',   spec: 'Courier Prime · 400 · +0.05em · 1.25', size: 26 },
    { sample: 'Aa', name: 'Subhead 18', spec: 'Courier Prime · 400 · +0.05em · 1.4', size: 18 },
  ];
  const body = [
    { name: 'Body 17', spec: 'Manrope · 500 · 1.5 · used on Motion rows', size: 17, weight: 500 },
    { name: 'Body 15', spec: 'Manrope · 400 · 1.5 · default reading', size: 15, weight: 400 },
    { name: 'UI 13', spec: 'Manrope · 500 · 1.4 · stats, chips', size: 13, weight: 500 },
    { name: 'Label 11', spec: 'Manrope · 600 · 0.12em · upper · section kickers', size: 11, weight: 600, upper: true },
  ];
  return (
    <Section
      id="type" kicker="3 — Type"
      title="A typewriter voice, and a calm one."
      lead="Courier Prime is the display family — a refined typewriter face. Used for Swell names in proficiency headers, large numerals, ceremony prompts. The fixed pitch reads like a handwritten log book — deliberate, unhurried, never decorative. Manrope is the body / UI family — clean, slightly warm sans, highly legible at 14–17px. Numerals are tabular everywhere. No all-caps tracking-heavy buttons."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <SpecCard title="Display · Courier Prime" sub="Typewriter-feeling. Italic carries weight; use sparingly for ceremony prompts and the celebration line.">
          <div style={{ padding: '12px 22px 24px' }}>
            {scale.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'baseline', gap: 22, padding: '12px 0', borderBottom: '1px solid var(--doc-line)' }}>
                <span className="serif" style={{ fontSize: s.size, lineHeight: 1, color: 'var(--doc-ink)', width: 70, fontWeight: 400 }}>{s.sample}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--doc-ink)' }}>{s.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--doc-muted)', fontFamily: 'var(--font-mono)' }}>{s.spec}</p>
                </div>
              </div>
            ))}
            <p className="serif" style={{ margin: '24px 0 0', fontSize: 26, lineHeight: 1.3, color: 'var(--doc-secondary)', textWrap: 'pretty' }}>
              <em>What did you see this week?</em>
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--doc-faint)', fontFamily: 'var(--font-mono)' }}>
              ceremony prompt · Courier Prime Italic 22
            </p>
          </div>
        </SpecCard>
        <SpecCard title="Body · Manrope" sub="Slightly warm sans. Tabular numerals. No all-caps tracking.">
          <div style={{ padding: '12px 22px 24px' }}>
            {body.map(s => (
              <div key={s.name} style={{ padding: '14px 0', borderBottom: '1px solid var(--doc-line)' }}>
                <p style={{
                  margin: 0,
                  fontSize: s.size, fontWeight: s.weight,
                  color: 'var(--doc-ink)',
                  letterSpacing: s.upper ? '0.12em' : 'normal',
                  textTransform: s.upper ? 'uppercase' : 'none',
                }}>
                  {s.upper ? 'Your swells this week' : 'Walk · Journal · Cook · Swim'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--doc-muted)', fontFamily: 'var(--font-mono)' }}>{s.name} — {s.spec}</p>
              </div>
            ))}
            <div style={{ marginTop: 18 }}>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--doc-secondary)', lineHeight: 1.55, textWrap: 'pretty' }}>
                Hey, want to try kayaking today? The tide is gentle. Take what feels possible — we'll be here.
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--doc-faint)', fontFamily: 'var(--font-mono)' }}>
                empty-state copy · Manrope Body 15
              </p>
            </div>
          </div>
        </SpecCard>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        <SpecCard title="Tabular numerals" sub="Always. Stats and target readouts never reflow.">
          <div className="tnum" style={{ padding: 22, fontSize: 32, color: 'var(--doc-ink)', fontWeight: 500, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
            <div>78 / 100</div>
            <div style={{ fontSize: 18, color: 'var(--doc-muted)' }}>0.25 hr · 7 days</div>
          </div>
        </SpecCard>
        <SpecCard title="Italic for emphasis" sub="Reserved. Ceremony prompts, the celebration line.">
          <p className="serif" style={{ padding: 22, margin: 0, fontSize: 22, color: 'var(--doc-ink)', lineHeight: 1.4, textWrap: 'pretty' }}>
            <em>The water's still here.</em>
          </p>
        </SpecCard>
        <SpecCard title="No all-caps" sub="One exception: the 11px section kicker.">
          <div style={{ padding: 22 }}>
            <button style={{ background: 'var(--doc-ink)', color: 'white', padding: '11px 20px', borderRadius: 999, border: 'none', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)' }}>
              Continue
            </button>
            <p style={{ fontSize: 11, color: 'var(--doc-muted)', margin: '10px 0 0', fontFamily: 'var(--font-mono)' }}>
              sentence case · Manrope 500
            </p>
          </div>
        </SpecCard>
      </div>
    </Section>
  );
}

Object.assign(window, { SideNav, Section, SpecCard, CoverSection, VocabSection, TypeSection });
