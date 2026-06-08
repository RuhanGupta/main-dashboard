import { NextResponse } from 'next/server';
import { getCurrentUser, type CurrentUser } from '@/lib/auth';

export type AuthResult =
  | { user: CurrentUser; response?: never }
  | { user?: never; response: NextResponse };

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

export function googleSyncErrorResponse(error: unknown) {
  console.error('[google-tasks] sync failed:', error);
  return NextResponse.json(
    { error: 'Google Tasks sync failed', details: getErrorMessage(error) },
    { status: 502 }
  );
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
    googleTaskId?: unknown;
  },
>(body: T): void {
  delete body._id;
  delete body.createdAt;
  delete body.updatedAt;
  delete body.userId;
  delete body.googleTaskId;
}
