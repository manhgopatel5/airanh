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

    // FIX: Cho phép /admin bỏ qua check emailVerified + onboarded
    const isAdminRoute = pathname.startsWith('/admin')

    // Check emailVerified + onboarded từ Firestore
    if (!isPublicRoute && !isAdminRoute) {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      // Chưa verify email trong DB → về /verify-email
      if (!userData?.emailVerified && pathname !== '/verify-email') {
        return NextResponse.redirect(new URL('/verify-email', request.url))
      }
      
      // Đã verify + chưa onboard → về /onboarding
      const hasOnboarded =
        userData?.onboarded === true || userData?.onboardingCompleted === true;
      if (userData?.emailVerified && !hasOnboarded && pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Đã onboard + đang ở /onboarding → về /
      if (hasOnboarded && pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    
    return NextResponse.next()
  } catch (err) {
    // Token sai/hết hạn -> xóa cookie + về login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('__session')
    return response
  }
}

export const runtime = 'nodejs'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico|txt|xml|woff|woff2|ttf|eot)$).*)',
  ],
}