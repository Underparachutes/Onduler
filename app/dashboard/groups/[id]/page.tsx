import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteMotion } from '@/app/actions/motions'
import { AddMotionForm } from './AddMotionForm'
import { EditGroupForm } from './EditGroupForm'

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!group) notFound()

  const { data: motionGroups } = await supabase
    .from('motion_groups')
    .select('motion_id, motions(id, name, default_points, default_hours)')
    .eq('group_id', id)

  const motions = (motionGroups ?? [])
    .map(mg => mg.motions as unknown as { id: string; name: string; default_points: number; default_hours: number } | null)
    .filter(Boolean) as { id: string; name: string; default_points: number; default_hours: number }[]

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-24">
      <div className="w-full max-w-sm">
        <Link
          href="/dashboard/manage"
          className="mb-6 inline-block text-sm text-th-faint hover:text-th-secondary"
        >
          ← Back
        </Link>

        <div className="mb-8">
          <h2 className="mb-4 text-sm font-medium text-th-text">Edit group</h2>
          <EditGroupForm group={group} />
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-th-text">Motions in this group</h2>
          {motions.length > 0 ? (
            <div className="flex flex-col gap-2">
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
            <p className="text-sm text-th-muted">No motions assigned to this group yet.</p>
          )}
        </div>

        <div className="border-t border-th-border pt-8">
          <h2 className="mb-4 text-sm font-medium text-th-text">Add a motion to this group</h2>
          <AddMotionForm groupId={group.id} />
        </div>
      </div>
    </div>
  )
}
