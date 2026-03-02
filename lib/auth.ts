import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { UserRole, UserStatus } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import fs from "fs";
import path from "path";
import { getAppConfig } from "./app-config";
import { prisma } from "./db/prisma";

const ACCOUNT_CREATION_DISABLED_ERROR = "Account creation is disabled";

// #region agent log
function _debugLog(loc: string, msg: string, data: Record<string, unknown>) {
  const payload = JSON.stringify({ sessionId: "98863f", location: loc, message: msg, data, timestamp: Date.now() });
  try {
    const dir = path.join(process.cwd(), ".cursor");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "debug-98863f.log"), payload + "\n");
  } catch {
    fetch("http://127.0.0.1:7535/ingest/0a41af39-9358-404e-8158-0ae7cebbf411", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "98863f" },
      body: payload,
    }).catch(() => {});
  }
}
// #endregion

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
    }),
    CredentialsProvider({
      id: "kiosk",
      name: "Kiosk (tablet)",
      credentials: {
        token: { label: "Kiosk token", type: "password" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        _debugLog("lib/auth.ts:authorize", "authorize entry", { hasToken: !!token, tokenLen: token?.length ?? 0, hasEnvToken: !!process.env.KIOSK_TOKEN, envTokenLen: process.env.KIOSK_TOKEN?.length ?? 0 });
        if (!token || token !== process.env.KIOSK_TOKEN) {
          _debugLog("lib/auth.ts:authorize", "authorize token mismatch", { tokenMatch: token === process.env.KIOSK_TOKEN });
          return null;
        }
        let user = await prisma.user.findFirst({
          where: { kioskToken: token },
        });
        _debugLog("lib/auth.ts:authorize", "authorize user lookup", { userFound: !!user, userId: user?.id });
        if (!user) {
          try {
            user = await prisma.user.create({
              data: {
                email: "kiosk@household.local",
                name: "Kiosk",
                kioskToken: token,
                status: "active",
                role: "user",
              },
            });
            _debugLog("lib/auth.ts:authorize", "authorize user created", { userId: user.id });
          } catch (err: unknown) {
            const prismaErr = err as { code?: string };
            _debugLog("lib/auth.ts:authorize", "authorize create error", { code: prismaErr.code });
            if (prismaErr.code === "P2002") {
              const existing = await prisma.user.findFirst({
                where: { email: "kiosk@household.local" },
              });
              if (existing) {
                user = await prisma.user.update({
                  where: { id: existing.id },
                  data: { kioskToken: token },
                });
                _debugLog("lib/auth.ts:authorize", "authorize user updated", { userId: user.id });
              }
            }
            if (!user) return null;
          }
        }
        if (user.status !== "active") {
          _debugLog("lib/auth.ts:authorize", "authorize user inactive", { status: user.status });
          return null;
        }
        _debugLog("lib/auth.ts:authorize", "authorize success", { userId: user.id });
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
      // NextAuth passes a prototype user (name, email, image) without id for first-time OAuth sign-ins.
      // Look up by id first; if no id, fall back to email for manually added users.
      let dbUser: { status: UserStatus | null } | null = null;
      _debugLog("lib/auth.ts:signIn", "signIn entry", { userId: user?.id, email: user?.email });
      if (user?.id) {
        dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { status: true },
        });
      }
      if (!dbUser && user?.email) {
        dbUser = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
          select: { status: true },
        });
      }
      _debugLog("lib/auth.ts:signIn", "signIn dbUser", { found: !!dbUser, status: dbUser?.status });
      if (!dbUser) {
        // New user (not in DB): allow so adapter can createUser; createUser enforces allowAccountCreation
        _debugLog("lib/auth.ts:signIn", "signIn no dbUser, allow", {});
        return true;
      }
      if (dbUser.status === "inactive") {
        _debugLog("lib/auth.ts:signIn", "signIn inactive, reject", {});
        return false;
      }
      if (dbUser.status === "pending_approval") {
        _debugLog("lib/auth.ts:signIn", "signIn pending_approval", {});
        return "/login/pending";
      }
      _debugLog("lib/auth.ts:signIn", "signIn allow", {});
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
