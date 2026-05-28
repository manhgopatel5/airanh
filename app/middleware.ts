import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/onboarding']
const PUBLIC_API = ['/api/auth', '/api/user/create', '/api/user/logout']
const PUBLIC_FILE = /\.(.*)$/

// Cache 30s để giảm 90% request Firestore
const userCache = new Map<string, { data: any; expires: number }>()
const CACHE_TTL = 30 * 1000

async function getUserData(uid: string) {
  const cached = userCache.get(uid)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  const db = adminDb()
  const snap = await db.doc(`users/${uid}`).get()
  const data = snap.data()

  if (data) {
    userCache.set(uid, { data, expires: Date.now() + CACHE_TTL })
  }
  return data
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Bỏ qua static + public API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    PUBLIC_API.some(p => pathname.startsWith(p)) ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('__session')?.value
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // 2. Chưa login
  if (!token) {
    // Vào route cần auth → về /login
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Vào public route → cho qua
    return NextResponse.next()
  }

  // 3. Có token → verify + check onboarding
  try {
    const auth = adminAuth()
    const decoded = await auth.verifySessionCookie(token, true)
    const userData = await getUserData(decoded.uid)

    // User chưa có trong DB → về onboarding để tạo
    if (!userData) {
      if (pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      return NextResponse.next()
    }

    // Chưa onboard + không ở /onboarding → ép vào /onboarding
    if (userData.onboardingCompleted !== true && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Đã onboard + đang ở /onboarding → về home
    if (userData.onboardingCompleted === true && pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Đã login + vào /login, /signup → về home
    if (['/login', '/signup'].includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  } catch (err) {
    // Token sai/hết hạn → xóa cookie + về login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('__session')
    return response
  }
}

// Chạy Node.js runtime vì Firebase Admin không chạy Edge tốt
export const runtime = 'nodejs'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}