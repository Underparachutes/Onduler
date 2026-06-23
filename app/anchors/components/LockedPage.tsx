import Link from 'next/link'
import { WaveField, type WaveLine } from '@/app/components/WaveField'
import { Wake } from './Wake'
import { HintCard } from '@/app/components/HintCard'

const WAVE_LINES: WaveLine[] = [
  { yBase: 0.18, amplitude: 10, frequency: 0.020, speed: 0.0012, phase: 0.0, width: 0.5, opacity: 0.05 },
  { yBase: 0.21, amplitude: 12, frequency: 0.030, speed: 0.0038, phase: 1.2, width: 0.5, opacity: 0.06 },
  { yBase: 0.24, amplitude: 11, frequency: 0.025, speed: 0.0022, phase: 2.8, width: 0.6, opacity: 0.07 },
  { yBase: 0.28, amplitude: 12, frequency: 0.022, speed: 0.0045, phase: 0.5, width: 0.6, opacity: 0.08 },
  { yBase: 0.31, amplitude: 14, frequency: 0.032, speed: 0.0015, phase: 1.8, width: 0.7, opacity: 0.09 },
  { yBase: 0.34, amplitude: 13, frequency: 0.027, speed: 0.0032, phase: 3.4, width: 0.7, opacity: 0.10 },
  { yBase: 0.38, amplitude: 14, frequency: 0.024, speed: 0.0050, phase: 0.9, width: 0.8, opacity: 0.13 },
  { yBase: 0.41, amplitude: 16, frequency: 0.034, speed: 0.0018, phase: 2.2, width: 0.8, opacity: 0.15 },
  { yBase: 0.44, amplitude: 15, frequency: 0.028, speed: 0.0040, phase: 4.0, width: 0.9, opacity: 0.17 },
  { yBase: 0.48, amplitude: 16, frequency: 0.020, speed: 0.0014, phase: 1.4, width: 1.0, opacity: 0.19 },
  { yBase: 0.51, amplitude: 18, frequency: 0.030, speed: 0.0048, phase: 2.8, width: 1.0, opacity: 0.21 },
  { yBase: 0.54, amplitude: 17, frequency: 0.025, speed: 0.0028, phase: 0.3, width: 1.1, opacity: 0.23 },
  { yBase: 0.58, amplitude: 18, frequency: 0.022, speed: 0.0055, phase: 1.9, width: 1.2, opacity: 0.26 },
  { yBase: 0.61, amplitude: 20, frequency: 0.032, speed: 0.0020, phase: 3.2, width: 1.3, opacity: 0.29 },
  { yBase: 0.64, amplitude: 19, frequency: 0.026, speed: 0.0042, phase: 0.7, width: 1.4, opacity: 0.32 },
  { yBase: 0.68, amplitude: 20, frequency: 0.018, speed: 0.0016, phase: 2.5, width: 1.6, opacity: 0.35 },
  { yBase: 0.71, amplitude: 22, frequency: 0.028, speed: 0.0052, phase: 0.1, width: 1.7, opacity: 0.38 },
  { yBase: 0.74, amplitude: 21, frequency: 0.023, speed: 0.0035, phase: 3.8, width: 1.8, opacity: 0.41 },
  { yBase: 0.78, amplitude: 22, frequency: 0.020, speed: 0.0058, phase: 1.6, width: 2.0, opacity: 0.44 },
  { yBase: 0.81, amplitude: 24, frequency: 0.030, speed: 0.0024, phase: 3.0, width: 2.2, opacity: 0.47 },
  { yBase: 0.84, amplitude: 23, frequency: 0.024, speed: 0.0046, phase: 0.4, width: 2.3, opacity: 0.50 },
  { yBase: 0.88, amplitude: 24, frequency: 0.016, speed: 0.0030, phase: 2.2, width: 2.6, opacity: 0.53 },
  { yBase: 0.92, amplitude: 26, frequency: 0.026, speed: 0.0060, phase: 0.8, width: 2.8, opacity: 0.56 },
  { yBase: 0.96, amplitude: 28, frequency: 0.021, speed: 0.0019, phase: 3.5, width: 3.2, opacity: 0.60 },
]

type Props = {
  actuals?: number[]
  inWave?: boolean
  hintSeen?: boolean
}

export function LockedPage({ actuals = [], inWave = false, hintSeen = true }: Props) {
  return (
    <div className="anchors-dark-bg fixed inset-0 z-0 flex flex-col overflow-hidden bg-th-bg md:left-60">
      <div className="sticky top-0 z-10 mx-5 bg-th-bg pb-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="brand-text text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link
            href="/anchors/new"
            aria-label="Drop an anchor"
            className="brand-text flex items-center justify-center text-3xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
          >
            +
          </Link>
        </div>
      </div>

      <div className="anchors-dark-field relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-th-bg pb-28 text-center">
        <WaveField lines={WAVE_LINES} />

        <div className="relative w-full max-w-[22rem] px-5" style={{ zIndex: 1 }}>
          <HintCard hintKey="anchors_locked" title="The page unlocks after your first week. You can drop an anchor anytime." seen={hintSeen} translucent>
            <p>This is where you&apos;ll see your wake, the shape of how you&apos;ve been showing up.</p>
          </HintCard>
        </div>

        {!inWave && (
          <div className="relative mb-6" style={{ zIndex: 2, isolation: 'isolate' }}>
            <Wake actuals={actuals} />
          </div>
        )}
        {inWave && <div className="mb-6" />}

        <p
          className="display relative max-w-[280px] text-pretty"
          style={{
            zIndex: 1,
            fontSize: 20,
            lineHeight: 1.55,
            letterSpacing: '0.04em',
            color: 'var(--th-secondary)',
          }}
        >
          Every motion leaves a wake.
        </p>
      </div>
    </div>
  )
}
