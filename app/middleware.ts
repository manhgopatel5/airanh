import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/verify-success',
  '/verify-failed',
  '/terms',
  '/privacy',
  '/onboarding'
]

const PUBLIC_API = [
  '/api/auth',
  '/api/user/create',
  '/api/user/logout',
  '/api/health',
  '/api/verify-email',
  '/api/send-verification'
]

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

  // 3. Có token -> VERIFY JWT + CHECK FIRESTORE
  try {
    const decodedToken = await adminAuth().verifySessionCookie(token, false)

    // Đã login mà vào /login, /register -> về home
    if (['/login', '/register'].includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // FIX: Check Firestore, nhưng phải guard doc.exists
    if (!isPublicRoute) {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();

      // FIX: Nếu doc chưa có → cho qua, để /onboarding tạo
      if (!userDoc.exists) {
        if (pathname!== '/onboarding') {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
        return NextResponse.next()
      }

      const userData = userDoc.data();

      // FIX: Check undefined, không dùng!userData?.emailVerified
      const isVerified = userData?.emailVerified === true;
      const hasOnboarded = userData?.onboarded === true;

      // Chưa verify + không ở /verify-email → về /verify-email
      if (!isVerified && pathname!== '/verify-email') {
        return NextResponse.redirect(new URL('/verify-email', request.url))
      }

      // Đã verify + chưa onboard + không ở /onboarding → về /onboarding
      if (isVerified &&!hasOnboarded && pathname!== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Đã onboard + đang ở /onboarding → về /
      if (hasOnboarded && pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return NextResponse.next()
  } catch (err) {
    console.error('[Middleware] Session error:', err);

    if (pathname.startsWith('/verify-success')) {
      return NextResponse.next()
    }

    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('__session')
    return response
  }
}

export const runtime = 'nodejs'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}