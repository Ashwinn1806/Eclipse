import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const dynamicNextAuthUrl =
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

// Gracefully populate environment variables if missing so NextAuth resolves production host properly
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = dynamicNextAuthUrl;
}
if (!process.env.AUTH_URL) {
  process.env.AUTH_URL = dynamicNextAuthUrl;
}

if (!authSecret) {
  console.warn(
    'WARNING: NEXTAUTH_SECRET / AUTH_SECRET is missing from environment variables. Using fallback secret to prevent runtime configuration crash.'
  );
}

if (process.env.NODE_ENV === 'production') {
  if (!googleClientId) {
    console.warn('WARNING: AUTH_GOOGLE_ID (or GOOGLE_CLIENT_ID) is missing from environment variables.');
  }
  if (!googleClientSecret) {
    console.warn('WARNING: AUTH_GOOGLE_SECRET (or GOOGLE_CLIENT_SECRET) is missing from environment variables.');
  }
}

const nextAuthInstance = NextAuth({
  trustHost: true,
  secret: authSecret || 'fallback-secret-for-production-warning-only',
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: googleClientId || 'mock-google-id',
      clientSecret: googleClientSecret || 'mock-google-secret',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return url;
      }
      try {
        if (new URL(url).origin === baseUrl) {
          return url;
        }
      } catch {
        // Fallback for invalid absolute URLs
      }
      return baseUrl || '/';
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/',
  },
});

export const { handlers, signIn, signOut } = nextAuthInstance;

export const auth = async () => {
  try {
    const session = await nextAuthInstance.auth();
    if (session?.user) {
      return session;
    }
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw err;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const bypassCookie = cookieStore.get('eclipse_dev_bypass')?.value;
      if (bypassCookie === 'false') {
        return null;
      }
    } catch {
      // In non-HTTP context, default to mock session
    }

    return {
      user: {
        id: 'local-dev-user',
        name: 'Ashwin Verma',
        email: 'ashwin@local.dev',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return null;
};
