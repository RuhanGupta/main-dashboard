import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

/**
 * Authentication is a single password, exchanged for a signed cookie by
 * /api/dashboard-auth. There is no OAuth provider and no third-party session.
 */

export type CurrentUser = {
  id: string;
};

/** The account every document is keyed to. */
function dashboardUserId(): string {
  return process.env.DASHBOARD_USER_EMAIL ?? 'ruhangupta01@gmail.com';
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secretValue = process.env.DASHBOARD_SECRET;
  if (!secretValue) {
    console.error('[auth] DASHBOARD_SECRET is not set — refusing to authenticate');
    return null;
  }

  try {
    const jar = await cookies();
    const token = jar.get('dashboard_token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(secretValue);
    await jwtVerify(token, secret);
    return { id: dashboardUserId() };
  } catch {
    return null;
  }
}
