'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  {
    href: '/dashboard',
    label: 'Today',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" />
        <path d="M9 21V12h6v9" stroke="currentColor" />
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
    href: '/log',
    label: 'Log',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth="1.75" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
        <path d="M7 8h10M7 12h7M7 16h5" stroke="currentColor" />
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

export function BottomNav() {
  const pathname = usePathname()

  if (HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-th-border bg-th-bg">
      <div className="mx-auto flex max-w-sm items-center justify-around px-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            || (href === '/dashboard' && (pathname === '/dashboard' || pathname.startsWith('/dashboard/')))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-3 transition-all active:scale-[0.97] ${
                active ? 'text-th-text' : 'text-th-faint hover:text-th-muted'
              }`}
            >
              {icon}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
