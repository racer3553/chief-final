import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Case-insensitive redirect for /install (testers often type INSTALL in caps)
  const lower = pathname.toLowerCase()
  if (pathname !== lower && (lower === '/install' || lower === '/setup' || lower === '/download')) {
    return NextResponse.redirect(new URL(lower, request.url))
  }
  // Friendly aliases that all map to the installer
  if (lower === '/setup' || lower === '/download' || lower === '/get' || lower === '/chief') {
    return NextResponse.redirect(new URL('/install', request.url))
  }

  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  // Include /install + alias paths so they get the case-insensitive redirect handling
  matcher: ['/dashboard/:path*', '/login', '/signup', '/install', '/INSTALL', '/Install', '/setup', '/SETUP', '/Setup', '/download', '/DOWNLOAD', '/Download', '/get', '/GET', '/Get', '/chief', '/CHIEF', '/Chief'],
}
