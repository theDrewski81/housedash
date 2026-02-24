import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db/prisma";
import type { User } from "@prisma/client";

/** Returns Google OAuth access_token for the current user, or null if not signed in with Google. */
export async function getGoogleAccessToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
    select: { access_token: true },
  });
  return account?.access_token ?? null;
}

export async function getCurrentUser(): Promise<(User & { role: User["role"]; status: User["status"] }) | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("Unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  if (user.role === "admin") return user;
  // Single user in the system is treated as admin so they can access admin and set their role
  const userCount = await prisma.user.count();
  if (userCount === 1) return user;
  const err = new Error("Forbidden") as Error & { status?: number };
  err.status = 403;
  throw err;
}
