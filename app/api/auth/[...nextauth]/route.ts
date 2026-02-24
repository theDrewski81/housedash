import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

async function wrappedHandler(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  const url = req.url;
  const isCallback = url.includes("/callback/google");
  if (isCallback) {
    const u = new URL(url);
    const error = u.searchParams.get("error");
    const code = u.searchParams.get("code");
    // #region agent log
    fetch("http://127.0.0.1:7265/ingest/82f6d7d4-f037-4325-a8e4-76202ca019d4", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "c2dc8b",
      },
      body: JSON.stringify({
        sessionId: "c2dc8b",
        location: "route.ts:callback",
        message: "OAuth callback received",
        data: {
          hasError: !!error,
          error,
          errorDescription: u.searchParams.get("error_description"),
          hasCode: !!code,
          pathname: u.pathname,
        },
        timestamp: Date.now(),
        hypothesisId: "H3",
      }),
    }).catch(() => {});
    // #endregion
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
