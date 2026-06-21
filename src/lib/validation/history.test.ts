import { describe, it, expect } from "vitest";

import { historyFilterSchema } from "./history";

describe("historyFilterSchema", () => {
  it("defaults to the past month when omitted", () => {
    const r = historyFilterSchema.safeParse({});
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ period: "month" });
  });

  it("defaults to the past month for an empty string", () => {
    const r = historyFilterSchema.safeParse({ period: "" });
    expect(r.data).toEqual({ period: "month" });
  });

  it("accepts each valid period", () => {
    for (const period of ["week", "month", "year", "all"] as const) {
      expect(historyFilterSchema.safeParse({ period }).data).toEqual({
        period,
      });
    }
  });

  it("falls back to the past month for an unknown period", () => {
    expect(historyFilterSchema.safeParse({ period: "decade" }).data).toEqual({
      period: "month",
    });
  });
});
