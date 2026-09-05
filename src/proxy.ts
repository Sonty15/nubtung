import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'nubtang_default_secret_key_change_me_in_production_32chars!'
);

const COOKIE_NAME = 'nubtang_session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public routes, webhooks, crons, and static assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/line/webhook') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon')
  ) {
    return NextResponse.next();
  }

  // 2. Check session token cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // If it's an API request (except webhooks), return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }
    // If it's a page request, redirect to /login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify JWT token signature and expiration
    await jwtVerify(token, SECRET_KEY);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
