import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

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
  '/api/send-verification' // Đổi từ /api/resend-verification
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

  // 3. Có token -> VERIFY JWT + CHECK EMAIL VERIFIED
  try {
    const decodedToken = await adminAuth().verifySessionCookie(token, false)

    // Đã login mà vào /login, /register -> về home
    if (['/login', '/register'].includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Chặn chưa xác thực email - chỉ áp dụng cho route không public
    if (!decodedToken.email_verified && !isPublicRoute) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }
    
    return NextResponse.next()
  } catch (err) {
    // Token sai/hết hạn -> xóa cookie + về login
    // Nhưng nếu đang ở /verify-success thì cho qua để auto login bằng customToken
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