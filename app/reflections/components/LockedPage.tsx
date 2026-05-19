// Full vibe-only locked Reflections page (ADR 0007). Shown when weekly
// hasn't yet unlocked for the active chapter. No radar, no period filter,
// no engagement counter — pure mystery. Marketing site explains the
// mechanism for users who want the why.

const HEX_R = 70

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

export function LockedPage() {
  const outer = hexPath(110, 110, HEX_R)
  const inner = hexPath(110, 110, HEX_R * 0.45)

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <p className="mb-6 text-xs uppercase tracking-widest text-th-muted">Onduler</p>

        <div className="flex flex-col items-center gap-10 pt-8">
          {/* Blurred radar silhouette */}
          <div className="relative h-56 w-56">
            <svg viewBox="0 0 220 220" className="absolute inset-0" style={{ filter: 'blur(4px)' }}>
              <path d={outer} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-th-faint" />
              <path d={inner} fill="currentColor" className="text-th-faint" opacity="0.22" />
            </svg>
            {/* Two drifting tide lines */}
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2"
              style={{ animation: 'tide-drift 11s ease-in-out infinite' }}
            >
              <div className="h-px w-[140%] -ml-[20%] bg-th-faint/40" />
            </div>
            <div
              className="pointer-events-none absolute inset-x-0"
              style={{ top: '65%', animation: 'tide-drift 14s ease-in-out infinite reverse' }}
            >
              <div className="h-px w-[140%] -ml-[20%] bg-th-faint/30" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-semibold text-th-text">
              Reflections
            </h1>
            <p className="max-w-xs text-sm leading-relaxed text-th-secondary">
              Something is taking shape here. Keep showing up.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
