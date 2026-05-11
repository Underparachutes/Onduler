import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteActivity } from '@/app/actions/activities'
import { AddActivityForm } from './AddActivityForm'
import { EditDomainForm } from './EditDomainForm'

export default async function DomainPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!domain) notFound()

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('domain_id', domain.id)
    .order('created_at', { ascending: true })

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-24">
      <div className="w-full max-w-sm">
        <Link
          href="/dashboard"
          className="mb-6 inline-block text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ← Back
        </Link>

        <div className="mb-8">
          <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Edit domain
          </h2>
          <EditDomainForm domain={domain} />
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Activities
          </h2>
          {activities && activities.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activities.map(activity => {
                const deleteActivityById = deleteActivity.bind(null, activity.id, domain.id)
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
                  >
                    <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-50">
                      {activity.name}
                    </span>
                    <span className="text-xs text-zinc-400">{activity.default_points} pts</span>
                    <form action={deleteActivityById}>
                      <button
                        type="submit"
                        className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No activities yet.</p>
          )}
        </div>

        <div className="border-t border-zinc-100 pt-8 dark:border-zinc-800">
          <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Add an activity
          </h2>
          <AddActivityForm domainId={domain.id} />
        </div>
      </div>
    </div>
  )
}
