import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/terms', '/privacy', '/onboarding']
const PUBLIC_API = ['/api/auth', '/api/user/create', '/api/user/logout', '/api/health']

// CSP cho Vercel Preview + Firebase Auth
const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app https://apis.google.com https://www.gstatic.com https://www.google.com https://*.firebaseio.com https://*.firebaseapp.com https://*.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
  frame-src 'self' https://*.firebaseapp.com https://accounts.google.com;
`.replace(/\s{2,}/g, ' ').trim()

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Bỏ qua static + public API + file
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    PUBLIC_API.some(p => pathname.startsWith(p))
  ) {
    const res = NextResponse.next()
    res.headers.set('Content-Security-Policy', CSP_HEADER)
    return res
  }

  const token = request.cookies.get('__session')?.value
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // 2. Chưa login
  if (!token) {
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const res = NextResponse.redirect(loginUrl)
      res.headers.set('Content-Security-Policy', CSP_HEADER)
      return res
    }
    const res = NextResponse.next()
    res.headers.set('Content-Security-Policy', CSP_HEADER)
    return res
  }

  // 3. Có token -> chỉ verify JWT, không query DB
  try {
    await adminAuth().verifySessionCookie(token, false)

    // Đã login mà vào /login, /register -> về home
    if (['/login', '/register'].includes(pathname)) {
      const res = NextResponse.redirect(new URL('/', request.url))
      res.headers.set('Content-Security-Policy', CSP_HEADER)
      return res
    }

    const res = NextResponse.next()
    res.headers.set('Content-Security-Policy', CSP_HEADER)
    return res
  } catch (err) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('__session')
    res.headers.set('Content-Security-Policy', CSP_HEADER)
    return res
  }
}

// Firebase Admin không chạy được trên Edge runtime
export const runtime = 'nodejs'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}