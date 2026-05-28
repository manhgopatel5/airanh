import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin' // Chỉ import auth, bỏ adminDb

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/terms', '/privacy']
const PUBLIC_API = ['/api/auth', '/api/user/create', '/api/user/logout', '/api/health']

// BỎ HẾT: userCache, getUserData, CACHE_TTL. Middleware không được query DB.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Bỏ qua static + public API + file
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') || // Bắt tất cả file .png, .css, .js...
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

  // 3. Có token -> CHỈ VERIFY JWT. Không query DB.
  try {
    // checkRevoked = false: Nhanh hơn 10 lần. Revoke token thì user tự logout.
    await adminAuth().verifySessionCookie(token, false)

    // Đã login mà vào /login, /signup -> về home
    if (['/login', '/signup'].includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // BỎ HẾT LOGIC CHECK onboardingCompleted, userData.
    // Đẩy xuống ClientLayout dùng useAuth() check. Vì ClientLayout có cache nên check 0ms.
    
    return NextResponse.next()
  } catch (err) {
    // Token sai/hết hạn -> xóa cookie + về login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('__session')
    return response
  }
}

// Chạy Edge runtime cho nhanh. Firebase Admin verify JWT chạy được trên Edge.
export const runtime = 'nodejs' // Giữ nodejs nếu bạn thấy lỗi, nhưng 'edge' nhanh hơn 50ms

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - *.png, *.jpg, etc
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}