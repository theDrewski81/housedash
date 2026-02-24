import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { appendFileSync } from "fs";
import { join } from "path";

const handler = NextAuth(authOptions);

function debugLog(data: Record<string, unknown>) {
  const payload = { sessionId: "c2dc8b", timestamp: Date.now(), ...data };
  const line = JSON.stringify(payload) + "\n";
  console.error("[AUTH_DEBUG]", line);
  try {
    appendFileSync(join(process.cwd(), "debug-c2dc8b.log"), line);
  } catch {
    /* ignore */
  }
}

async function wrappedHandler(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  const url = req.url;
  const u = new URL(url);
  const pathname = u.pathname;
  const params = await ctx.params;
  debugLog({
    location: "route.ts:all",
    message: "Auth request",
    data: {
      method: req.method,
      pathname,
      nextauthSegments: params?.nextauth,
      hasError: !!u.searchParams.get("error"),
      error: u.searchParams.get("error"),
    },
  });
  return handler(req, ctx);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  return wrappedHandler(req, ctx);
}
export async function POST(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  return wrappedHandler(req, ctx);
}
