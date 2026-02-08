import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db/prisma";
import type { User } from "@prisma/client";

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
  if (user.role !== "admin") {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return user;
}
