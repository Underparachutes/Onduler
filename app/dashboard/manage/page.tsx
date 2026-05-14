import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteMotion, unhideMotion } from '@/app/actions/motions'
import { AddGroupForm } from '../components/AddGroupForm'
import { SortableGroupList } from '../components/SortableGroupList'
import { AddMotionStandaloneForm } from './AddMotionStandaloneForm'
import { ToggleGroupsButton } from './ToggleGroupsButton'

export default async function ManagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('groups_enabled')
    .eq('user_id', user.id)
    .single()
  const groupsEnabled = settings?.groups_enabled ?? false

  if (groupsEnabled) {
    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })

    return (
      <div className="flex min-h-full flex-col items-center px-6 py-24">
        <div className="w-full max-w-sm">
          <Link href="/dashboard" className="mb-6 inline-block text-sm text-th-faint hover:text-th-secondary">
            ← Back
          </Link>
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-th-text">Groups & motions</h1>
            <ToggleGroupsButton enabled={true} />
          </div>

          {groups && groups.length > 0 ? (
            <div className="mb-8">
              <p className="mb-4 text-sm text-th-muted">
                Tap a group to edit it and manage its motions.
              </p>
              <SortableGroupList groups={groups} />
            </div>
          ) : (
            <p className="mb-8 text-sm text-th-muted">No groups yet.</p>
          )}

          <div className="border-t border-th-border pt-8">
            <h2 className="mb-4 text-sm font-medium text-th-text">Add a group</h2>
            <AddGroupForm />
          </div>
        </div>
      </div>
    )
  }

  // Flat mode
  const [{ data: motions }, { data: hiddenMotions }] = await Promise.all([
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .is('parent_id', null)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours')
      .eq('user_id', user.id)
      .eq('hidden', true)
      .order('name', { ascending: true }),
  ])

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-24">
      <div className="w-full max-w-sm">
        <Link href="/dashboard" className="mb-6 inline-block text-sm text-th-faint hover:text-th-secondary">
          ← Back
        </Link>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-th-text">Motions</h1>
          <ToggleGroupsButton enabled={false} />
        </div>

        {motions && motions.length > 0 ? (
          <div className="mb-8 flex flex-col gap-2">
            {motions.map(motion => {
              const deleteById = deleteMotion.bind(null, motion.id)
              return (
                <div
                  key={motion.id}
                  className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-th-text">{motion.name}</p>
                    <p className="text-xs text-th-faint">{motion.default_points} pts · {motion.default_hours} hrs</p>
                  </div>
                  <form action={deleteById}>
                    <button
                      type="submit"
                      className="text-xs text-th-faint transition-colors hover:text-red-500"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mb-8 text-sm text-th-muted">No motions yet.</p>
        )}

        <div className="border-t border-th-border pt-8">
          <h2 className="mb-4 text-sm font-medium text-th-text">Add a motion</h2>
          <AddMotionStandaloneForm />
        </div>

        {hiddenMotions && hiddenMotions.length > 0 && (
          <div className="mt-8 border-t border-th-border pt-8">
            <h2 className="mb-1 text-sm font-medium text-th-text">Hidden</h2>
            <p className="mb-4 text-xs text-th-faint">These motions are hidden from your daily checklist.</p>
            <div className="flex flex-col gap-2">
              {hiddenMotions.map(motion => {
                const unhide = unhideMotion.bind(null, motion.id)
                return (
                  <div key={motion.id} className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-th-muted">{motion.name}</p>
                      <p className="text-xs text-th-faint">{motion.default_points} pts · {motion.default_hours} hrs</p>
                    </div>
                    <form action={unhide}>
                      <button type="submit" className="text-xs text-th-secondary transition-colors hover:text-th-text">
                        Unhide
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
