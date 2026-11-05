import { describe, it, expect } from "vitest";
import { niceTimeTicks } from "../kaplan-meier";

describe("niceTimeTicks", () => {
  it("returns [0] for non-positive input", () => {
    expect(niceTimeTicks(0)).toEqual([0]);
    expect(niceTimeTicks(-12)).toEqual([0]);
  });

  it("uses 3-month steps for a 24-month cohort", () => {
    const t = niceTimeTicks(24, 10);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBe(24);
    // 0, 3, 6, ..., 24
    expect(t).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24]);
  });

  it("uses 12-month steps for a 60-month cohort", () => {
    const t = niceTimeTicks(60, 10);
    expect(t).toEqual([0, 12, 24, 36, 48, 60]);
  });

  it("uses 24-month steps for a 120-month cohort", () => {
    const t = niceTimeTicks(120, 10);
    expect(t).toEqual([0, 24, 48, 72, 96, 120]);
  });

  it("uses 60-month (5y) steps for a 360-month (30y) cohort", () => {
    const t = niceTimeTicks(360, 10);
    expect(t).toEqual([0, 60, 120, 180, 240, 300, 360]);
  });

  it("never produces more than targetCount + 1 ticks", () => {
    for (const m of [12, 30, 100, 200, 480, 1000]) {
      const t = niceTimeTicks(m, 8);
      expect(t.length).toBeLessThanOrEqual(9);
    }
  });

  it("always covers maxTime", () => {
    for (const m of [7, 25, 119, 240, 350, 720]) {
      const t = niceTimeTicks(m, 10);
      expect(t[t.length - 1]).toBeGreaterThanOrEqual(m);
    }
  });

  it("uses day-tuned steps for a ~1-year cohort in days", () => {
    const t = niceTimeTicks(365, 10, "days");
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(365);
    expect(t.length).toBeLessThanOrEqual(11);
  });

  it("uses year-aligned day steps for a large cohort in days", () => {
    // ~20 years of follow-up: steps should land on whole-year day counts.
    const t = niceTimeTicks(7000, 10, "days");
    expect(t[0]).toBe(0);
    const step = t[1] - t[0];
    for (let i = 1; i < t.length; i++) {
      expect(t[i] - t[i - 1]).toBe(step);
    }
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(7000);
    expect(t.length).toBeLessThanOrEqual(11);
  });

  it("defaults to the months candidate set when unit is omitted", () => {
    expect(niceTimeTicks(360, 10)).toEqual(niceTimeTicks(360, 10, "months"));
  });
});
