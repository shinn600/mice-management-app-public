import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isPublic =
        pathname.startsWith('/login') ||
        pathname.startsWith('/setup') ||
        pathname.startsWith('/api/auth') ||
        pathname === '/api/users';
      if (!isPublic && !isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.uid = (user as any).id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        // ユーザーIDをセッションへ伝播する。表示名(User.name)は一意ではないため、
        // 本人確認を伴う書き込み（担当者の自己ON/OFF等）では必ずIDで判定する。
        // token.uid は本変更以降に発行されたトークンのみ持つため、既存セッション用に
        // NextAuthが既定で入れる token.sub（＝ログイン時のユーザーID）へフォールバックする。
        (session.user as any).id = token.uid ?? token.sub;
      }
      return session;
    },
  },
  providers: [],
  session: { strategy: 'jwt' },
  trustHost: true,
};
