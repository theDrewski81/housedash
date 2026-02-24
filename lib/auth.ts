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
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      return user;
    },
    async createUser(data: Omit<AdapterUser, "id">) {
      const config = await getAppConfig();
      const userCount = await prisma.user.count();
      const { firstName, lastName } = parseNameToFirstLast(data.name ?? undefined);

      if (userCount === 0) {
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
        const err = new Error(ACCOUNT_CREATION_DISABLED_ERROR) as Error & { code?: string };
        err.code = "ACCOUNT_CREATION_DISABLED";
        throw err;
      }

      const existing = await prisma.user.findFirst({
        where: { email: { equals: data.email, mode: "insensitive" } },
      });
      if (existing) {
        return existing as ReturnType<typeof baseAdapter.createUser> extends Promise<infer U> ? U : never;
      }

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
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
        },
      },
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
      if (!user?.id) return false;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      if (!dbUser) return false;
      if (dbUser.status === "inactive") return false;
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
  events: {
    // #region agent log
    error({ error }) {
      fetch("http://127.0.0.1:7265/ingest/82f6d7d4-f037-4325-a8e4-76202ca019d4", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "c2dc8b",
        },
        body: JSON.stringify({
          sessionId: "c2dc8b",
          location: "auth.ts:events.error",
          message: "NextAuth error event",
          data: {
            errorMessage: error?.message,
            errorName: error?.name,
          },
          timestamp: Date.now(),
          hypothesisId: "H3",
        }),
      }).catch(() => {});
    },
    // #endregion
  },
} as NextAuthOptions;

export { ACCOUNT_CREATION_DISABLED_ERROR };
