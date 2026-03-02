import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/** Debug instrumentation endpoint: appends logs to .cursor/debug-{sessionId}.log (default 98863f) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId ?? "98863f";
    const payload = JSON.stringify({ ...body, timestamp: body.timestamp ?? Date.now() });
    const dir = path.join(process.cwd(), ".cursor");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, `debug-${sessionId}.log`), payload + "\n");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
