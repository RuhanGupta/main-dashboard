import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { SignJWT } from 'jose';
import {
  checkRateLimit,
  getClientKey,
  readJsonBody,
  tooManyRequests,
  withRouteErrorHandling,
} from '@/lib/api-helpers';

const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Password guessing is the only way into this app, so throttle it hard.
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export const POST = withRouteErrorHandling(async (req: NextRequest) => {
  const storedHash = process.env.DASHBOARD_PASSWORD_HASH;
  const secretValue = process.env.DASHBOARD_SECRET;

  // Fail closed: without both env vars configured there is no valid password,
  // so never fall back to comparing against an empty string.
  if (!storedHash || !secretValue) {
    console.error('[dashboard-auth] DASHBOARD_PASSWORD_HASH or DASHBOARD_SECRET is not set');
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 500 });
  }

  if (!checkRateLimit(`dashboard-auth:${getClientKey(req)}`, MAX_ATTEMPTS, ATTEMPT_WINDOW_MS)) {
    return tooManyRequests();
  }

  const parsed = await readJsonBody<{ password?: unknown }>(req);
  if (parsed.response) return parsed.response;

  const { password } = parsed.body;
  if (typeof password !== 'string' || password.length === 0 || password.length > 1024) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const enteredHash = createHash('sha256').update(password).digest('hex');

  // Both are fixed-length sha256 hex digests, so timingSafeEqual is always
  // reachable as long as the configured hash is well-formed.
  const a = Buffer.from(enteredHash);
  const b = Buffer.from(storedHash.trim());
  const match = a.length === b.length && timingSafeEqual(a, b);

  if (!match) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const secret = new TextEncoder().encode(secretValue);
  const token = await new SignJWT({ sub: process.env.DASHBOARD_USER_EMAIL ?? 'ruhangupta01@gmail.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret);

  const res = NextResponse.json({ ok: true });

  // Secure auth token — httpOnly so JS can't steal it
  res.cookies.set('dashboard_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });

  // Non-httpOnly indicator so the sidebar UI can detect password-auth sessions
  res.cookies.set('dashboard_auth', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });

  return res;
});

// Sign-out: clear both cookies
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('dashboard_token', '', { maxAge: 0, path: '/' });
  res.cookies.set('dashboard_auth', '', { maxAge: 0, path: '/' });
  return res;
}
