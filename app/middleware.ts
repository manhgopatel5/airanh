import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/terms', '/privacy', '/onboarding']
const PUBLIC_API = ['/api/auth', '/api/user/create', '/api/user/logout', '/api/health']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Bỏ qua static + public API + file
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    PUBLIC_API.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('__session')?.value
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // 2. Chưa login
  if (!token) {
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // 3. Có token -> chỉ verify JWT, không query DB
  try {
    await adminAuth().verifySessionCookie(token, false)

    // Đã login mà vào /login, /register -> về home
    // Fix: dùng /register thay vì /signup
    if (['/login', '/register'].includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Check onboardingCompleted đẩy xuống client
    // ClientLayout dùng useAuth() check 0ms nhờ cache
    return NextResponse.next()
  } catch (err) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('__session')
    return response
  }
}

// Firebase Admin không chạy được trên Edge runtime
export const runtime = 'nodejs'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}