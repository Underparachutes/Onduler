'use client'

export type CelebrationState = {
  x: number
  y: number
  type: 'glow' | 'wave' | 'bloom'
}

const BLOOM_PARTICLES = [
  { dx: '0px',   dy: '-72px' },
  { dx: '51px',  dy: '-51px' },
  { dx: '72px',  dy: '0px'   },
  { dx: '51px',  dy: '51px'  },
  { dx: '0px',   dy: '72px'  },
  { dx: '-51px', dy: '51px'  },
  { dx: '-72px', dy: '0px'   },
  { dx: '-51px', dy: '-51px' },
]

export function CelebrationOverlay({
  celebration,
  onDone,
}: {
  celebration: CelebrationState
  onDone: () => void
}) {
  const { x, y, type } = celebration

  if (type === 'wave') {
    return (
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        <div
          className="absolute left-0 right-0 bg-th-btn"
          style={{
            top: '100vh',
            height: '100vh',
            opacity: 0.2,
            borderRadius: '45% 45% 0 0 / 30px 30px 0 0',
            animation: 'celebration-wave 1.1s ease-out forwards',
          }}
          onAnimationEnd={onDone}
        />
      </div>
    )
  }

  if (type === 'bloom') {
    return (
      <div className="pointer-events-none fixed inset-0 z-50">
        {BLOOM_PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-th-btn"
            style={{
              left: x,
              top: y,
              width: 10,
              height: 10,
              '--p-dx': p.dx,
              '--p-dy': p.dy,
              animation: `celebration-particle 0.55s ease-out ${i * 18}ms forwards`,
            } as React.CSSProperties}
            onAnimationEnd={i === BLOOM_PARTICLES.length - 1 ? onDone : undefined}
          />
        ))}
      </div>
    )
  }

  // Glow (default)
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        className="absolute rounded-full bg-th-secondary"
        style={{
          left: x,
          top: y,
          width: 80,
          height: 80,
          animation: 'celebration-glow 0.7s ease-out forwards',
        }}
        onAnimationEnd={onDone}
      />
    </div>
  )
}
