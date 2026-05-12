import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AddDomainForm } from '../components/AddDomainForm'
import { SortableDomainList } from '../components/SortableDomainList'

export default async function ManagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-24">
      <div className="w-full max-w-sm">
        <Link
          href="/dashboard"
          className="mb-6 inline-block text-sm text-th-faint hover:text-th-secondary"
        >
          ← Back
        </Link>

        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">
          Domains & activities
        </h1>

        {domains && domains.length > 0 ? (
          <div className="mb-8">
            <p className="mb-4 text-sm text-th-muted">
              Tap a domain name to edit it and manage its activities.
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
      </div>
    </div>
  )
}
