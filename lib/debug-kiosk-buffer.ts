import fs from "fs";
import path from "path";

const SERVER_BUFFER_FILE = ".cursor/debug-146b76-server.jsonl";
const MAX_LINES = 50;

/** Append server-side kiosk auth payload to a file so it's visible across workers and survives GET in another process. */
export function pushKioskDebugPayload(payload: Record<string, unknown>): void {
  try {
    const fullPath = path.join(process.cwd(), SERVER_BUFFER_FILE);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(fullPath, JSON.stringify(payload) + "\n");
  } catch {
    // noop
  }
}

/** Read and return server payloads from the file; then truncate the file so the next run gets a fresh buffer. */
export function getKioskDebugPayloads(): Record<string, unknown>[] {
  try {
    const fullPath = path.join(process.cwd(), SERVER_BUFFER_FILE);
    if (!fs.existsSync(fullPath)) return [];
    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean).slice(-MAX_LINES);
    const payloads = lines.map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    }).filter((p): p is Record<string, unknown> => p !== null);
    fs.writeFileSync(fullPath, "");
    return payloads;
  } catch {
    return [];
  }
}
