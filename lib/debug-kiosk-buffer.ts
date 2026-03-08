/** In-memory ring buffer of last kiosk auth server-side log payloads (authorize/signIn). */
const MAX_ENTRIES = 30;
const buffer: Record<string, unknown>[] = [];

export function pushKioskDebugPayload(payload: Record<string, unknown>): void {
  buffer.push(payload);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

export function getKioskDebugPayloads(): Record<string, unknown>[] {
  return [...buffer];
}
