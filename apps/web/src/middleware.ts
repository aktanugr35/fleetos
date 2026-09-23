import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookies';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Access token is httpOnly and set by the API. On a split localhost setup
  // (web:3000 / api:3001) the cookie is not visible here — DashboardAuthGuard
  // verifies the session against /auth/me instead.
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (pathname === '/setup') {
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  if ((pathname === '/signup' || pathname === '/login') && token) {
    const redirect = request.nextUrl.searchParams.get('redirect');
    const dest =
      redirect && redirect.startsWith('/dashboard') ? redirect : '/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/signup', '/setup'],
};
