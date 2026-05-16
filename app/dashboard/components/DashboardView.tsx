'use client'

import { useEffect, useRef, useState } from 'react'
import { DailyChecklist } from './DailyChecklist'
import { WavePrompt } from './WavePrompt'
import { AddMotionForm } from './AddMotionForm'
import { AddGroupForm } from './AddGroupForm'

type Swell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type Group = { id: string; name: string; color: string }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null }
type GroupWithMotions = { id: string; name: string; color: string; motions: Motion[] }
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }

type TrackingMode = 'points' | 'hours'

type Props = {
  groupsEnabled: boolean
  motions: Motion[]
  groups: GroupWithMotions[]
  ungroupedMotions: Motion[]
  submotionsMap: Record<string, Submotion[]>
  todayPoints: number
  todayHours: number
  doneMotionIds: string[]
  dailyGoal: number
  dailyGoalHours: number
  trackingMode: TrackingMode
  celebrationEnabled: boolean
  hapticEnabled: boolean
  allSwells: Swell[]
  allGroups: Group[]
  showWavePrompt: boolean
  waveDurationSeconds: number | null
}

export function DashboardView(props: Props) {
  const [openForm, setOpenForm] = useState<null | 'motion' | 'group'>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function handlePlus() {
    if (props.groupsEnabled) {
      setMenuOpen(prev => !prev)
    } else {
      setOpenForm('motion')
    }
  }

  const hasMotions = props.motions.length > 0

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        {openForm === 'motion' && (
          <AddMotionForm
            groups={props.allGroups}
            groupsEnabled={props.groupsEnabled}
            trackingMode={props.trackingMode}
            onClose={() => setOpenForm(null)}
          />
        )}
        {openForm === 'group' && (
          <AddGroupForm onClose={() => setOpenForm(null)} />
        )}

        {!openForm && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
              <div ref={menuRef} className="relative">
                <button
                  onClick={handlePlus}
                  aria-label="Add"
                  className="flex items-center justify-center text-3xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
                >
                  +
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-th-border bg-th-bg shadow-lg">
                    <button
                      onClick={() => { setMenuOpen(false); setOpenForm('motion') }}
                      className="block w-full px-4 py-3 text-left text-sm text-th-text transition-colors hover:bg-th-surface"
                    >
                      Add a motion
                    </button>
                    <div className="border-t border-th-border" />
                    <button
                      onClick={() => { setMenuOpen(false); setOpenForm('group') }}
                      className="block w-full px-4 py-3 text-left text-sm text-th-text transition-colors hover:bg-th-surface"
                    >
                      Add a group
                    </button>
                  </div>
                )}
              </div>
            </div>

            {props.showWavePrompt && <WavePrompt durationSeconds={props.waveDurationSeconds} />}

            {hasMotions ? (
              <DailyChecklist
                key={`${props.motions.length}-${props.trackingMode}`}
                groupsEnabled={props.groupsEnabled}
                motions={props.motions}
                groups={props.groups}
                ungroupedMotions={props.ungroupedMotions}
                submotionsMap={props.submotionsMap}
                todayPoints={props.todayPoints}
                todayHours={props.todayHours}
                doneMotionIds={props.doneMotionIds}
                dailyGoal={props.dailyGoal}
                dailyGoalHours={props.dailyGoalHours}
                trackingMode={props.trackingMode}
                celebrationEnabled={props.celebrationEnabled}
                hapticEnabled={props.hapticEnabled}
                allSwells={props.allSwells}
                allGroups={props.allGroups}
              />
            ) : (
              <div className="rounded-lg border border-th-border p-6 text-center">
                <p className="mb-1 text-sm font-medium text-th-text">Nothing here yet.</p>
                <p className="text-sm text-th-muted">Tap + to add your first motion</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
