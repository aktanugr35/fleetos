import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookies';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname === '/setup') {
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  if (pathname === '/signup') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/login') {
    if (token) {
      const redirect = request.nextUrl.searchParams.get('redirect');
      const dest =
        redirect && redirect.startsWith('/dashboard') ? redirect : '/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/signup', '/setup'],
};
