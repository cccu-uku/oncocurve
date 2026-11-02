import { describe, it, expect } from "vitest";
import { convertTimeUnit, DAYS_PER_MONTH, xAxisPlotRange } from "../kaplan-meier";

describe("convertTimeUnit", () => {
  it("is a no-op when from and to match", () => {
    expect(convertTimeUnit(42, "months", "months")).toBe(42);
    expect(convertTimeUnit(42, "days", "days")).toBe(42);
  });

  it("converts days to months", () => {
    expect(convertTimeUnit(DAYS_PER_MONTH, "days", "months")).toBeCloseTo(1, 10);
  });

  it("converts months to days", () => {
    expect(convertTimeUnit(1, "months", "days")).toBeCloseTo(DAYS_PER_MONTH, 10);
  });

  it("round-trips", () => {
    const v = 123.4;
    const roundTripped = convertTimeUnit(convertTimeUnit(v, "days", "months"), "months", "days");
    expect(roundTripped).toBeCloseTo(v, 6);
  });
});

describe("xAxisPlotRange", () => {
  it("buffers the left edge by half the tick step so 0 doesn't sit on the axis line", () => {
    const [start, end] = xAxisPlotRange([0, 12, 24, 36], 36);
    expect(start).toBe(-6);
    expect(end).toBe(36);
  });

  it("scales the buffer with large tick steps instead of staying fixed", () => {
    const [start] = xAxisPlotRange([0, 60, 120, 180, 240, 300, 360, 420], 420);
    expect(start).toBe(-30);
  });

  it("falls back to maxTick when only one tick is given", () => {
    const [start, end] = xAxisPlotRange([0], 0);
    expect(start).toBeLessThanOrEqual(0);
    expect(end).toBe(0);
  });
});
