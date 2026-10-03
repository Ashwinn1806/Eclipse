import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (process.env.NODE_ENV === 'production') {
  if (!googleClientId) {
    console.error('CRITICAL: AUTH_GOOGLE_ID (or GOOGLE_CLIENT_ID) is missing from environment variables.');
  }
  if (!googleClientSecret) {
    console.error('CRITICAL: AUTH_GOOGLE_SECRET (or GOOGLE_CLIENT_SECRET) is missing from environment variables.');
  }
  if (!authSecret) {
    console.error('CRITICAL: AUTH_SECRET (or NEXTAUTH_SECRET) is missing from environment variables.');
  }
}

const nextAuthInstance = NextAuth({
  trustHost: true,
  secret: authSecret,
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
