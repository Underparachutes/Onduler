import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/log', '/wave']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Optimistic check — read cookie directly, no network call.
  // Real verification happens in each server component via createClient().auth.getUser().
  const hasSession = request.cookies.getAll().some((c) => c.name.includes('-auth-token'))

  if (protectedRoutes.some((r) => path === r || path.startsWith(r + '/')) && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
