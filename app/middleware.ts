import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

const PUBLIC_ROUTES = [
  '/login', 
  '/register', 
  '/forgot-password', 
  '/reset-password', 
  '/verify-email',
  '/verify-success',   // Bắt buộc thêm
  '/verify-failed',    // Bắt buộc thêm
  '/terms', 
  '/privacy', 
  '/onboarding'
]

const PUBLIC_API = [
  '/api/auth', 
  '/api/user/create', 
  '/api/user/logout', 
  '/api/health',
  '/api/verify-email',        // Thêm để link verify chạy được
  '/api/resend-verification'  // Thêm để gửi lại mail
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

  // 3. Có token -> VERIFY JWT
  try {
    const decodedToken = await adminAuth().verifySessionCookie(token, false)

    // Đã login mà vào /login, /register -> về home
    if (['/login', '/register'].includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Quan trọng: Không check onboarding ở đây
    // Để /verify-success tự xử lý redirect sau khi login
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

export const runtime = 'nodejs' // Firebase Admin bắt buộc nodejs

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}