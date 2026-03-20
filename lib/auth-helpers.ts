import { getSession } from "./session";
import { prisma } from "./db/prisma";
import type { User } from "@prisma/client";
import { isAdministrationRole } from "./user-roles";

export { isAdministrationRole } from "./user-roles";

export async function getCurrentUser(): Promise<(User & { role: User["role"]; status: User["status"] }) | null> {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }

  const byId = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (byId) return byId;

  const email = session.user.email;
  if (typeof email === "string" && email.trim()) {
    return prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });
  }

  return null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getHouseholdUserId(): Promise<string> {
  const user = await requireAuth();
  const config = await prisma.appConfig.findFirst();

  if (config?.householdUserId) {
    return config.householdUserId;
  }
  return user.id;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("Unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  if (isAdministrationRole(user.role)) return user;
  // Single user in the system is treated as admin so they can access admin and set their role
  const userCount = await prisma.user.count();
  if (userCount === 1) return user;
  const err = new Error("Forbidden") as Error & { status?: number };
  err.status = 403;
  throw err;
}
