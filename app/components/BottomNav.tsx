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
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round">
        <path d="M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9s3-3 4.5-3 3 1.5 4.5 1.5S22 6 22 6" stroke="currentColor" />
        <path d="M2 18c1.5-3 3-4.5 4.5-4.5S9 15 10.5 15s3-3 4.5-3 3 1.5 4.5 1.5S22 12 22 12" stroke="currentColor" />
      </svg>
    ),
  },
  {
    href: '/reflections',
    label: 'Reflections',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" stroke="currentColor" />
        <path d="M12 3a9 9 0 0 0 0 18" stroke="currentColor" fill="currentColor" fillOpacity="0.15" />
        <path d="M12 3v18" stroke="currentColor" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" stroke="currentColor" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" />
      </svg>
    ),
  },
]

const HIDE_ON = ['/login', '/signup', '/onboarding']

export function BottomNav({ pendingReflection = false }: { pendingReflection?: boolean }) {
  const pathname = usePathname()

  if (HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-th-border bg-th-bg">
      <div className="mx-auto flex max-w-sm items-center justify-around px-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            || (href === '/dashboard' && (pathname === '/dashboard' || pathname.startsWith('/dashboard/')))
          const isReflections = href === '/reflections'
          // When a ceremony is pending and the user isn't already on the
          // Reflections tab, dim the other tabs slightly and pulse the
          // Reflections icon. Subtle — invitation, not demand (ADR 0007).
          const dimForPending = pendingReflection && !isReflections && !active
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors active:scale-95 active:bg-th-surface ${
                active ? 'text-th-text' : 'text-th-faint hover:text-th-muted'
              } ${dimForPending ? 'opacity-55' : ''}`}
            >
              <span
                className="relative"
                style={pendingReflection && isReflections ? { animation: 'nav-tide-pulse 2.4s ease-in-out infinite' } : undefined}
              >
                {icon}
                {pendingReflection && isReflections && !active && (
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
