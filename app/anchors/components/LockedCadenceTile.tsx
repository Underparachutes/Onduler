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
}

export function LockedCadenceTile({ cadence }: Props) {
  const copy = COPY[cadence]

  return (
    <div className="px-5 py-5">
      <p className="text-[10px] uppercase tracking-widest text-th-muted">{copy.eyebrow}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-th-secondary">{copy.line}</p>
    </div>
  )
}
