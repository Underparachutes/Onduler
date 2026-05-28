'use client'

export type CelebrationState = {
  x: number
  y: number
  colors?: string[]
  rowBottom?: number
}

const TIDELINE_HEIGHT = 5

export function CelebrationOverlay({
  celebration,
  onDone,
}: {
  celebration: CelebrationState
  onDone: () => void
}) {
  const colors = celebration.colors ?? []
  const bg = colors.length > 1
    ? `linear-gradient(to right, ${colors.join(', ')})`
    : colors[0] ?? 'var(--th-muted)'
  const top = celebration.rowBottom ?? celebration.y

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        className="absolute left-0 right-0"
        style={{
          top,
          height: TIDELINE_HEIGHT,
          background: bg,
          animation: 'celebration-tideline 0.9s ease-out both',
        }}
        onAnimationEnd={onDone}
      />
    </div>
  )
}
