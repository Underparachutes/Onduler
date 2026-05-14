import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/log', '/wave', '/onboarding', '/settings', '/swells']

export async function proxy(request: NextRequest) {
  let proxyResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          proxyResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            proxyResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must be called before any redirect logic
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = protectedRoutes.some(r => path === r || path.startsWith(r + '/'))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return proxyResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
