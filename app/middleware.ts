import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Init Admin SDK 1 lần
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

// 1. Routes không cần check auth
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password']
const PUBLIC_FILE = /\.(.*)$/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 2. Bỏ qua file static, _next, api
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('__session')?.value
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // 3. Chưa login mà vào route private -> /login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Có login -> verify + check onboarding
  if (token) {
    try {
      const decoded = await auth.verifySessionCookie(token, true);
      const userSnap = await db.doc(`users/${decoded.uid}`).get();
      const userData = userSnap.data();

      // Chưa onboard mà vào route khác -> đá về /onboarding
      if (!userData?.onboardingCompleted && pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }

      // Onboard rồi mà vào /onboarding -> đá về home
      if (userData?.onboardingCompleted && pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Có login mà vào /login -> đá về home
      if (isPublicRoute) {
        return NextResponse.redirect(new URL('/', request.url))
      }

    } catch (err) {
      // Token sai/hết hạn -> xóa cookie + về /login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('__session');
      return response;
    }
  }

  return NextResponse.next()
}

// 5. Matcher chuẩn
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}