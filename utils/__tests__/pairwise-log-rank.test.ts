import { describe, it, expect } from "vitest";
import { logRankTest, pairwiseLogRank, type SurvivalDataPoint } from "../kaplan-meier";

// Three groups with clearly different event timing, so the pairwise p-values
// come out distinct enough to reason about.
const early: SurvivalDataPoint[] = [
  { time: 6,  probability: 0.70, atRisk: 60, events: 18 },
  { time: 12, probability: 0.45, atRisk: 42, events: 12 },
  { time: 24, probability: 0.25, atRisk: 30, events: 10 },
];
const middle: SurvivalDataPoint[] = [
  { time: 6,  probability: 0.90, atRisk: 60, events:  6 },
  { time: 12, probability: 0.75, atRisk: 54, events:  8 },
  { time: 24, probability: 0.55, atRisk: 46, events: 10 },
];
const late: SurvivalDataPoint[] = [
  { time: 6,  probability: 0.98, atRisk: 60, events:  1 },
  { time: 12, probability: 0.95, atRisk: 59, events:  2 },
  { time: 24, probability: 0.90, atRisk: 57, events:  3 },
];

// A real group of patients that never had an event (censored only).
const noEvents: SurvivalDataPoint[] = [
  { time: 0,  probability: 1, atRisk: 50, events: 0, censored: 0 },
  { time: 20, probability: 1, atRisk: 50, events: 0, censored: 50 },
];
const noEvents2: SurvivalDataPoint[] = [
  { time: 0,  probability: 1, atRisk: 40, events: 0, censored: 0 },
  { time: 25, probability: 1, atRisk: 40, events: 0, censored: 40 },
];

const key = (r: { groupA: string; groupB: string }) => [r.groupA, r.groupB].sort().join("|");

describe("pairwiseLogRank — pair construction", () => {
  it("produces exactly k(k-1)/2 rows when every group has events", () => {
    expect(pairwiseLogRank([early, middle], ["E", "M"])).toHaveLength(1);
    expect(pairwiseLogRank([early, middle, late], ["E", "M", "L"])).toHaveLength(3);
    expect(pairwiseLogRank([early, middle, late, noEvents], ["E", "M", "L", "N"])).toHaveLength(6);
  });

  it("lists every pair exactly once, never both (A,B) and (B,A)", () => {
    const rows = pairwiseLogRank([early, middle, late], ["E", "M", "L"]);
    const keys = rows.map(key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(keys)).toEqual(new Set(["E|M", "E|L", "L|M"]));
  });

  it("returns an empty array for fewer than two curves", () => {
    expect(pairwiseLogRank([], [])).toEqual([]);
    expect(pairwiseLogRank([early], ["E"])).toEqual([]);
  });

  it("is sorted by raw p-value ascending", () => {
    const rows = pairwiseLogRank([early, middle, late], ["E", "M", "L"]);
    const ps = rows.map(r => r.pValue);
    expect([...ps].sort((a, b) => a - b)).toEqual(ps);
  });
});

describe("pairwiseLogRank — agreement with the underlying test", () => {
  it("raw p-value of a pair equals logRankTest on those two curves", () => {
    const rows = pairwiseLogRank([early, middle, late], ["E", "M", "L"]);
    const row = rows.find(r => key(r) === "E|M")!;
    const direct = logRankTest([early, middle], ["E", "M"])!;
    expect(row.pValue).toBeCloseTo(direct.pValue, 12);
    expect(row.chiSquared).toBeCloseTo(direct.chiSquared, 12);
  });

  it("passes the chosen weighting method through to each comparison", () => {
    const std = pairwiseLogRank([early, middle, late], ["E", "M", "L"]);
    const wil = pairwiseLogRank([early, middle, late], ["E", "M", "L"], { method: "wilcoxon" });
    const stdRow = std.find(r => key(r) === "E|M")!;
    const wilRow = wil.find(r => key(r) === "E|M")!;
    expect(wilRow.chiSquared).not.toBeCloseTo(stdRow.chiSquared, 6);
    const direct = logRankTest([early, middle], ["E", "M"], { method: "wilcoxon" })!;
    expect(wilRow.chiSquared).toBeCloseTo(direct.chiSquared, 12);
  });
});

describe("pairwiseLogRank — Holm correction", () => {
  // Verified by hand against the Holm step-down procedure.
  it("reproduces the worked example", () => {
    const raw = [0.0121, 0.0004, 0.0001, 0.0331, 0.0022, 0.2140];
    const expected = [0.0363, 0.0020, 0.0006, 0.0662, 0.0088, 0.2140];
    const m = raw.length;
    const order = raw.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const adj = new Array<number>(m);
    let running = 0;
    order.forEach(([v, i], k) => {
      running = Math.max(running, Math.min(1, (m - k) * v));
      adj[i] = running;
    });
    adj.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 4));
  });

  it("adjusted values rise monotonically with the raw p-value", () => {
    const rows = pairwiseLogRank([early, middle, late, noEvents], ["E", "M", "L", "N"]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].pValueAdjusted).toBeGreaterThanOrEqual(rows[i - 1].pValueAdjusted);
    }
  });

  it("never exceeds 1 and is never below the raw p-value", () => {
    const rows = pairwiseLogRank([early, middle, late, noEvents], ["E", "M", "L", "N"]);
    for (const r of rows) {
      expect(r.pValueAdjusted).toBeLessThanOrEqual(1);
      expect(r.pValueAdjusted).toBeGreaterThanOrEqual(r.pValue - 1e-12);
    }
  });

  it("leaves the p-value untouched when there is only one comparison", () => {
    const rows = pairwiseLogRank([early, middle], ["E", "M"]);
    expect(rows[0].pValueAdjusted).toBeCloseTo(rows[0].pValue, 12);
  });
});

describe("pairwiseLogRank — groups without events", () => {
  it("compares an event group against a zero-event group and finds the difference", () => {
    // 50 vs 50 patients, 25 events against none: the starkest contrast a cohort
    // can produce, and exactly the row a user wants to see. The global test
    // drops such groups; pairwise deliberately does not.
    const withEvents: SurvivalDataPoint[] = [
      { time: 0,  probability: 1,   atRisk: 50, events:  0, censored: 0 },
      { time: 10, probability: 0.8, atRisk: 50, events: 10, censored: 0 },
      { time: 20, probability: 0.5, atRisk: 40, events: 15, censored: 0 },
    ];
    const rows = pairwiseLogRank([withEvents, noEvents], ["A", "B"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].chiSquared).toBeCloseTo(11.0, 1);
    expect(rows[0].pValue).toBeCloseTo(0.0009, 4);
  });

  it("drops pairs where BOTH groups have no events", () => {
    expect(pairwiseLogRank([noEvents, noEvents2], ["N1", "N2"])).toEqual([]);
    const rows = pairwiseLogRank([early, noEvents, noEvents2], ["E", "N1", "N2"]);
    expect(rows.map(key).sort()).toEqual(["E|N1", "E|N2"]);
  });

  it("corrects using the number of computed pairs, not k(k-1)/2", () => {
    // Three groups, two of them event-free: 3 theoretical pairs, but the
    // N1/N2 pair carries no information and is dropped, so m = 2.
    const rows = pairwiseLogRank([early, noEvents, noEvents2], ["E", "N1", "N2"]);
    expect(rows).toHaveLength(2);
    const smallest = rows[0];
    expect(smallest.pValueAdjusted).toBeCloseTo(Math.min(1, 2 * smallest.pValue), 12);
  });
});
