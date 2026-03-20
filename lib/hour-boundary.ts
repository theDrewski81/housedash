/** Milliseconds from `now` until the next local clock hour (e.g. 10:30 → 11:00:00.000). */
export function getMsUntilNextHour(now: Date = new Date()): number {
  const next = new Date(now.getTime());
  next.setHours(now.getHours() + 1, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  return ms > 0 ? ms : 60 * 60 * 1000;
}
