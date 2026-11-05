import { describe, it, expect } from "vitest";
import { runCoxRegression, type CoxPatient } from "../cox-regression";

// Reference values from lifelines 0.30.3 (CoxPHFitter, Efron ties, reference
// group "A"). The dataset uses integer survival times so several event times are
// tied, exercising the Efron tie correction. Times are in months.
//
// Regenerate the reference with:
//   import numpy as np, pandas as pd; from lifelines import CoxPHFitter
//   d = pd.get_dummies(df, columns=["group"], drop_first=True)
//   CoxPHFitter().fit(d, "time", "event")   # Efron is the default
//
// lifelines result (ref=A):
//   group_B: coef=-0.683704 HR=0.504744 se=0.372511 p=0.066447
//   group_C: coef=-0.546782 HR=0.578809 se=0.406984 p=0.179111
//   partial logLik=-129.200257, n=60, events=42
const RAW: [number, number, string][] = [[31,1,"A"],[26,1,"A"],[12,1,"A"],[1,1,"A"],[26,1,"A"],[25,1,"A"],[37,1,"A"],[27,0,"A"],[88,0,"A"],[18,1,"A"],[5,1,"A"],[47,1,"A"],[57,0,"A"],[24,1,"A"],[3,0,"A"],[16,1,"A"],[28,1,"A"],[1,1,"A"],[14,1,"A"],[95,1,"A"],[195,1,"B"],[17,0,"B"],[28,1,"B"],[78,1,"B"],[14,1,"B"],[8,0,"B"],[12,1,"B"],[113,1,"B"],[54,1,"B"],[57,1,"B"],[16,1,"B"],[64,1,"B"],[4,1,"B"],[73,1,"B"],[45,1,"B"],[78,0,"B"],[31,1,"B"],[52,1,"B"],[13,1,"B"],[87,0,"B"],[3,1,"C"],[32,1,"C"],[48,1,"C"],[2,0,"C"],[56,0,"C"],[18,0,"C"],[2,0,"C"],[11,0,"C"],[15,1,"C"],[81,0,"C"],[73,1,"C"],[31,1,"C"],[41,0,"C"],[43,1,"C"],[10,0,"C"],[1,0,"C"],[71,1,"C"],[21,1,"C"],[2,0,"C"],[47,1,"C"]];

const patients: CoxPatient[] = RAW.map(([t, e, g]) => ({ survivalTime: t, event: e === 1, group: g }));

describe("runCoxRegression vs lifelines (Efron, ties)", () => {
  const summary = runCoxRegression(patients, { reference: "A" })!;

  it("returns a fitted, converged model", () => {
    expect(summary).not.toBeNull();
    expect(summary.referenceGroup).toBe("A");
    expect(summary.modelStats.converged).toBe(true);
    expect(summary.modelStats.nObservations).toBe(60);
    expect(summary.modelStats.nEvents).toBe(42);
  });

  it("matches lifelines coefficients / HR / SE / p for group B", () => {
    const b = summary.results.find(r => r.group === "B")!;
    expect(b.coefficient).toBeCloseTo(-0.683704, 4);
    expect(b.hazardRatio).toBeCloseTo(0.504744, 4);
    expect(b.standardError).toBeCloseTo(0.372511, 4);
    expect(b.pValue).toBeCloseTo(0.066447, 3);
  });

  it("matches lifelines coefficients / HR / SE / p for group C", () => {
    const c = summary.results.find(r => r.group === "C")!;
    expect(c.coefficient).toBeCloseTo(-0.546782, 4);
    expect(c.hazardRatio).toBeCloseTo(0.578809, 4);
    expect(c.standardError).toBeCloseTo(0.406984, 4);
    expect(c.pValue).toBeCloseTo(0.179111, 3);
  });

  it("matches the lifelines partial log-likelihood", () => {
    expect(summary.modelStats.logLikelihood).toBeCloseTo(-129.200257, 3);
  });
});

describe("runCoxRegression flags zero-event groups as not estimable", () => {
  // Group "Zero" has patients but no events at all: complete separation, the
  // true HR is 0 and the coefficient diverges. The numeric HR the optimiser
  // reports is an artifact of where it stopped, not a real estimate.
  const zeroEventPatients: CoxPatient[] = [
    { survivalTime: 10, event: true, group: "Ref" },
    { survivalTime: 20, event: true, group: "Ref" },
    { survivalTime: 30, event: false, group: "Ref" },
    { survivalTime: 15, event: true, group: "Ref" },
    { survivalTime: 40, event: false, group: "Zero" },
    { survivalTime: 50, event: false, group: "Zero" },
    { survivalTime: 60, event: false, group: "Zero" },
  ];

  const summary = runCoxRegression(zeroEventPatients, { reference: "Ref" })!;

  it("marks the zero-event group as not estimable", () => {
    const zero = summary.results.find(r => r.group === "Zero")!;
    expect(zero.events).toBe(0);
    expect(zero.notEstimable).toBe(true);
  });

  it("leaves the normal reference group estimable", () => {
    const ref = summary.results.find(r => r.group === "Ref")!;
    expect(ref.notEstimable).toBe(false);
  });
});

describe("vollständige Trennung trotz vorhandener Ereignisse", () => {
  // Jede Gruppe hat Ereignisse, aber sie folgen streng der Gruppenzugehörigkeit:
  // erst stirbt die eine Gruppe geschlossen, dann die andere. Der Koeffizient
  // läuft davon, der Standardfehler wächst mit, und heraus kommt ein Hazard
  // Ratio in Milliardenhöhe mit dem Intervall von null bis unendlich und p = 1.
  // Genau diese Zahlen standen zuvor im Forest-Plot, als wären sie ein
  // Ergebnis.
  const getrennt: CoxPatient[] = [
    { survivalTime: 1, event: true, group: "Früh" },
    { survivalTime: 2, event: true, group: "Früh" },
    { survivalTime: 3, event: true, group: "Früh" },
    { survivalTime: 4, event: true, group: "Früh" },
    { survivalTime: 100, event: true, group: "Spät" },
    { survivalTime: 101, event: true, group: "Spät" },
    { survivalTime: 102, event: true, group: "Spät" },
    { survivalTime: 103, event: true, group: "Spät" },
  ];

  const summary = runCoxRegression(getrennt, { reference: "Spät" })!;

  it("meldet die Gruppe als nicht schätzbar, obwohl sie Ereignisse hat", () => {
    const frueh = summary.results.find(r => r.group === "Früh")!;
    expect(frueh.events).toBeGreaterThan(0);
    expect(frueh.notEstimable).toBe(true);
  });

  it("erkennt sie an ihrem Konfidenzintervall, nicht an einer gewählten Schranke", () => {
    const frueh = summary.results.find(r => r.group === "Früh")!;
    const unbrauchbar = !isFinite(frueh.ciUpper) || frueh.ciLower <= 0;
    expect(unbrauchbar).toBe(true);
  });
});
