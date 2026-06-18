import { describe, it, expect } from "vitest";

import {
  zonedDayStartUtc,
  zonedDayEndUtc,
  formatInTz,
  formatDateInTz,
  periodStartDate,
} from "./time";

describe("zonedDayStartUtc", () => {
  it("treats the date as midnight UTC when zone is UTC", () => {
    expect(zonedDayStartUtc("2026-06-17", "UTC")).toBe(
      "2026-06-17T00:00:00.000Z",
    );
  });

  it("shifts by the EDT offset (UTC-4) in summer for New York", () => {
    expect(zonedDayStartUtc("2026-06-17", "America/New_York")).toBe(
      "2026-06-17T04:00:00.000Z",
    );
  });

  it("shifts by the EST offset (UTC-5) in winter for New York", () => {
    expect(zonedDayStartUtc("2026-01-15", "America/New_York")).toBe(
      "2026-01-15T05:00:00.000Z",
    );
  });

  it("shifts by the PDT offset (UTC-7) in summer for Los Angeles", () => {
    expect(zonedDayStartUtc("2026-06-17", "America/Los_Angeles")).toBe(
      "2026-06-17T07:00:00.000Z",
    );
  });
});

describe("zonedDayEndUtc", () => {
  it("is the start of the following day (exclusive upper bound)", () => {
    expect(zonedDayEndUtc("2026-06-17", "America/New_York")).toBe(
      "2026-06-18T04:00:00.000Z",
    );
  });

  it("equals next-day start in UTC", () => {
    expect(zonedDayEndUtc("2026-06-17", "UTC")).toBe(
      "2026-06-18T00:00:00.000Z",
    );
  });

  it("spans exactly 24h for a non-DST-transition day", () => {
    const start = Date.parse(
      zonedDayStartUtc("2026-06-17", "America/New_York"),
    );
    const end = Date.parse(zonedDayEndUtc("2026-06-17", "America/New_York"));
    expect(end - start).toBe(24 * 60 * 60 * 1000);
  });

  it("spans 23h across the spring-forward DST day", () => {
    // US DST begins Sun Mar 8 2026; that local day is only 23 hours long.
    const start = Date.parse(
      zonedDayStartUtc("2026-03-08", "America/New_York"),
    );
    const end = Date.parse(zonedDayEndUtc("2026-03-08", "America/New_York"));
    expect(end - start).toBe(23 * 60 * 60 * 1000);
  });
});

describe("formatInTz", () => {
  it("renders the instant as wall-clock time in the zone", () => {
    const out = formatInTz("2026-06-17T04:00:00.000Z", "America/New_York");
    expect(out).toContain("Jun 17, 2026");
    expect(out).toMatch(/12:00\s*AM/);
  });

  it("renders the same instant differently across zones", () => {
    const instant = "2026-06-17T04:00:00.000Z";
    const ny = formatInTz(instant, "America/New_York");
    const la = formatInTz(instant, "America/Los_Angeles");
    expect(ny).not.toBe(la);
    expect(la).toContain("Jun 16, 2026"); // 9:00 PM the previous day in PDT
  });
});

describe("formatDateInTz", () => {
  it("renders a medium date with no time component", () => {
    const out = formatDateInTz("2026-06-17T16:00:00.000Z", "America/New_York");
    expect(out).toBe("Jun 17, 2026");
    expect(out).not.toMatch(/AM|PM|:/);
  });

  it("rolls to the previous day when the zone is behind the instant", () => {
    // 02:00Z on the 17th is still 6:00 PM on the 16th in Los Angeles (PDT).
    const out = formatDateInTz(
      "2026-06-17T02:00:00.000Z",
      "America/Los_Angeles",
    );
    expect(out).toBe("Jun 16, 2026");
  });
});

describe("periodStartDate", () => {
  it("returns undefined for all-time (no lower bound)", () => {
    expect(periodStartDate("all", "UTC")).toBeUndefined();
  });

  it("steps back a full week and month from today", () => {
    const today = new Date();
    const utcDate = (offset: { d?: number; m?: number }) => {
      const dt = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth() - (offset.m ?? 0),
          today.getUTCDate() - (offset.d ?? 0),
        ),
      );
      return dt.toISOString().slice(0, 10);
    };
    // Run in UTC so "today in zone" matches the local UTC date.
    expect(periodStartDate("week", "UTC")).toBe(utcDate({ d: 7 }));
    expect(periodStartDate("month", "UTC")).toBe(utcDate({ m: 1 }));
  });

  it("returns a YYYY-MM-DD date string", () => {
    expect(periodStartDate("month", "America/New_York")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});
