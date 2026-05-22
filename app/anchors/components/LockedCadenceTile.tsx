import { WaveField, type WaveLine } from '@/app/components/WaveField'
import { Wake } from './Wake'

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

const TILE_WAVES: WaveLine[] = [
  { yBase: 0.40, amplitude: 8, frequency: 0.030, speed: 0.0020, phase: 0.5, width: 0.6, opacity: 0.08 },
  { yBase: 0.55, amplitude: 10, frequency: 0.025, speed: 0.0035, phase: 1.8, width: 0.8, opacity: 0.12 },
  { yBase: 0.70, amplitude: 12, frequency: 0.020, speed: 0.0015, phase: 3.2, width: 1.0, opacity: 0.18 },
  { yBase: 0.85, amplitude: 14, frequency: 0.028, speed: 0.0045, phase: 0.9, width: 1.2, opacity: 0.24 },
]

type Props = {
  cadence: Cadence
  actuals?: number[]
  inWave?: boolean
}

export function LockedCadenceTile({ cadence, actuals = [], inWave = false }: Props) {
  const copy = COPY[cadence]

  return (
    <div className="relative overflow-hidden rounded-xl bg-th-surface/60 px-4 py-5">
      <WaveField lines={TILE_WAVES} />
      <div className="relative flex items-center gap-4" style={{ zIndex: 1 }}>
        <div className="shrink-0 flex items-center justify-center" style={{ width: '120px', height: '80px' }}>
          {!inWave && <Wake actuals={actuals} mini />}
        </div>

        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-th-muted">{copy.eyebrow}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-th-secondary">{copy.line}</p>
        </div>
      </div>
    </div>
  )
}
