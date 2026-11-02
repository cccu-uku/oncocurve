import { describe, it, expect } from "vitest";
import { atRiskTable } from "@/utils/kaplan-meier";

// The worker emits two step rows per distinct event time: a real row (carrying
// the concrete atRisk, events and censored counts it computed from the patients)
// plus a horizontal-segment row (time = nextTime - 0.01) with the SAME atRisk
// and zero events/censored. atRiskTable reads those concrete counts after
// collapsing the staircase pairs, so the duplicated rows never inflate the
// numbers — this is the bug that made the table show ~2x the legend's count.

describe("atRiskTable", () => {
  it("does not double-count the staircase rows (3 events, no ties)", () => {
    // 3 patients, events at 10, 20, 30. 5 staircase rows total.
    const data = [
      { time: 10, atRisk: 3, events: 1, censored: 0 },
      { time: 19.99, atRisk: 3, events: 0, censored: 0 },
      { time: 20, atRisk: 2, events: 1, censored: 0 },
      { time: 29.99, atRisk: 2, events: 0, censored: 0 },
      { time: 30, atRisk: 1, events: 1, censored: 0 },
    ];
    const table = atRiskTable(data, [0, 10, 20, 30, 40]);
    // At-risk must be the true patient counts (3,3,2,1,0), NOT the row count (5).
    expect(table.map(c => c.atRisk)).toEqual([3, 3, 2, 1, 0]);
    expect(table.map(c => c.events)).toEqual([0, 1, 1, 1, 0]);
    expect(table.map(c => c.censored)).toEqual([0, 0, 0, 0, 0]);
  });

  it("counts tied event times via atRisk, not by row count", () => {
    // 4 patients: times 10,10,20,30 (all events). Row count would over-count.
    const data = [
      { time: 10, atRisk: 4, events: 2, censored: 0 },
      { time: 19.99, atRisk: 4, events: 0, censored: 0 },
      { time: 20, atRisk: 2, events: 1, censored: 0 },
      { time: 29.99, atRisk: 2, events: 0, censored: 0 },
      { time: 30, atRisk: 1, events: 1, censored: 0 },
    ];
    const table = atRiskTable(data, [0, 10, 20, 30]);
    expect(table.map(c => c.atRisk)).toEqual([4, 4, 2, 1]);
    expect(table.map(c => c.events)).toEqual([0, 2, 1, 1]);
  });

  it("reads the concrete censored count from the curve", () => {
    // 2 patients: event @10, censored @25 (worker sets censored = size - events).
    const data = [
      { time: 10, atRisk: 2, events: 1, censored: 0 },
      { time: 24.99, atRisk: 2, events: 0, censored: 0 },
      { time: 25, atRisk: 1, events: 0, censored: 1 },
    ];
    const table = atRiskTable(data, [0, 10, 20, 30]);
    expect(table.map(c => c.atRisk)).toEqual([2, 2, 1, 0]);
    expect(table.map(c => c.events)).toEqual([0, 1, 0, 0]);
    expect(table.map(c => c.censored)).toEqual([0, 0, 1, 0]);
  });

  it("returns zeros for an empty curve", () => {
    expect(atRiskTable([], [0, 12, 24])).toEqual([
      { atRisk: 0, events: 0, censored: 0 },
      { atRisk: 0, events: 0, censored: 0 },
      { atRisk: 0, events: 0, censored: 0 },
    ]);
  });
});
