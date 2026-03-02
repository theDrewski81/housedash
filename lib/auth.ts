import { NextAuthOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db/prisma";
import { getAppConfig } from "./app-config";
import type { UserRole, UserStatus } from "@prisma/client";

const ACCOUNT_CREATION_DISABLED_ERROR = "Account creation is disabled";

function parseNameToFirstLast(name: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!name?.trim()) return { firstName: null, lastName: null };
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? null;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return { firstName, lastName };
}

const baseAdapter = PrismaAdapter(prisma);

export const authOptions = {
  adapter: {
    ...baseAdapter,
    async getUserByEmail(email: string) {
      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:getUserByEmail:entry",
          message: "getUserByEmail called",
          data: { email },
          timestamp: Date.now(),
          hypothesisId: "H3,H4",
        }),
      }).catch(() => {});
      // #endregion
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:getUserByEmail:exit",
          message: "getUserByEmail result",
          data: { email, userFound: !!user },
          timestamp: Date.now(),
          hypothesisId: "H3,H4",
        }),
      }).catch(() => {});
      // #endregion
      return user;
    },
    async createUser(data: Omit<AdapterUser, "id">) {
      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:createUser:entry",
          message: "createUser called",
          data: { email: data.email },
          timestamp: Date.now(),
          hypothesisId: "H3,H5",
        }),
      }).catch(() => {});
      // #endregion
      const config = await getAppConfig();
      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:createUser:config",
          message: "createUser config",
          data: { allowAccountCreation: config.allowAccountCreation },
          timestamp: Date.now(),
          hypothesisId: "H1,H5",
        }),
      }).catch(() => {});
      // #endregion
      const userCount = await prisma.user.count();
      const { firstName, lastName } = parseNameToFirstLast(data.name ?? undefined);

      if (userCount === 0) {
        // #region agent log
        fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
          body: JSON.stringify({
            sessionId: "da6607",
            location: "lib/auth.ts:createUser:firstUser",
            message: "createUser first user path",
            data: { email: data.email },
            timestamp: Date.now(),
            hypothesisId: "H3",
          }),
        }).catch(() => {});
        // #endregion
        const user = await prisma.user.create({
          data: {
            name: data.name ?? null,
            email: data.email,
            emailVerified: data.emailVerified ?? null,
            image: data.image ?? null,
            firstName,
            lastName,
            role: "admin",
            status: "active",
          },
        });
        await prisma.appConfig.upsert({
          where: { id: "default" },
          create: {
            id: "default",
            allowAccountCreation: false,
            auditUserCrud: false,
          },
          update: { allowAccountCreation: false },
        });
        return user as ReturnType<typeof baseAdapter.createUser> extends Promise<infer U> ? U : never;
      }

      if (!config.allowAccountCreation) {
        // #region agent log
        fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
          body: JSON.stringify({
            sessionId: "da6607",
            location: "lib/auth.ts:createUser:throw",
            message: "createUser throwing ACCOUNT_CREATION_DISABLED",
            data: { email: data.email },
            timestamp: Date.now(),
            hypothesisId: "H5",
          }),
        }).catch(() => {});
        // #endregion
        const err = new Error(ACCOUNT_CREATION_DISABLED_ERROR) as Error & { code?: string };
        err.code = "ACCOUNT_CREATION_DISABLED";
        throw err;
      }

      const existing = await prisma.user.findFirst({
        where: { email: { equals: data.email, mode: "insensitive" } },
      });
      if (existing) {
        // #region agent log
        fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
          body: JSON.stringify({
            sessionId: "da6607",
            location: "lib/auth.ts:createUser:existing",
            message: "createUser returning existing user",
            data: { email: data.email },
            timestamp: Date.now(),
            hypothesisId: "H3,H4",
          }),
        }).catch(() => {});
        // #endregion
        return existing as ReturnType<typeof baseAdapter.createUser> extends Promise<infer U> ? U : never;
      }

      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:createUser:newUser",
          message: "createUser creating new pending user",
          data: { email: data.email },
          timestamp: Date.now(),
          hypothesisId: "H3",
        }),
      }).catch(() => {});
      // #endregion
      const user = await prisma.user.create({
        data: {
          name: data.name ?? null,
          email: data.email,
          emailVerified: data.emailVerified ?? null,
          image: data.image ?? null,
          firstName,
          lastName,
          role: "user",
          status: "pending_approval",
        },
      });
      return user as ReturnType<typeof baseAdapter.createUser> extends Promise<infer U> ? U : never;
    },
    async linkAccount(account: Parameters<typeof baseAdapter.linkAccount>[0]) {
      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:linkAccount:entry",
          message: "linkAccount called",
          data: { userId: account.userId, provider: account.provider },
          timestamp: Date.now(),
          hypothesisId: "H4",
        }),
      }).catch(() => {});
      // #endregion
      const result = await baseAdapter.linkAccount!(account);
      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:linkAccount:exit",
          message: "linkAccount completed",
          data: { userId: account.userId },
          timestamp: Date.now(),
          hypothesisId: "H4",
        }),
      }).catch(() => {});
      // #endregion
      return result;
    },
  },
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
        if (!user || user.status !== "active") return null;
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
    async signIn({ user }) {
      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:signIn:entry",
          message: "signIn callback",
          data: { userId: user?.id, email: user?.email },
          timestamp: Date.now(),
          hypothesisId: "H6",
        }),
      }).catch(() => {});
      // #endregion
      if (!user?.id) {
        // #region agent log
        fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
          body: JSON.stringify({
            sessionId: "da6607",
            location: "lib/auth.ts:signIn:noUserId",
            message: "signIn returning false: no user.id",
            data: {},
            timestamp: Date.now(),
            hypothesisId: "H6",
          }),
        }).catch(() => {});
        // #endregion
        return false;
      }
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      // #region agent log
      fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
        body: JSON.stringify({
          sessionId: "da6607",
          location: "lib/auth.ts:signIn:dbUser",
          message: "signIn dbUser lookup",
          data: { userId: user.id, dbUserFound: !!dbUser, status: dbUser?.status ?? null },
          timestamp: Date.now(),
          hypothesisId: "H6",
        }),
      }).catch(() => {});
      // #endregion
      if (!dbUser) {
        // #region agent log
        fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
          body: JSON.stringify({
            sessionId: "da6607",
            location: "lib/auth.ts:signIn:noDbUser",
            message: "signIn returning false: dbUser not found",
            data: { userId: user.id },
            timestamp: Date.now(),
            hypothesisId: "H6",
          }),
        }).catch(() => {});
        // #endregion
        return false;
      }
      if (dbUser.status === "inactive") {
        // #region agent log
        fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "da6607" },
          body: JSON.stringify({
            sessionId: "da6607",
            location: "lib/auth.ts:signIn:inactive",
            message: "signIn returning false: user inactive",
            data: { userId: user.id },
            timestamp: Date.now(),
            hypothesisId: "H6",
          }),
        }).catch(() => {});
        // #endregion
        return false;
      }
      if (dbUser.status === "pending_approval") return "/login/pending";
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl + "/dashboard";
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user?.id ?? (session.user as { id?: string }).id;
        const u = user as { role?: UserRole; status?: UserStatus };
        if (u?.role != null) (session.user as { role?: UserRole }).role = u.role;
        if (u?.status != null) (session.user as { status?: UserStatus }).status = u.status;
        // If this is the only user in the system, treat as admin so they can access admin and set their role
        if ((session.user as { role?: UserRole }).role !== "admin" && user?.id) {
          const userCount = await prisma.user.count();
          if (userCount === 1) {
            (session.user as { role?: UserRole }).role = "admin";
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "database",
  },
} as NextAuthOptions;

export { ACCOUNT_CREATION_DISABLED_ERROR };
