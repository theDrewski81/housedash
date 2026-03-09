import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "./auth";
import { getKioskCookie } from "./kiosk-session";
import { prisma } from "./db/prisma";

export type AppSession = Session & { isKiosk?: boolean };

/**
 * Returns the current session from either NextAuth (Google, etc.) or the kiosk signed cookie.
 * Use this instead of getServerSession(authOptions) so kiosk mode is supported.
 */
export async function getSession(): Promise<AppSession | null> {
  const nextAuthSession = await getServerSession(authOptions);
  if (nextAuthSession) return nextAuthSession;

  const kiosk = await getKioskCookie();
  if (!kiosk) return null;

  const user = await prisma.user.findUnique({
    where: { id: kiosk.userId },
    select: { id: true, email: true, name: true, image: true, role: true, status: true },
  });
  if (!user || user.status !== "active") return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      role: user.role ?? undefined,
      status: user.status ?? undefined,
    },
    isKiosk: true,
    expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
