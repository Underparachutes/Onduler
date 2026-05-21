'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  {
    href: '/dashboard',
    label: 'Motions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" />
        <path d="M8 12.5l3 3 5-6" stroke="currentColor" />
      </svg>
    ),
  },
  {
    href: '/swells',
    label: 'Swells',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" stroke="currentColor" />
        <path d="M12 5 L14.2 11.6 L9.8 11.6 Z" fill="currentColor" stroke="currentColor" />
        <path d="M12 19 L14.2 12.4 L9.8 12.4 Z" fill="none" stroke="currentColor" />
      </svg>
    ),
  },
  {
    href: '/anchors',
    label: 'Anchors',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="4.5" r="1.9" stroke="currentColor" />
        <path d="M12 6.4 V 20" stroke="currentColor" />
        <path d="M8.6 10.5 H 15.4" stroke="currentColor" />
        <path d="M4.6 13.5 C 4.6 17.6, 8.2 20, 12 20 C 15.8 20, 19.4 17.6, 19.4 13.5" stroke="currentColor" />
        <path d="M4.6 13.5 L 6.6 14.7 M 4.6 13.5 L 4.6 15.7" stroke="currentColor" />
        <path d="M19.4 13.5 L 17.4 14.7 M 19.4 13.5 L 19.4 15.7" stroke="currentColor" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h9 M17 8h4" stroke="currentColor" />
        <circle cx="14.5" cy="8" r="2.25" fill="var(--color-th-bg)" stroke="currentColor" />
        <path d="M3 16h4 M12 16h9" stroke="currentColor" />
        <circle cx="9.5" cy="16" r="2.25" fill="var(--color-th-bg)" stroke="currentColor" />
      </svg>
    ),
  },
]

const HIDE_ON = ['/login', '/signup', '/onboarding']

export function BottomNav({ pendingAnchor = false }: { pendingAnchor?: boolean }) {
  const pathname = usePathname()

  if (HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-th-border bg-th-bg">
      <div className="mx-auto flex h-14 max-w-sm items-center justify-around px-2">
        {ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            || (href === '/dashboard' && (pathname === '/dashboard' || pathname.startsWith('/dashboard/')))
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
      <div aria-hidden style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  )
}
