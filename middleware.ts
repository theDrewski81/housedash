import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Debug: log kiosk-related requests to diagnose tablet sign-in. */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const kiosk = request.nextUrl.searchParams.get("kiosk");
  const isAuth = path.startsWith("/api/auth/");
  const isLogin = path === "/login";

  if ((isLogin && (kiosk || request.nextUrl.searchParams.get("error"))) || (isAuth && (path.includes("kiosk") || path.includes("credentials")))) {
    const payload = {
      sessionId: "1bfcef",
      location: "middleware",
      message: "kiosk/auth request",
      data: {
        path,
        method: request.method,
        url: request.nextUrl.href,
        hasKioskParam: !!kiosk,
        kioskLen: kiosk?.length ?? 0,
        userAgent: request.headers.get("user-agent")?.slice(0, 80),
      },
      timestamp: Date.now(),
      hypothesisId: "H6-middleware",
    };
    const origin = request.nextUrl.origin;
    console.error("[kiosk-debug]", JSON.stringify(payload));
    fetch(`${origin}/api/debug-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/api/auth/:path*"],
};
