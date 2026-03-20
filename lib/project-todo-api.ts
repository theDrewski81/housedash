import { UserStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const projectTodoWithOwnerInclude = {
  ownerUser: {
    select: { id: true, firstName: true, accentColor: true },
  },
} satisfies Prisma.ProjectTodoInclude;

const HEX_ACCENT = /^#[0-9A-Fa-f]{6}$/;

export type ProjectTodoWithOwner = Prisma.ProjectTodoGetPayload<{
  include: typeof projectTodoWithOwnerInclude;
}>;

export function serializeProjectTodo(todo: ProjectTodoWithOwner) {
  const { ownerUser, ...row } = todo;
  const rawAccent = ownerUser?.accentColor;
  const ownerAccentColor =
    typeof rawAccent === "string" && HEX_ACCENT.test(rawAccent)
      ? rawAccent
      : null;
  return {
    ...row,
    ownerFirstName: ownerUser?.firstName ?? null,
    ownerAccentColor,
  };
}

/** Active, non-kiosk users may own a project todo. */
export async function validateOwnerUserIdOrNull(
  ownerUserId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (ownerUserId === null) return { ok: true };
  const user = await prisma.user.findFirst({
    where: {
      id: ownerUserId,
      status: UserStatus.active,
      kioskToken: null,
    },
    select: { id: true },
  });
  if (!user) return { ok: false, message: "Invalid owner user" };
  return { ok: true };
}

export type OwnerPatch =
  | { mode: "omit" }
  | { mode: "set"; value: string | null }
  | { mode: "invalid" };

export function parseOwnerUserIdFromBody(body: Record<string, unknown>): OwnerPatch {
  if (!Object.prototype.hasOwnProperty.call(body, "ownerUserId")) {
    return { mode: "omit" };
  }
  const v = body.ownerUserId;
  if (v === null || v === "") return { mode: "set", value: null };
  if (typeof v === "string") return { mode: "set", value: v };
  return { mode: "invalid" };
}
