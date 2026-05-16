'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SwellsList } from './SwellsList'
import { AddSwellForm } from './AddSwellForm'

type Swell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type Group = { id: string; name: string; color: string }
type Motion = {
  id: string
  name: string
  default_points: number
  default_hours: number
  swells: MotionSwell[]
  groupId: string | null
  swellIds: string[]
  swellWeights: Record<string, number>
}
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }
type SwellWithMotions = {
  id: string
  name: string
  color: string
  target_points: number | null
  target_hours: number | null
  motions: Motion[]
}

type TrackingMode = 'points' | 'hours'

type Props = {
  swells: SwellWithMotions[]
  unassigned: Motion[]
  ptsToday: Record<string, number>
  hrsToday: Record<string, number>
  swellStubs: Swell[]
  submotionsMap: Record<string, Submotion[]>
  doneMotionIds: string[]
  allGroups: Group[]
  groupsEnabled: boolean
  trackingMode: TrackingMode
  hasAnyMotions: boolean
}

export function SwellsView(props: Props) {
  const [openForm, setOpenForm] = useState<null | 'swell'>(null)

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        {openForm === 'swell' ? (
          <AddSwellForm trackingMode={props.trackingMode} onClose={() => setOpenForm(null)} />
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="hidden text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97] sm:inline">
                  ← Back
                </Link>
                <button
                  onClick={() => setOpenForm('swell')}
                  aria-label="Add a swell"
                  className="flex items-center justify-center text-3xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
                >
                  +
                </button>
              </div>
            </div>

            <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Swells</h1>

            {props.swells.length === 0 && !props.hasAnyMotions && (
              <p className="mb-8 text-sm text-th-muted">No motions yet. Add some from Today first.</p>
            )}

            <SwellsList
              swells={props.swells}
              unassigned={props.unassigned}
              ptsToday={props.ptsToday}
              hrsToday={props.hrsToday}
              swellStubs={props.swellStubs}
              submotionsMap={props.submotionsMap}
              doneMotionIds={props.doneMotionIds}
              allGroups={props.allGroups}
              groupsEnabled={props.groupsEnabled}
              trackingMode={props.trackingMode}
            />
          </>
        )}
      </div>
    </div>
  )
}
