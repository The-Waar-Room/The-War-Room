import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getAdminRole } from "@/lib/firestore";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      const role = await getAdminRole(user.email);
      return !!role;
    },
    async jwt({ token }) {
      token.role = await getAdminRole(token.email as string | undefined);
      return token;
    },
    async session({ session, token }) {
      session.user.role =
        (token.role as "owner" | "admin" | "viewer" | null) || null;
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
