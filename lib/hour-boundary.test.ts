import { describe, expect, it } from "vitest";
import { getMsUntilNextHour } from "./hour-boundary";

describe("getMsUntilNextHour", () => {
  it("returns ms until next hour for mid-hour time", () => {
    const now = new Date(2025, 5, 15, 10, 30, 0, 0);
    expect(getMsUntilNextHour(now)).toBe(30 * 60 * 1000);
  });

  it("returns one hour at exact hour boundary", () => {
    const now = new Date(2025, 5, 15, 14, 0, 0, 0);
    expect(getMsUntilNextHour(now)).toBe(60 * 60 * 1000);
  });

  it("accounts for seconds and milliseconds", () => {
    const now = new Date(2025, 5, 15, 9, 0, 45, 500);
    // Until 10:00:00.000 → 59m 14.5s
    expect(getMsUntilNextHour(now)).toBe(59 * 60 * 1000 + 14 * 1000 + 500);
  });
});
