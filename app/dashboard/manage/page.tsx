import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteActivity } from '@/app/actions/activities'
import { AddDomainForm } from '../components/AddDomainForm'
import { SortableDomainList } from '../components/SortableDomainList'
import { AddActivityStandaloneForm } from './AddActivityStandaloneForm'
import { ToggleDomainsButton } from './ToggleDomainsButton'

export default async function ManagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('domains_enabled')
    .eq('user_id', user.id)
    .single()
  const domainsEnabled = settings?.domains_enabled ?? false

  if (domainsEnabled) {
    const { data: domains } = await supabase
      .from('domains')
      .select('*')
      .order('sort_order', { ascending: true })

    return (
      <div className="flex min-h-full flex-col items-center px-6 py-24">
        <div className="w-full max-w-sm">
          <Link href="/dashboard" className="mb-6 inline-block text-sm text-th-faint hover:text-th-secondary">
            ← Back
          </Link>
          <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Domains & activities</h1>

          {domains && domains.length > 0 ? (
            <div className="mb-8">
              <p className="mb-4 text-sm text-th-muted">
                Tap a domain to edit it and manage its activities.
              </p>
              <SortableDomainList domains={domains} />
            </div>
          ) : (
            <p className="mb-8 text-sm text-th-muted">No domains yet.</p>
          )}

          <div className="border-t border-th-border pt-8">
            <h2 className="mb-4 text-sm font-medium text-th-text">Add a domain</h2>
            <AddDomainForm />
          </div>

          <div className="mt-10 border-t border-th-border pt-6">
            <ToggleDomainsButton enabled={true} />
          </div>
        </div>
      </div>
    )
  }

  // Flat mode — domains off
  const { data: activities } = await supabase
    .from('activities')
    .select('id, name, default_points')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-24">
      <div className="w-full max-w-sm">
        <Link href="/dashboard" className="mb-6 inline-block text-sm text-th-faint hover:text-th-secondary">
          ← Back
        </Link>
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Activities</h1>

        {activities && activities.length > 0 ? (
          <div className="mb-8 flex flex-col gap-2">
            {activities.map(activity => {
              const deleteById = deleteActivity.bind(null, activity.id, null)
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm text-th-text">{activity.name}</p>
                    <p className="text-xs text-th-faint">{activity.default_points} pts</p>
                  </div>
                  <form action={deleteById}>
                    <button
                      type="submit"
                      className="text-xs text-th-faint hover:text-red-500 transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mb-8 text-sm text-th-muted">No activities yet.</p>
        )}

        <div className="border-t border-th-border pt-8">
          <h2 className="mb-4 text-sm font-medium text-th-text">Add an activity</h2>
          <AddActivityStandaloneForm />
        </div>

        <div className="mt-10 border-t border-th-border pt-6">
          <ToggleDomainsButton enabled={false} />
        </div>
      </div>
    </div>
  )
}
