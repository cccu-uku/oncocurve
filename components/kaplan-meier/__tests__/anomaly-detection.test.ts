import { describe, it, expect } from "vitest";
import { detectAnomalies } from "../anomaly-detection";
import type { Patient } from "../obds-parser-new";

const baseP = (overrides: Partial<Patient>): Patient => ({
  id: "P", gender: "m", age: 50, tumorType: "C50",
  tumorCategory: null, tumorLocation: "C50",
  diagnosisDate: "2020-01-01", survivalTime: 12, event: false,
  vitalStatus: true,
  tumorMainCategory: "solid_other" as any, tumorSubCategory: null,
  isHematological: false, isSolid: true, spreadCategory: "unknown" as any,
  ...overrides,
});

describe("detectAnomalies", () => {
  it("returns empty report for clean cohort", () => {
    const r = detectAnomalies([baseP({ id: "A" }), baseP({ id: "B" })]);
    expect(r.issues).toHaveLength(0);
    expect(r.hasBlockingIssues).toBe(false);
    expect(r.byClass.logic).toEqual([]);
  });

  it("sets hasBlockingIssues when a logic rule triggers", () => {
    const r = detectAnomalies([baseP({ id: "A", age: 200 })]);
    expect(r.hasBlockingIssues).toBe(true);
    expect(r.byClass.logic.some(i => i.ruleId === "age_out_of_range")).toBe(true);
  });

  it("groups multiple issues for the same patient by patientId", () => {
    const r = detectAnomalies([baseP({ id: "A", age: 200, survivalTime: -1 })]);
    expect(r.byPatient.get("A")?.length).toBe(2);
  });

  it("never produces outlier issues (percentile outlier rules removed)", () => {
    // Even a large, spread-out cohort must not yield outlier flags anymore —
    // the circular percentile rules were removed.
    const cohort = Array.from({ length: 100 }, (_, i) =>
      baseP({ id: `P${i}`, age: 30 + (i % 60), diagnosisDate: new Date(1990 + i % 30, 0, 1).toISOString() }));
    const r = detectAnomalies(cohort);
    expect(r.byClass.outlier).toEqual([]);
  });
});
