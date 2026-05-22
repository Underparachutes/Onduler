'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isActiveRoute, isHiddenRoute } from './navItems'

// Desktop sidebar — visible at md+. Mirrors BottomNav's routes / icons /
// pending-anchor tide-pulse, but rendered vertically as a left rail.
// The body is flex-row at md+ so this sits to the left of main content.
export function SideNav({ pendingAnchor = false }: { pendingAnchor?: boolean }) {
  const pathname = usePathname()
  if (isHiddenRoute(pathname)) return null

  return (
    <nav className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col gap-1 border-r border-th-border bg-th-bg px-3 py-6 md:flex">
      <p className="mb-4 px-3 text-xs font-medium uppercase tracking-widest text-th-muted">
        Onduler
      </p>
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = isActiveRoute(href, pathname)
        const isAnchors = href === '/anchors'
        const dimForPending = pendingAnchor && !isAnchors && !active
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors active:scale-[0.98] ${
              active
                ? 'bg-th-surface text-th-text'
                : 'text-th-muted hover:bg-th-surface hover:text-th-text'
            } ${dimForPending ? 'opacity-55' : ''}`}
          >
            <span
              className="relative shrink-0"
              style={pendingAnchor && isAnchors ? { animation: 'nav-tide-pulse 2.4s ease-in-out infinite' } : undefined}
            >
              {icon}
              {pendingAnchor && isAnchors && !active && (
                <span className="pointer-events-none absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-th-text" />
              )}
            </span>
            <span className="font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
