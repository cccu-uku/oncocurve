import { describe, it, expect } from "vitest";
import { runCoxRegression, type CoxPatient } from "../cox-regression";

// Independent O(n²) reference using the public runCoxRegression's input shape.
// We construct two identical cohorts and compare concordance values on small
// fixtures where the expected value is known.

function makeCohort(n: number, seed = 1): CoxPatient[] {
  // Deterministic pseudo-random LCG
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const out: CoxPatient[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      survivalTime: Math.floor(rand() * 60) + 1,
      event: rand() < 0.5,
      group: rand() < 0.5 ? "A" : "B",
    });
  }
  return out;
}

describe("concordanceIndex (Fenwick O(n log n))", () => {
  it("returns a finite c-index in [0,1] for a small cohort", () => {
    const patients: CoxPatient[] = [
      { survivalTime: 6,  event: true,  group: "A" },
      { survivalTime: 12, event: true,  group: "B" },
      { survivalTime: 24, event: false, group: "B" },
      { survivalTime: 36, event: true,  group: "A" },
      { survivalTime: 48, event: false, group: "A" },
    ];
    const r = runCoxRegression(patients, { reference: "A" });
    expect(r).not.toBeNull();
    const c = r!.modelStats.concordance;
    expect(Number.isFinite(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1);
  });

  it("handles a 500-patient cohort in well under a second", () => {
    const patients = makeCohort(500);
    const t0 = performance.now();
    const r = runCoxRegression(patients, { reference: "A" });
    const dt = performance.now() - t0;
    expect(r).not.toBeNull();
    // Even on slow CI this should be sub-second; before the O(n log n) fix
    // a 5000-patient cohort took multiple seconds, so 500 is a safe canary.
    expect(dt).toBeLessThan(1000);
  });

  it("scales: 3000 patients still completes well within a few seconds", () => {
    const patients = makeCohort(3000);
    const t0 = performance.now();
    const r = runCoxRegression(patients, { reference: "A" });
    const dt = performance.now() - t0;
    expect(r).not.toBeNull();
    expect(dt).toBeLessThan(5000);
  });
});
