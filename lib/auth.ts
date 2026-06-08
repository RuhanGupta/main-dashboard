import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/tasks',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist tokens on first sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // Refresh token if expired
      if (token.expiresAt && Date.now() / 1000 > (token.expiresAt as number) - 60) {
        try {
          const { OAuth2Client } = await import('google-auth-library');
          const client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );
          client.setCredentials({ refresh_token: token.refreshToken as string });
          const { credentials } = await client.refreshAccessToken();
          token.accessToken = credentials.access_token;
          token.expiresAt = credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : undefined;
        } catch (err) {
          console.error('Token refresh error:', err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = typeof token.accessToken === 'string' ? token.accessToken : undefined;
      if (session.user) {
        // Use email as the stable userId — token.sub is a random UUID in NextAuth v5
        // beta JWT mode that changes each session, making it unusable as a DB key.
        session.user.id = session.user.email ?? token.sub ?? undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export type CurrentUser = {
  id: string;
  accessToken?: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  // Email is the stable identifier — always prefer it over session.user.id
  const id = session?.user?.email ?? session?.user?.id ?? undefined;
  const accessToken = session?.accessToken;

  if (!id) return null;

  return {
    id,
    accessToken,
  };
}
