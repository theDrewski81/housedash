import { describe, it, expect } from "vitest";
import {
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  getDateKeyInTimezone,
  addDaysToDateStr,
} from "./date-utils";

describe("date-utils timezone helpers", () => {
  describe("getStartOfDayInTimezone", () => {
    it("returns UTC midnight for UTC timezone", () => {
      const d = getStartOfDayInTimezone("2026-03-08", "UTC");
      expect(d.toISOString()).toBe("2026-03-08T00:00:00.000Z");
    });

    it("returns date that formats as midnight in the given timezone", () => {
      const d = getStartOfDayInTimezone("2026-03-08", "America/Los_Angeles");
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      expect(formatter.format(d)).toBe("00:00:00");
      expect(getDateKeyInTimezone(d, "America/Los_Angeles")).toMatch(/2026-03-0[78]/);
    });
  });

  describe("getEndOfDayInTimezone", () => {
    it("returns 23:59:59.999 in the given timezone", () => {
      const d = getEndOfDayInTimezone("2026-03-08", "UTC");
      expect(d.toISOString()).toBe("2026-03-08T23:59:59.999Z");
    });

    it("returns date that is just before next day start in TZ", () => {
      const end = getEndOfDayInTimezone("2026-03-08", "America/Los_Angeles");
      const startNext = getStartOfDayInTimezone("2026-03-09", "America/Los_Angeles");
      expect(end.getTime()).toBe(startNext.getTime() - 1);
    });
  });

  describe("addDaysToDateStr", () => {
    it("adds positive days", () => {
      expect(addDaysToDateStr("2026-03-08", 7)).toBe("2026-03-15");
      expect(addDaysToDateStr("2026-03-08", 1)).toBe("2026-03-09");
    });
    it("subtracts days with negative argument", () => {
      expect(addDaysToDateStr("2026-03-08", -7)).toBe("2026-03-01");
      expect(addDaysToDateStr("2026-03-08", -1)).toBe("2026-03-07");
    });
    it("handles month boundary", () => {
      expect(addDaysToDateStr("2026-02-28", 2)).toBe("2026-03-02");
    });
  });
});
