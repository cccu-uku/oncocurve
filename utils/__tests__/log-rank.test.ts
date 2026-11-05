import { describe, it, expect } from "vitest";
import { logRankTest, type SurvivalDataPoint } from "../kaplan-meier";

// Two simple curves: group A has earlier events, group B has later events.
// Same times so the test loop iterates all of them once.
const curveA: SurvivalDataPoint[] = [
  { time: 6,  probability: 0.8, atRisk: 50, events: 10 },
  { time: 12, probability: 0.6, atRisk: 40, events:  8 },
  { time: 24, probability: 0.5, atRisk: 32, events:  6 },
  { time: 36, probability: 0.4, atRisk: 26, events:  5 },
];
const curveB: SurvivalDataPoint[] = [
  { time: 6,  probability: 0.95, atRisk: 50, events: 2 },
  { time: 12, probability: 0.85, atRisk: 48, events: 4 },
  { time: 24, probability: 0.70, atRisk: 44, events: 6 },
  { time: 36, probability: 0.55, atRisk: 38, events: 8 },
];

describe("logRankTest weighting variants", () => {
  it("standard log-rank is the default", () => {
    const r = logRankTest([curveA, curveB], ["A", "B"]);
    expect(r?.method).toBe("logRank");
  });

  it("emits the requested method on the result", () => {
    expect(logRankTest([curveA, curveB], undefined, { method: "wilcoxon" })?.method).toBe("wilcoxon");
    expect(logRankTest([curveA, curveB], undefined, { method: "petoPeto" })?.method).toBe("petoPeto");
    expect(logRankTest([curveA, curveB], undefined, { method: "taroneWare" })?.method).toBe("taroneWare");
  });

  it("Wilcoxon, Peto-Peto, Tarone-Ware produce different chi-squared than standard", () => {
    const std = logRankTest([curveA, curveB])!;
    const wil = logRankTest([curveA, curveB], undefined, { method: "wilcoxon" })!;
    const peto = logRankTest([curveA, curveB], undefined, { method: "petoPeto" })!;
    const tw = logRankTest([curveA, curveB], undefined, { method: "taroneWare" })!;
    expect(std.chiSquared).toBeGreaterThan(0);
    expect(wil.chiSquared).toBeGreaterThan(0);
    expect(peto.chiSquared).toBeGreaterThan(0);
    expect(tw.chiSquared).toBeGreaterThan(0);
    // Each weighting changes the statistic. They should not be identical.
    expect(wil.chiSquared).not.toBeCloseTo(std.chiSquared, 5);
    expect(peto.chiSquared).not.toBeCloseTo(std.chiSquared, 5);
    expect(tw.chiSquared).not.toBeCloseTo(std.chiSquared, 5);
  });

  it("Wilcoxon emphasises early events: when early events dominate, Wilcoxon chi2 > log-rank", () => {
    // curveA has heavy early events vs curveB - Wilcoxon should detect this
    // more strongly than the uniform log-rank.
    const std = logRankTest([curveA, curveB])!;
    const wil = logRankTest([curveA, curveB], undefined, { method: "wilcoxon" })!;
    expect(wil.chiSquared).toBeGreaterThan(std.chiSquared);
  });

  it("returns null for fewer than two curves", () => {
    expect(logRankTest([curveA])).toBeNull();
  });

  it("df = K - 1 for K groups", () => {
    expect(logRankTest([curveA, curveB])!.df).toBe(1);
    expect(logRankTest([curveA, curveB, curveA])!.df).toBe(2);
  });

  it("a zero-event stratum must stay in the test to match R's survdiff: it changes chi2 and df", () => {
    // curveC has real patients at risk but no events at any time - a
    // censored-only group. R's survdiff and lifelines' multivariate_logrank_test
    // both keep such groups in the comparison; they contribute through their
    // O-E term even without an event of their own. Dropping them (as this app
    // used to, in the results page) silently changes df and the statistic.
    const curveC: SurvivalDataPoint[] = [
      { time: 6,  probability: 1, atRisk: 50, events: 0 },
      { time: 12, probability: 1, atRisk: 50, events: 0 },
      { time: 24, probability: 1, atRisk: 50, events: 0 },
      { time: 36, probability: 1, atRisk: 50, events: 0 },
    ];
    const twoGroups = logRankTest([curveA, curveB])!;
    const threeGroups = logRankTest([curveA, curveB, curveC])!;
    expect(threeGroups.df).toBe(2);
    expect(twoGroups.df).toBe(1);
    expect(threeGroups.chiSquared).not.toBeCloseTo(twoGroups.chiSquared, 5);
  });
});

// Regression: correct at-risk pooling when group event times do NOT coincide.
// Reference chi-squared values computed with Python lifelines
// (multivariate_logrank_test). The previous implementation used an exact-time
// at-risk match, which counted other groups as 0-at-risk at non-shared event
// times and produced badly wrong statistics on real data.
const P = (time: number, atRisk: number, events: number): SurvivalDataPoint =>
  ({ time, atRisk, events, probability: 0 });

