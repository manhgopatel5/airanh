import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'; // <- Dùng file bạn có sẵn

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']
const PUBLIC_FILE = /\.(.*)$/

// Cache 30s để giảm 90% request Firestore
const userCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30 * 1000;

async function getUserData(uid: string) {
  const cached = userCache.get(uid);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const db = adminDb();
  const snap = await db.doc(`users/${uid}`).get();
  const data = snap.data();

  userCache.set(uid, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Bỏ qua static/api
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

  // 2. Chưa login -> /login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Có token -> verify + check onboarding
  if (token) {
    try {
      const auth = adminAuth();
      const decoded = await auth.verifySessionCookie(token, true);
      const userData = await getUserData(decoded.uid);

      // Chưa onboard -> ép vào /onboarding
      if (!userData?.onboardingCompleted && pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }

      // Onboard rồi mà vào /onboarding -> về home
      if (userData?.onboardingCompleted && pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Login rồi mà vào public route -> về home
      if (isPublicRoute) {
        return NextResponse.redirect(new URL('/', request.url))
      }

    } catch (err) {
      // Token sai/hết hạn -> xóa cookie + về login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('__session');
      return response;
    }
  }

  return NextResponse.next()
}

// Chạy Node.js runtime vì Firebase Admin không chạy Edge tốt
export const runtime = 'nodejs';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}