import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  trustHost: true, // required when behind Cloudflare Tunnel / reverse proxy
  debug: process.env.NEXTAUTH_DEBUG === "1",
  logger: {
    error(code, metadata) {
      console.error("[NextAuth]", code, metadata);
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "kiosk",
      name: "Kiosk (tablet)",
      credentials: {
        token: { label: "Kiosk token", type: "password" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token || token !== process.env.KIOSK_TOKEN) {
          return null;
        }
        const user = await prisma.user.findFirst({
          where: { kioskToken: token },
        });
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // #region agent log
      const returnUrl = url.startsWith("/") ? `${baseUrl}${url}` : (new URL(url).origin === baseUrl ? url : baseUrl + "/dashboard");
      const payload = { hypothesisId: "H4", location: "lib/auth.ts:redirect", message: "redirect callback", data: { url, baseUrl, returnUrl }, timestamp: Date.now() };
      fetch("http://127.0.0.1:7242/ingest/6192d96a-a422-4919-bc86-ce84fa9cdc63", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
      console.log("[DEBUG]", JSON.stringify(payload));
      // #endregion
      return returnUrl;
    },
    async session({ session, user }) {
      // #region agent log
      const userId = user?.id ?? (session?.user as { id?: string } | undefined)?.id;
      const payload = { hypothesisId: "H1,H5", location: "lib/auth.ts:session", message: "session callback after sign-in", data: { hasSession: !!session, hasUser: !!user, userId: userId ?? null }, timestamp: Date.now() };
      fetch("http://127.0.0.1:7242/ingest/6192d96a-a422-4919-bc86-ce84fa9cdc63", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
      console.log("[DEBUG]", JSON.stringify(payload));
      // #endregion
      if (session.user) {
        session.user.id = user?.id ?? (session.user as { id?: string }).id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
} as NextAuthOptions;
