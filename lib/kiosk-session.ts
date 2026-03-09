import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "kiosk_session";
const MAX_AGE_SECONDS = 14 * 24 * 60 * 60; // 14 days

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET required for kiosk session");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createKioskCookieValue(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${userId}:${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyKioskCookieValue(value: string): { userId: string } | null {
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (sign(payload) !== sig) return null;
  const [userId, expStr] = payload.split(":");
  const exp = parseInt(expStr ?? "0", 10);
  if (!userId || Number.isNaN(exp) || Math.floor(Date.now() / 1000) > exp) return null;
  return { userId };
}

export async function getKioskCookie(): Promise<{ userId: string } | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return verifyKioskCookieValue(value);
}

export function getKioskCookieSync(value: string | undefined): { userId: string } | null {
  if (!value) return null;
  return verifyKioskCookieValue(value);
}

export function kioskCookieOptions() {
  const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export { COOKIE_NAME };
