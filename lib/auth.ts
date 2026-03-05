import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { UserRole, UserStatus } from "@prisma/client";
import fs from "fs";
import { NextAuthOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import path from "path";
import { getAppConfig } from "./app-config";
import { prisma } from "./db/prisma";

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
        try {
          const envLen = process.env.KIOSK_TOKEN?.length ?? 0;
          const logPath = path.join(process.cwd(), ".cursor", "debug-5e0118.log");
          const dir = path.dirname(logPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.appendFileSync(logPath, JSON.stringify({
            sessionId: "5e0118", hypothesisId: "H2,H3", location: "lib/auth.ts:authorize",
            message: "authorize entry", data: {
              tokenLen: typeof token === "string" ? token.length : 0,
              tokenHasSpace: typeof token === "string" && token.includes(" "),
              tokenHasPlus: typeof token === "string" && token.includes("+"),
              envLen,
              tokenMatchesEnv: token === process.env.KIOSK_TOKEN,
            }, timestamp: Date.now(),
          }) + "\n");
        } catch { /* noop */ }
        // #endregion
        // application/x-www-form-urlencoded decodes + as space; base64 tokens use +. Restore before compare.
        if (typeof token === "string" && token.includes(" ")) {
          token = token.replace(/ /g, "+");
        }
        if (!token || token !== process.env.KIOSK_TOKEN) {
          return null;
        }
        let user = await prisma.user.findFirst({
          where: { kioskToken: token },
        });
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
          } catch (err: unknown) {
            const prismaErr = err as { code?: string };
            if (prismaErr.code === "P2002") {
              const existing = await prisma.user.findFirst({
                where: { email: "kiosk@household.local" },
              });
              if (existing) {
                user = await prisma.user.update({
                  where: { id: existing.id },
                  data: { kioskToken: token },
                });
              }
            }
            if (!user) return null;
          }
        }
        if (user.status !== "active") {
          return null;
        }
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
