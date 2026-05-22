// Shared nav items + hide-on-route list, used by both BottomNav (mobile)
// and SideNav (desktop) so the routes / icons stay in sync.

import type { ReactNode } from 'react'

export type NavItem = {
  href: string
  label: string
  icon: ReactNode
}

export const NAV_ITEMS: NavItem[] = [
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

export const NAV_HIDE_ON = ['/login', '/signup', '/onboarding']

export function isHiddenRoute(pathname: string): boolean {
  return NAV_HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function isActiveRoute(href: string, pathname: string): boolean {
  if (pathname === href) return true
  if (href !== '/dashboard' && pathname.startsWith(href + '/')) return true
  if (href === '/dashboard' && pathname.startsWith('/dashboard/')) return true
  return false
}
