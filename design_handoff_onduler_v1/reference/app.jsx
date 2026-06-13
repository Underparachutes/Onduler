/* global React, ReactDOM */
const { useState: useStateMain } = React;

function App() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 120px', display: 'flex', gap: 24, position: 'relative' }}>
      <SideNav />
      <main style={{ flex: 1, minWidth: 0 }}>
        <CoverSection />
        <VocabSection />
        <TypeSection />
        <ColorSection />
        <PrimitivesSection />
        <SurfacesSection />
        <ScreensSection />
        <MotionSection />
        <VoiceSection />
        <IconsSection />
        <AntiPatternsSection />
        <Colophon />
      </main>
    </div>
  );
}

function Colophon() {
  return (
    <section style={{ marginTop: 80, paddingTop: 36, borderTop: '1px solid var(--doc-rule)' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--doc-secondary)', margin: 0, fontStyle: 'italic', textWrap: 'pretty', maxWidth: 540 }}>
        Showing up at all is honored. The water's still here.
      </p>
      <p style={{ marginTop: 14, fontSize: 11, color: 'var(--doc-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Onduler · Design System · v1 · May 2026
      </p>
    </section>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
