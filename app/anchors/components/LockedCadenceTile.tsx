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

type Props = {
  cadence: Cadence
  actuals?: number[]
}

export function LockedCadenceTile({ cadence, actuals = [] }: Props) {
  const copy = COPY[cadence]

  return (
    <div className="relative overflow-hidden rounded-xl bg-th-surface/60 px-4 py-5">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: '120px', height: '80px' }}>
          <Wake actuals={actuals} mini />
        </div>

        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-th-muted">{copy.eyebrow}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-th-secondary">{copy.line}</p>
        </div>
      </div>
    </div>
  )
}
