import { describe, it, expect } from "vitest";
import { parseCSV } from "../csv-parser";
import { categorizeSpread } from "../tumor-classification";

describe("CSV/XLSX import classifies tumor main category and spread instead of hardcoding Unbekannt", () => {
  it("derives tumorMainCategory/subCategory from the ICD-10 tumorType column", () => {
    const csv = `DiagnosisDate,TumorType,DeathDate,Event,TNM_T,TNM_N,TNM_M
11.03.2022,C34.9,22.12.2024,True,cT4,cN2,cM1
`;
    const result = parseCSV(csv);
    expect(result.patients[0].tumorMainCategory).toBe("Solide Tumore");
    expect(result.patients[0].tumorSubCategory).toBe("Lunge");
    expect(result.patients[0].isSolid).toBe(true);
    expect(result.patients[0].isHematological).toBe(false);
  });

  it("derives spreadCategory from T/N/M staging instead of a hardcoded value", () => {
    const csv = `DiagnosisDate,TumorType,DeathDate,Event,TNM_T,TNM_N,TNM_M
11.03.2022,C34.9,22.12.2024,True,cT4,cN2,cM1
15.05.2022,C34.9,,False,cT2,cN0,cM0
`;
    const result = parseCSV(csv);
    expect(result.patients[0].spreadCategory).toBe("Metastasiert"); // M1
    expect(result.patients[1].spreadCategory).toBe("Lokal begrenzt"); // T2 N0 M0
  });

  it("still classifies spread from partial staging (only T known, no N/M columns)", () => {
    // Matches the real-world Munich-style import: only a TNM_T column, no N/M at all.
    const csv = `DiagnosisDate,TumorType,DeathDate,Event,TNM_T
11.03.2022,C34.9,22.12.2024,True,cT4
`;
    const result = parseCSV(csv);
    // Without N/M, T alone cannot resolve "Lokal fortgeschritten" (needs N0/M0
    // confirmed) -> falls back to Unbekannt rather than crashing or miscounting.
    expect(result.patients[0].spreadCategory).toBe("Unbekannt");
  });
});

describe("categorizeSpread (partial-staging behaviour, matches the oBDS XML classifier)", () => {
  it("classifies Metastasiert from M1 alone", () => {
    expect(categorizeSpread({ mCategory: "M1" })).toBe("Metastasiert");
  });

  it("classifies Fortgeschritten from a positive node regardless of M presence", () => {
    expect(categorizeSpread({ nCategory: "N2" })).toBe("Fortgeschritten");
  });

  it("classifies Carcinoma in situ for Tis + N0 + M0", () => {
    expect(categorizeSpread({ tCategory: "Tis", nCategory: "N0", mCategory: "M0" })).toBe("Carcinoma in situ");
  });

  it("still requires N0/M0 to confirm a T-based local category", () => {
    expect(categorizeSpread({ tCategory: "T3" })).toBe("Unbekannt");
    expect(categorizeSpread({ tCategory: "T3", nCategory: "N0", mCategory: "M0" })).toBe("Lokal fortgeschritten");
  });

  it("returns Unbekannt when nothing is known", () => {
    expect(categorizeSpread({})).toBe("Unbekannt");
  });
});
