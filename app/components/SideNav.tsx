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
    <nav
      className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col gap-1 border-r border-th-border bg-th-bg px-3 desktop:flex"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 0.75rem)',
      }}
    >
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
                ? 'bg-th-surface'
                : 'text-th-muted hover:bg-th-surface hover:text-th-text'
            } ${dimForPending ? 'opacity-55' : ''}`}
          >
            <span
              className="relative shrink-0"
              style={{
                ...(active ? { color: 'var(--brand)' } : null),
                ...(pendingAnchor && isAnchors ? { animation: 'nav-tide-pulse 2.4s ease-in-out infinite' } : null),
              }}
            >
              {icon}
              {pendingAnchor && isAnchors && !active && (
                <span className="pointer-events-none absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-th-text" />
              )}
            </span>
            <span className={`font-medium ${active ? 'brand-text' : ''}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
