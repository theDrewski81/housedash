import type { UserRole } from "@prisma/client";

/** Roles that may open Settings and call admin-only APIs. */
export function isAdministrationRole(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "super_user";
}
