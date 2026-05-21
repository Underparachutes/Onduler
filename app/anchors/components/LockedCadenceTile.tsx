// Vibe-only locked-cadence anticipation surface (ADR 0007). Renders a blurred
// radar silhouette plus a soft drifting tide line, with intentionally soft
// copy — no date, no engagement counter. The mystery is the point.
//
// Pure SSR component — no interactivity, no client state. Animation is CSS.

type Cadence = 'month' | 'quarter' | 'year'

const COPY: Record<Cadence, { eyebrow: string; line: string }> = {
  month: {
    eyebrow: 'Monthly',
    line: 'Something is taking shape across the weeks.',
  },
  quarter: {
    eyebrow: 'Quarterly',
    line: 'A longer rhythm is gathering underneath.',
  },
  year: {
    eyebrow: 'Yearly',
    line: 'A full season of motion is on its way.',
  },
}

// Regular hexagon path centered at (60, 60), radius 38. Sized to fit a 120×80
// SVG with vertical breathing room for the tide-line overlay.
function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `M${pts.join(' L')} Z`
}

export function LockedCadenceTile({ cadence }: { cadence: Cadence }) {
  const copy = COPY[cadence]
  const path = hexPath(60, 60, 38)
  // Inner filled silhouette — slightly smaller, soft fill, the "what's coming"
  // hint without numbers. Kept abstract.
  const innerPath = hexPath(60, 60, 22)

  return (
    <div className="relative overflow-hidden rounded-xl bg-th-surface/60 px-4 py-5">
      <div className="flex items-center gap-4">
        {/* Blurred radar silhouette */}
        <div className="relative h-20 w-30 shrink-0" style={{ width: '120px', height: '80px' }}>
          <svg viewBox="0 0 120 80" className="absolute inset-0" style={{ filter: 'blur(2px)' }}>
            <path d={path} fill="none" stroke="currentColor" strokeWidth="1.25" className="text-th-faint" />
            <path d={innerPath} fill="currentColor" className="text-th-faint" opacity="0.25" />
          </svg>
          {/* Drifting tide line — soft horizontal motion, lower-middle of tile */}
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2"
            style={{ animation: 'tide-drift 9s ease-in-out infinite' }}
          >
            <div className="h-px w-[140%] -ml-[20%] bg-th-faint/40" />
          </div>
          <div
            className="pointer-events-none absolute inset-x-0"
            style={{ top: '68%', animation: 'tide-drift 11s ease-in-out infinite reverse' }}
          >
            <div className="h-px w-[140%] -ml-[20%] bg-th-faint/30" />
          </div>
        </div>

        {/* Soft copy */}
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-th-muted">{copy.eyebrow}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-th-secondary">{copy.line}</p>
        </div>
      </div>
    </div>
  )
}
