'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isActiveRoute, isHiddenRoute } from './navItems'

// Mobile bottom nav. SideNav handles md+ — this hides at md so the two
// don't double-up.
export function BottomNav({ pendingAnchor = false }: { pendingAnchor?: boolean }) {
  const pathname = usePathname()

  if (isHiddenRoute(pathname)) return null

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 z-40 px-4 md:hidden"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        transform: 'translate3d(0,0,0)',
      }}
    >
      <div className="floating-pill-nav pointer-events-auto mx-auto flex h-14 max-w-sm items-center justify-around rounded-full border border-th-border bg-th-surface px-2 shadow-lg">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActiveRoute(href, pathname)
          const isAnchors = href === '/anchors'
          // When a ceremony is pending and the user isn't already on the
          // Anchors tab, dim the other tabs slightly and pulse the Anchors
          // icon. Subtle — invitation, not demand (ADR 0007).
          const dimForPending = pendingAnchor && !isAnchors && !active
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-full flex-col items-center justify-center gap-1 rounded-lg px-4 transition-colors active:scale-95 active:bg-th-surface ${
                active ? 'text-th-text' : 'text-th-faint hover:text-th-muted'
              } ${dimForPending ? 'opacity-55' : ''}`}
            >
              <span
                className="relative"
                style={pendingAnchor && isAnchors ? { animation: 'nav-tide-pulse 2.4s ease-in-out infinite' } : undefined}
              >
                {icon}
                {pendingAnchor && isAnchors && !active && (
                  <span className="pointer-events-none absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-th-text" />
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
