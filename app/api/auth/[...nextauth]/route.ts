import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs";

// #region agent log
function _dbg(location: string, message: string, data: Record<string, unknown>) {
  try {
    const logPath = path.join(process.cwd(), ".cursor", "debug-da6607.log");
    const line = JSON.stringify({ sessionId: "da6607", location, message, data, timestamp: Date.now() }) + "\n";
    fs.appendFileSync(logPath, line);
  } catch {
    /* noop */
  }
}
// #endregion

const handler = NextAuth(authOptions);

async function wrappedHandler(
  req: Request,
  ctx: { params: Promise<{ nextauth?: string[] }> }
) {
  const url = new URL(req.url);
  // #region agent log
  _dbg("api/auth/route:request", "Auth API request", {
    method: req.method,
    pathname: url.pathname,
    search: url.search,
    searchParams: Object.fromEntries(url.searchParams),
  });
  // #endregion
  return handler(req, ctx);
}

export const GET = wrappedHandler;
export const POST = wrappedHandler;
