import { describe, it, expect } from "vitest";
import { parseRows } from "../parse-rows";

// TTFT (time to first treatment): the firstTreatmentDate column switches the
// endpoint. survivalTime + event are then derived from the dates.
const headers = ["PatientID", "diagnosisDate", "firstTreatmentDate", "lastContactDate", "IGHV"];
const rows = [
  ["P1", "2016-02-10", "2016-11-05", "2022-09-01", "unmutated"], // treated -> event (~9 mo)
  ["P2", "2015-01-15", "", "2023-06-01", "mutated"],             // never treated -> censored (long)
  ["P3", "2016-06-30", "", "2019-02-14", "mutated"],             // death before tx -> censored
];

describe("parseRows TTFT endpoint", () => {
  const res = parseRows(headers, rows);

  it("parses without errors and tags every patient as ttft", () => {
    expect(res.errors).toHaveLength(0);
    expect(res.patients).toHaveLength(3);
    expect(res.patients.every(p => (p as any).endpoint === "ttft")).toBe(true);
  });

  it("treated patient: event=true, TTFT = months from diagnosis to first treatment", () => {
    const p = res.patients.find(p => p.id === "P1")!;
    expect(p.event).toBe(true);
    expect(p.survivalTime).toBe(9); // round(269 days / 30.44)
  });

  it("untreated patients: event=false, censored at last contact", () => {
    const p2 = res.patients.find(p => p.id === "P2")!;
    expect(p2.event).toBe(false);
    expect(p2.survivalTime).toBeGreaterThan(80); // ~101 months observed treatment-free

    // death before treatment is censored at last contact (pragmatic, no Fine-Gray)
    const p3 = res.patients.find(p => p.id === "P3")!;
    expect(p3.event).toBe(false);
    expect(p3.survivalTime).toBeGreaterThan(0);
  });

  it("keeps IGHV as a stratification (extra) column", () => {
    expect(Object.keys(res.extraColumns.columns)).toContain("IGHV");
  });
});
