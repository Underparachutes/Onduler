'use client'

import Link from 'next/link'
import { deleteGroup } from '@/app/actions/groups'

type Group = {
  id: string
  name: string
  color: string
}

export function GroupCard({ group }: { group: Group }) {
  const deleteGroupById = deleteGroup.bind(null, group.id)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3">
      <div
        className="h-3 w-3 flex-none rounded-full"
        style={{ backgroundColor: group.color }}
      />
      <Link
        href={`/dashboard/groups/${group.id}`}
        className="flex-1 text-sm font-medium text-th-text hover:underline"
      >
        {group.name}
      </Link>
      <form action={deleteGroupById}>
        <button
          type="submit"
          className="text-xs text-th-faint transition-colors hover:text-red-500"
        >
          Delete
        </button>
      </form>
    </div>
  )
}
