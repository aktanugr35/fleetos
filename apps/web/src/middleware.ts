import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/setup') {
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  // Do not treat the httpOnly access cookie as a live session. DashboardAuthGuard
  // calls /auth/me; bouncing /login → /dashboard on cookie presence alone loops
  // the user on "Verifying session…" when that cookie is expired or invalid.
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/signup', '/setup'],
};
