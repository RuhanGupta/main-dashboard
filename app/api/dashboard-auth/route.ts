import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { SignJWT } from 'jose';

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password: string };

  const enteredHash = createHash('sha256').update(password ?? '').digest('hex');
  const storedHash = process.env.DASHBOARD_PASSWORD_HASH ?? '';

  const a = Buffer.from(enteredHash);
  const b = Buffer.from(storedHash);

  const match =
    a.length === b.length &&
    timingSafeEqual(a, b);

  if (!match) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const secret = new TextEncoder().encode(process.env.DASHBOARD_SECRET!);
  const token = await new SignJWT({ sub: process.env.DASHBOARD_USER_EMAIL ?? 'ruhangupta01@gmail.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(secret);

  const res = NextResponse.json({ ok: true });

  // Secure auth token — httpOnly so JS can't steal it
  res.cookies.set('dashboard_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TEN_YEARS,
    path: '/',
  });

  // Non-httpOnly indicator so the sidebar UI can detect password-auth sessions
  res.cookies.set('dashboard_auth', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TEN_YEARS,
    path: '/',
  });

  return res;
}

// Sign-out: clear both cookies
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('dashboard_token', '', { maxAge: 0, path: '/' });
  res.cookies.set('dashboard_auth', '', { maxAge: 0, path: '/' });
  return res;
}
