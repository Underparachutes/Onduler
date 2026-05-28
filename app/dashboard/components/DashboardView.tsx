'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { DailyChecklist } from './DailyChecklist'
import { DashboardShape } from './DashboardShape'
import { WavePrompt } from './WavePrompt'
import { HintCard } from '@/app/components/HintCard'
import { InstallTile } from './InstallTile'

const AddMotionForm = dynamic(() => import('./AddMotionForm').then(m => m.AddMotionForm))
const AddGroupForm = dynamic(() => import('./AddGroupForm').then(m => m.AddGroupForm))

type Swell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type Group = { id: string; name: string; color: string }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null; submotionMode: 'distribute' | 'rollup' | null }
type GroupWithMotions = { id: string; name: string; color: string; motions: Motion[] }
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }

type TrackingMode = 'points' | 'hours'

type Props = {
  groupsEnabled: boolean
  submotionsEnabled: boolean
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
  swellWeeklyProgress: Record<string, number>
  swellTargets: Record<string, number>
  weeklyLogMap: Record<string, Record<string, string[]>>
  hintMotionsSeen: boolean
}

export function DashboardView(props: Props) {
  const [openForm, setOpenForm] = useState<null | 'motion' | 'group'>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const shapeSwells = props.allSwells.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    target: props.swellTargets[s.id] ?? 0,
  }))
  const shapeActuals = props.allSwells.map(s => props.swellWeeklyProgress[s.id] ?? 0)

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
  const safeTop = 'calc(env(safe-area-inset-top, 0px) + 0.5rem)'

  return (
    <div className="flex min-h-full flex-col items-center px-4 pb-12">
      <div className="w-full max-w-[22rem] lg:max-w-none">
        {openForm === 'motion' && (
          <div style={{ paddingTop: safeTop }}>
            <AddMotionForm
              groups={props.allGroups}
              groupsEnabled={props.groupsEnabled}
              trackingMode={props.trackingMode}
              onClose={() => setOpenForm(null)}
            />
          </div>
        )}
        {openForm === 'group' && (
          <div style={{ paddingTop: safeTop }}>
            <AddGroupForm onClose={() => setOpenForm(null)} />
          </div>
        )}

        {!openForm && (
          <>
            {props.showWavePrompt && (
              <div style={{ paddingTop: safeTop }}>
                <WavePrompt durationSeconds={props.waveDurationSeconds} />
              </div>
            )}

            {shapeSwells.length >= 3 && (
              <DashboardShape
                swells={shapeSwells}
                actuals={shapeActuals}
                trackingMode={props.trackingMode}
                isInWave={props.showWavePrompt}
              />
            )}

            {hasMotions ? (
              <DailyChecklist
                key={`${props.motions.length}-${props.trackingMode}`}
                topBar={
                  <div className="mb-2 flex items-center justify-between">
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
                            Add a bucket
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                }
                belowHeader={
                  <HintCard hintKey="motions" title="This is your list." seen={props.hintMotionsSeen}>
                    <p className="mb-1.5">Motions are the verbs of your week, the things you do. Tap a row to log it. The kebab on each row opens everything else: points, swells, hide.</p>
                    <p>You decide what counts and how much. A 5-minute walk can be worth 1 point or 10. It's yours to weight.</p>
                  </HintCard>
                }
                groupsEnabled={props.groupsEnabled}
                submotionsEnabled={props.submotionsEnabled}
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
                swellWeeklyProgress={props.swellWeeklyProgress}
                swellTargets={props.swellTargets}
                weeklyLogMap={props.weeklyLogMap}
              />
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
                  <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
                  <div ref={menuRef} className="relative">
                    <button
                      onClick={handlePlus}
                      aria-label="Add"
                      className="flex items-center justify-center text-3xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-th-border p-6 text-center">
                  <p className="mb-1 text-sm font-medium text-th-text">Nothing here yet.</p>
                  <p className="text-sm text-th-muted">Tap + to add your first motion</p>
                </div>
              </>
            )}

            <InstallTile />
          </>
        )}
      </div>
    </div>
  )
}
