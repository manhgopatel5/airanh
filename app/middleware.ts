import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 1. Các route không cần check auth
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

  // 3. Lấy token từ cookie. Firebase Auth web thường lưu tên __session hoặc bạn tự set
  const token = request.cookies.get('__session')?.value || 
                request.cookies.get('firebase-auth-token')?.value

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // 4. Chưa login mà vào route private -> đá về /login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname) // Để login xong back lại
    return NextResponse.redirect(loginUrl)
  }

  // 5. Có login rồi mà vào /login -> đá về home
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// 6. Chỉ chạy middleware cho các route này, bỏ qua static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}