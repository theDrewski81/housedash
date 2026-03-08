import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { UserRole, UserStatus } from "@prisma/client";
import fs from "fs";
import { NextAuthOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import path from "path";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getAppConfig } from "./app-config";
import { prisma } from "./db/prisma";

const ACCOUNT_CREATION_DISABLED_ERROR = "Account creation is disabled";

/** Session lasts 14 days from login (per device); no sliding expiry. */
const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

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
        let token = credentials?.token;
        // #region agent log
        const debugLogPath = path.join(process.cwd(), ".cursor", "debug-146b76.log");
        const logIngest = (message: string, data: Record<string, unknown>, hypothesisId: string) => {
          const payload = { sessionId: "146b76", location: "lib/auth.ts:authorize", message, data, hypothesisId, timestamp: Date.now() };
          try {
            const dir = path.dirname(debugLogPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(debugLogPath, JSON.stringify(payload) + "\n");
          } catch { /* noop */ }
          fetch("http://127.0.0.1:7832/ingest/c0ef89d9-077f-4a38-976e-46e2b7cf1042", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "146b76" },
            body: JSON.stringify(payload),
          }).catch(() => {});
        };
        logIngest("authorize entry", {
          tokenLen: typeof token === "string" ? token.length : 0,
          tokenHasSpace: typeof token === "string" && token.includes(" "),
          envLen: process.env.KIOSK_TOKEN?.length ?? 0,
        }, "H1,H2");
        // #endregion
        // application/x-www-form-urlencoded decodes + as space; base64 tokens use +. Restore before compare.
        if (typeof token === "string" && token.includes(" ")) {
          token = token.replace(/ /g, "+");
        }
        const tokenMatches = !!(token && process.env.KIOSK_TOKEN && token === process.env.KIOSK_TOKEN);
        // #region agent log
        logIngest("after token fix", { tokenMatches, hasToken: !!token, hasEnv: !!process.env.KIOSK_TOKEN }, "H1");
        // #endregion
        if (!token || token !== process.env.KIOSK_TOKEN) {
          // #region agent log
          logIngest("authorize return null", { reason: "token_invalid" }, "H1");
          // #endregion
          return null;
        }
        let user = await prisma.user.findFirst({
          where: { kioskToken: token },
        });
        // #region agent log
        logIngest("after findFirst", { userFound: !!user, userId: user?.id, status: user?.status }, "H2");
        // #endregion
        if (!user) {
          // #region agent log
          logIngest("creating kiosk user", {}, "H2");
          // #endregion
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
            // #region agent log
            logIngest("kiosk user created", { userId: user.id, status: user.status }, "H2");
            // #endregion
          } catch (err: unknown) {
            const prismaErr = err as { code?: string };
            // #region agent log
            logIngest("create failed", { code: prismaErr.code }, "H2");
            // #endregion
            if (prismaErr.code === "P2002") {
              const existing = await prisma.user.findFirst({
                where: { email: "kiosk@household.local" },
              });
              if (existing) {
                user = await prisma.user.update({
                  where: { id: existing.id },
                  data: { kioskToken: token },
                });
                // #region agent log
                logIngest("kiosk user updated (P2002)", { userId: user.id, status: user.status }, "H2");
                // #endregion
              }
            }
            if (!user) {
              // #region agent log
              logIngest("authorize return null", { reason: "create_failed" }, "H2");
              // #endregion
              return null;
            }
          }
        }
        if (user.status !== "active") {
          // #region agent log
          logIngest("authorize return null", { reason: "status_not_active", status: user.status }, "H2");
          // #endregion
          return null;
        }
        // #region agent log
        logIngest("authorize return user", { userId: user.id }, "H2");
        // #endregion
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role ?? undefined,
          status: user.status ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // #region agent log
      const signInLogPath = path.join(process.cwd(), ".cursor", "debug-146b76.log");
      const signInLog = (message: string, data: Record<string, unknown>, hypothesisId: string) => {
        const payload = { sessionId: "146b76", location: "lib/auth.ts:signIn", message, data, hypothesisId, timestamp: Date.now() };
        try {
          const dir = path.dirname(signInLogPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.appendFileSync(signInLogPath, JSON.stringify(payload) + "\n");
        } catch { /* noop */ }
        fetch("http://127.0.0.1:7832/ingest/c0ef89d9-077f-4a38-976e-46e2b7cf1042", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "146b76" }, body: JSON.stringify(payload) }).catch(() => {});
      };
      signInLog("signIn callback entry", { userId: user?.id, email: user?.email, provider: account?.provider }, "H4");
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
      const result = (() => {
        if (!dbUser) {
          // New user (not in DB): allow so adapter can createUser; createUser enforces allowAccountCreation
          return true;
        }
        if (dbUser.status === "inactive") {
          return false;
        }
        if (dbUser.status === "pending_approval") {
          return "/login/pending";
        }
        return true;
      })();
      // #region agent log
      signInLog("signIn callback result", { dbUserFound: !!dbUser, status: dbUser?.status, result: result === true ? true : result === false ? false : String(result) }, "H4");
      // #endregion
      return result;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl + "/dashboard";
    },
    async jwt({ token, user, account }) {
      // On sign-in, persist user id and (if available) role/status to the token
      if (user) {
        token.userId = (user as { id?: string }).id;
        const u = user as { role?: UserRole; status?: UserStatus };
        if (u?.role != null) token.role = u.role;
        if (u?.status != null) token.status = u.status;
        // If from OAuth, user may not have role/status; look up from DB
        if (token.role == null || token.status == null) {
          const dbUser = token.userId
            ? await prisma.user.findUnique({ where: { id: token.userId }, select: { role: true, status: true } })
            : (user as { email?: string }).email
              ? await prisma.user.findFirst({ where: { email: { equals: (user as { email: string }).email, mode: "insensitive" } }, select: { role: true, status: true } })
              : null;
          if (dbUser) {
            if (token.role == null) token.role = dbUser.role ?? undefined;
            if (token.status == null) token.status = dbUser.status ?? undefined;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? (token.sub as string);
        if (token.role != null) (session.user as { role?: UserRole }).role = token.role as UserRole;
        if (token.status != null) (session.user as { status?: UserStatus }).status = token.status as UserStatus;
        // If this is the only user in the system, treat as admin
        if ((session.user as { role?: UserRole }).role !== "admin" && session.user.id) {
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
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 0, // Expire 14 days from login, do not extend on activity
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NEXTAUTH_URL?.startsWith("https://")
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    },
  },
} as NextAuthOptions;

export { ACCOUNT_CREATION_DISABLED_ERROR };
