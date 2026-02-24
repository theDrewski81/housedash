import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { appendFileSync } from "fs";
import { join } from "path";

const handler = NextAuth(authOptions);

function debugLog(data: Record<string, unknown>) {
  try {
    const line =
      JSON.stringify({
        sessionId: "c2dc8b",
        timestamp: Date.now(),
        ...data,
      }) + "\n";
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
  if (u.pathname.includes("callback") && u.pathname.includes("google")) {
    debugLog({
      location: "route.ts:callback",
      message: "OAuth callback received",
      data: {
        error: u.searchParams.get("error"),
        error_description: u.searchParams.get("error_description"),
        hasCode: !!u.searchParams.get("code"),
        fullPath: u.pathname + u.search,
      },
    });
  }
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
