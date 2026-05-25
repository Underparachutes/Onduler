'use client'

export type CelebrationState = {
  x: number
  y: number
  type: 'bloom' | 'ripple' | 'tideline'
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

const RIPPLE_DELAYS = [0, 200, 400]

const TIDELINE_LINES = [
  { offsetY: -4, height: 2,   delay: 0   },
  { offsetY:  0, height: 1.5, delay: 100 },
  { offsetY:  4, height: 1,   delay: 200 },
]

export function CelebrationOverlay({
  celebration,
  onDone,
}: {
  celebration: CelebrationState
  onDone: () => void
}) {
  const { x, y, type } = celebration

  if (type === 'ripple') {
    return (
      <div className="pointer-events-none fixed inset-0 z-50">
        {RIPPLE_DELAYS.map((delay, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: x,
              top: y,
              width: 36,
              height: 36,
              border: '1.5px solid var(--th-secondary)',
              animation: `celebration-ripple 1.1s ease-out ${delay}ms both`,
            }}
            onAnimationEnd={i === RIPPLE_DELAYS.length - 1 ? onDone : undefined}
          />
        ))}
      </div>
    )
  }

  if (type === 'tideline') {
    return (
      <div className="pointer-events-none fixed inset-0 z-50">
        {TIDELINE_LINES.map((line, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{
              top: y + line.offsetY,
              height: line.height,
              backgroundColor: 'var(--th-muted)',
              transformOrigin: `${x}px center`,
              animation: `celebration-tideline 0.9s ease-out ${line.delay}ms both`,
            }}
            onAnimationEnd={i === TIDELINE_LINES.length - 1 ? onDone : undefined}
          />
        ))}
      </div>
    )
  }

  // Bloom
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
