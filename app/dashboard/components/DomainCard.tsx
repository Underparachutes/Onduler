'use client'

import Link from 'next/link'
import { deleteDomain } from '@/app/actions/domains'

type Domain = {
  id: string
  name: string
  weight: number
  color: string
}

export function DomainCard({ domain }: { domain: Domain }) {
  const deleteDomainById = deleteDomain.bind(null, domain.id)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3">
      <div
        className="h-3 w-3 flex-none rounded-full"
        style={{ backgroundColor: domain.color }}
      />
      <Link
        href={`/dashboard/domains/${domain.id}`}
        className="flex-1 text-sm font-medium text-th-text hover:underline"
      >
        {domain.name}
      </Link>
      <span className="text-xs text-th-faint">weight {domain.weight}</span>
      <form action={deleteDomainById}>
        <button
          type="submit"
          className="text-xs text-th-faint hover:text-red-500 transition-colors"
        >
          Delete
        </button>
      </form>
    </div>
  )
}
