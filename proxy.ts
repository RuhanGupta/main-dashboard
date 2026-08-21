import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Paths that never require auth
const PUBLIC_PREFIXES = [
  '/login',
  '/counselor/',
  '/api/counselor/',    // Public counselor read endpoint
  '/api/dashboard-auth', // Password login endpoint (no auth needed to call it)
  '/_next/',
  '/favicon',
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // ── 1. Check the password cookie (verified JWT) ───────────────────────────
  const dashToken = req.cookies.get('dashboard_token')?.value;
  if (dashToken) {
    try {
      const secret = new TextEncoder().encode(process.env.DASHBOARD_SECRET!);
      await jwtVerify(dashToken, secret);
      return NextResponse.next();
    } catch {
      // Invalid / tampered token — fall through to next check
    }
  }

  // ── 2. Not authenticated ───────────────────────────────────────────────────
  // API routes return 401 themselves — don't redirect them.
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // Redirect everything else (page routes) to /login
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
