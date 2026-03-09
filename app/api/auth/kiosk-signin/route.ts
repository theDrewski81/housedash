import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import {
  createKioskCookieValue,
  COOKIE_NAME,
  kioskCookieOptions,
} from "@/lib/kiosk-session";

function trimPadding(t: string): string {
  return t.replace(/=+$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const receivedTrimmed = trimPadding(token);
    const envToken = process.env.KIOSK_TOKEN ?? "";
    const envTrimmed = trimPadding(envToken);
    if (!receivedTrimmed || receivedTrimmed !== envTrimmed) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const canonicalToken = envTrimmed + "=";
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { kioskToken: receivedTrimmed },
          { kioskToken: canonicalToken },
          { kioskToken: token },
        ].filter((o) => o.kioskToken !== ""),
      },
    });
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email: "kiosk@household.local",
            name: "Kiosk",
            kioskToken: canonicalToken,
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
              data: { kioskToken: canonicalToken },
            });
          }
        }
      }
    }
    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieValue = createKioskCookieValue(user.id);
    const store = await cookies();
    store.set(COOKIE_NAME, cookieValue, kioskCookieOptions());

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    console.error("Kiosk sign-in error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
