import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get('isLoggedIn');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiPage = request.nextUrl.pathname.startsWith('/api');

  // Allow API and Webhook through without auth
  if (isApiPage) {
    return NextResponse.next();
  }

  // Redirect to login if not logged in and trying to access protected pages
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to flows if already logged in and trying to access login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/flows', request.url));
  }

  return NextResponse.next();
}

// Only run middleware on these paths
export const config = {
  matcher: ['/', '/flows', '/login', '/analytics', '/settings'],
};
