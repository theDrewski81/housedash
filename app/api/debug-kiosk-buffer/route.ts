import { NextResponse } from "next/server";
import { getKioskDebugPayloads } from "@/lib/debug-kiosk-buffer";

/** Returns in-memory server-side kiosk auth log payloads (authorize/signIn) for debugging. */
export async function GET() {
  const payloads = getKioskDebugPayloads();
  return NextResponse.json({ payloads });
}