describe("logRankTest at-risk pooling (non-coincident times)", () => {
  it("Ex1: A events 1,2,3 vs B events 4,5,6 → chi2 ≈ 5.0517 (lifelines)", () => {
    const A = [P(1, 3, 1), P(2, 2, 1), P(3, 1, 1)];
    const B = [P(4, 3, 1), P(5, 2, 1), P(6, 1, 1)];
    const r = logRankTest([A, B], ["A", "B"])!;
    expect(r.chiSquared).toBeCloseTo(5.051661, 3);
    expect(r.pValue).toBeCloseTo(0.0246024, 4);
  });

  it("Ex2: interleaved with censoring → chi2 ≈ 0.0784 (lifelines)", () => {
    const A = [P(2, 4, 1), P(5, 3, 1), P(8, 2, 1), P(10, 1, 0)];
    const B = [P(3, 4, 1), P(6, 3, 1), P(9, 2, 1), P(11, 1, 0)];
    const r = logRankTest([A, B])!;
    expect(r.chiSquared).toBeCloseTo(0.078448, 3);
    expect(r.pValue).toBeCloseTo(0.779412, 3);
  });

  it("Ex3: three groups non-coincident → chi2 ≈ 1.0252 (lifelines)", () => {
    const A = [P(1, 3, 1), P(4, 2, 1), P(7, 1, 1)];
    const B = [P(2, 3, 1), P(5, 2, 1), P(8, 1, 1)];
    const C = [P(3, 3, 1), P(6, 2, 1), P(9, 1, 1)];
    const r = logRankTest([A, B, C])!;
    expect(r.chiSquared).toBeCloseTo(1.025219, 3);
    expect(r.df).toBe(2);
  });

  it("weighted variants match the standard Tarone-Ware family on Ex1", () => {
    // Reference chi-squared from an independent implementation of the standard
    // weighted log-rank with corrected risk sets (weights: 1 / n / sqrt(n) /
    // S~(t-)). Confirms the variant arithmetic, not just that they differ.
    const A = [P(1, 3, 1), P(2, 2, 1), P(3, 1, 1)];
    const B = [P(4, 3, 1), P(5, 2, 1), P(6, 1, 1)];
    expect(logRankTest([A, B], undefined, { method: "logRank" })!.chiSquared).toBeCloseTo(5.051661, 3);
    expect(logRankTest([A, B], undefined, { method: "wilcoxon" })!.chiSquared).toBeCloseTo(4.5, 3);
    expect(logRankTest([A, B], undefined, { method: "taroneWare" })!.chiSquared).toBeCloseTo(4.792896, 3);
    expect(logRankTest([A, B], undefined, { method: "petoPeto" })!.chiSquared).toBeCloseTo(4.60258, 3);
  });

  it("collapses the worker's duplicated step rows (horizontal segments)", () => {
    // Same as Ex1 but with horizontal-segment rows (time = nextReal - 0.01,
    // SAME atRisk, events 0) interleaved, as the worker emits them.
    const A = [
      P(1, 3, 1), P(1.99, 3, 0), P(2, 2, 1), P(2.99, 2, 0), P(3, 1, 1),
    ];
    const B = [
      P(4, 3, 1), P(4.99, 3, 0), P(5, 2, 1), P(5.99, 2, 0), P(6, 1, 1),
    ];
    const r = logRankTest([A, B])!;
    expect(r.chiSquared).toBeCloseTo(5.051661, 3); // identical to clean Ex1
  });
});

// Regression: p-value must not underflow to exactly 0 for a large chi-squared.
// Before the fix, the log-rank p-value was computed as 1 - chi2Cdf(chi2, df).
// chi2Cdf's continued-fraction branch computes the upper tail Q correctly but
// then returns 1 - Q, so the caller's outer "1 -" cancels it right back: once
// Q is small enough that 1 - Q rounds to exactly 1.0 in double precision, the
// reported p-value becomes exactly 0 even though the true value is a tiny
// nonzero number (R reports 2.22e-30 for a chi2 of 136.56 with df = 2).
describe("logRankTest p-value does not underflow for large chi-squared", () => {
  it("stays strictly between 0 and 1e-20 when the separation is extreme", () => {
    // Two large, essentially non-overlapping groups: almost all events happen
    // early in A and almost all events happen late in B. This drives the
    // log-rank chi-squared well above 100.
    const extremeA: SurvivalDataPoint[] = [
      { time: 1, probability: 0.02, atRisk: 500, events: 490 },
      { time: 2, probability: 0.01, atRisk: 10,  events: 9 },
    ];
    const extremeB: SurvivalDataPoint[] = [
      { time: 1, probability: 1.0,  atRisk: 500, events: 0 },
      { time: 2, probability: 0.98, atRisk: 500, events: 1 },
      { time: 50, probability: 0.02, atRisk: 499, events: 490 },
    ];
    const r = logRankTest([extremeA, extremeB], ["A", "B"])!;
    expect(r.chiSquared).toBeGreaterThan(100);
    expect(r.pValue).toBeGreaterThan(0);
    expect(r.pValue).toBeLessThan(1e-20);
  });

  it("stays a sane probability in the ordinary case", () => {
    const r = logRankTest([curveA, curveB])!;
    expect(r.pValue).toBeGreaterThan(0);
    expect(r.pValue).toBeLessThan(1);
  });
});
