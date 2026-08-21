import { NextResponse } from 'next/server';
import { getCurrentUser, type CurrentUser } from '@/lib/auth';

export type AuthResult =
  | { user: CurrentUser; response?: never }
  | { user?: never; response: NextResponse };

/**
 * Parse a JSON request body without letting a malformed payload throw a 500.
 * Returns a `response` (400) instead when the body isn't a JSON object.
 */
export async function readJsonBody<T>(
  req: { json(): Promise<unknown> }
): Promise<{ body: T; response?: never } | { body?: never; response: NextResponse }> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return { response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { response: NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 }) };
  }

  return { body: parsed as T };
}

/**
 * Wrap a route handler so an unexpected throw becomes a 500 JSON response
 * instead of an unhandled rejection that leaks a stack trace to the client.
 */
export function withRouteErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('[api] unhandled route error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

type RateLimitBucket = { count: number; resetAt: number };

const rateLimitBuckets = new Map<string, RateLimitBucket>();

/**
 * Fixed-window in-memory rate limiter, keyed by caller-supplied identity.
 * Single-instance only — enough to stop credential/token brute-forcing here,
 * but it resets on redeploy and isn't shared across serverless instances.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Best-effort client IP for rate-limit keys, from the usual proxy headers. */
export function getClientKey(req: { headers: Headers }): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export function tooManyRequests() {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}

export async function requireCurrentUser(): Promise<AuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: 'Not signed in' }, { status: 401 }),
    };
  }

  return { user };
}

export function emptyListResponse() {
  return NextResponse.json([]);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function normalizeDateInput<T>(value: T): T | null {
  return value === '' ? null : value;
}

export function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function toIdString(value: string | { toString(): string } | null | undefined): string | undefined {
  return value?.toString();
}

export function removeClientManagedFields<
  T extends {
    _id?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    userId?: unknown;
  },
>(body: T): void {
  delete body._id;
  delete body.createdAt;
  delete body.updatedAt;
  delete body.userId;
}
