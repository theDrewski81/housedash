import { NextAuthOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import path from "path";
import fs from "fs";
import { prisma } from "./db/prisma";
import { getAppConfig } from "./app-config";
import type { UserRole, UserStatus } from "@prisma/client";

const ACCOUNT_CREATION_DISABLED_ERROR = "Account creation is disabled";

// #region agent log
function _dbg(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  try {
    const logPath = path.join(process.cwd(), ".cursor", "debug-da6607.log");
    const line = JSON.stringify({ sessionId: "da6607", location, message, data, timestamp: Date.now(), hypothesisId }) + "\n";
    fs.appendFileSync(logPath, line);
  } catch {
    /* noop */
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
      // #region agent log
      _dbg("lib/auth.ts:getUserByEmail:entry", "getUserByEmail called", { email }, "H3,H4");
      // #endregion
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      // #region agent log
      _dbg("lib/auth.ts:getUserByEmail:exit", "getUserByEmail result", { email, userFound: !!user }, "H3,H4");
      // #endregion
      return user;
    },
    async createUser(data: Omit<AdapterUser, "id">) {
      // #region agent log
      _dbg("lib/auth.ts:createUser:entry", "createUser called", { email: data.email }, "H3,H5");
      // #endregion
      const config = await getAppConfig();
      // #region agent log
      _dbg("lib/auth.ts:createUser:config", "createUser config", { allowAccountCreation: config.allowAccountCreation }, "H1,H5");
      // #endregion
      const userCount = await prisma.user.count();
      const { firstName, lastName } = parseNameToFirstLast(data.name ?? undefined);

      if (userCount === 0) {
        // #region agent log
        _dbg("lib/auth.ts:createUser:firstUser", "createUser first user path", { email: data.email }, "H3");
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
        _dbg("lib/auth.ts:createUser:throw", "createUser throwing ACCOUNT_CREATION_DISABLED", { email: data.email }, "H5");
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
        _dbg("lib/auth.ts:createUser:existing", "createUser returning existing user", { email: data.email }, "H3,H4");
        // #endregion
        return existing as ReturnType<typeof baseAdapter.createUser> extends Promise<infer U> ? U : never;
      }

      // #region agent log
      _dbg("lib/auth.ts:createUser:newUser", "createUser creating new pending user", { email: data.email }, "H3");
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
      _dbg("lib/auth.ts:linkAccount:entry", "linkAccount called", { userId: account.userId, provider: account.provider }, "H4");
      // #endregion
      const result = await baseAdapter.linkAccount!(account);
      // #region agent log
      _dbg("lib/auth.ts:linkAccount:exit", "linkAccount completed", { userId: account.userId }, "H4");
      // #endregion
      return result;
    },
  },
  trustHost: true, // required when behind Cloudflare Tunnel / reverse proxy
  debug: process.env.NEXTAUTH_DEBUG === "1",
  logger: {
    error(code, metadata) {
      _dbg("lib/auth.ts:logger:error", "NextAuth error", { code, metadata: String(metadata) }, "logger");
      console.error("[NextAuth]", code, metadata);
    },
    warn(code) {
      _dbg("lib/auth.ts:logger:warn", "NextAuth warn", { code }, "logger");
    },
    debug(code, metadata) {
      _dbg("lib/auth.ts:logger:debug", "NextAuth debug", { code, metadata: String(metadata) }, "logger");
    },
  },
  events: {
    signIn({ user, account, isNewUser }) {
      _dbg("lib/auth.ts:events:signIn", "NextAuth signIn event", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        isNewUser,
      }, "events");
    },
    signOut() {
      _dbg("lib/auth.ts:events:signOut", "NextAuth signOut event", {}, "events");
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
      _dbg("lib/auth.ts:signIn:entry", "signIn callback", { userId: user?.id, email: user?.email }, "H6");
      // #endregion
      // NextAuth passes a prototype user (name, email, image) without id for first-time OAuth sign-ins.
      // Look up by id first; if no id, fall back to email for manually added users.
      let dbUser: { status: UserStatus | null } | null = null;
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
      // #region agent log
      _dbg("lib/auth.ts:signIn:dbUser", "signIn dbUser lookup", {
        userId: user?.id,
        email: user?.email,
        dbUserFound: !!dbUser,
        status: dbUser?.status ?? null,
      }, "H6");
      // #endregion
      if (!dbUser) {
        // New user (not in DB): allow so adapter can createUser; createUser enforces allowAccountCreation
        // #region agent log
        _dbg("lib/auth.ts:signIn:newUser", "signIn allowing new user (no DB record)", { email: user?.email }, "H6");
        // #endregion
        return true;
      }
      if (dbUser.status === "inactive") {
        // #region agent log
        _dbg("lib/auth.ts:signIn:inactive", "signIn returning false: user inactive", { userId: user?.id }, "H6");
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
