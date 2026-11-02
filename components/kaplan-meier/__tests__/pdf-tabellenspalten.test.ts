import { describe, it, expect } from "vitest";
import { spaltenbreiten, type SpaltenBedarf } from "../pdf-tabellenspalten";

const summe = (b: Record<string, number>) => Object.values(b).reduce((s, w) => s + w, 0);
const bedarf = (inhalt: number, wort: number): SpaltenBedarf => ({ inhalt, wort });

// Gemessen in jsPDF, Helvetica 8 Punkt, für TCGA nach HistologicSubtype.
// wort ist das längste Wort aus Überschrift und Zellen.
const TCGA: Record<string, SpaltenBedarf> = {
  patientId: bedarf(59.2, 59.2),
  events: bedarf(15, 41),
  months: bedarf(31, 31),
  tCategory: bedarf(15, 44),
  primaryCase: bedarf(12, 38),
  icd10: bedarf(20, 25),
  diagnosisDate: bedarf(39, 58),
  vitalDate: bedarf(57, 42),
  stratificationGroup: bedarf(154.7, 95),
};
const ALLE = Object.keys(TCGA);

describe("spaltenbreiten", () => {
  it("gibt jeder Spalte, was ihr Inhalt braucht, wenn alles passt", () => {
    const b = spaltenbreiten(["patientId", "icd10"], TCGA, 515);
    expect(b.patientId).toBeCloseTo(65.2);
    // ICD-10 braucht die Breite seiner Überschrift, nicht die 70 der alten Vorgabe.
    expect(b.icd10).toBeCloseTo(31);
  });

  it("begrenzt eine überlange ID, sie bricht dann um", () => {
    const b = spaltenbreiten(["patientId"], { patientId: bedarf(400, 400) }, 515);
    expect(b.patientId).toBe(150);
  });

  it("begrenzt langen Text, damit er die übrigen Spalten nicht verdrängt", () => {
    const b = spaltenbreiten(["stratificationGroup"], { stratificationGroup: bedarf(300, 95) }, 515);
    expect(b.stratificationGroup).toBe(130);
  });

  it("lässt die volle TCGA-Tabelle auf A4 passen", () => {
    const b = spaltenbreiten(ALLE, TCGA, 515);
    expect(summe(b)).toBeLessThanOrEqual(515 + 1e-9);
    expect(b.patientId).toBeCloseTo(65.2);
  });

  it("nimmt fehlende Breite nur der Spalte mit dem meisten Spielraum", () => {
    // Verteilt auf alle Spalten rutschte das Vitaldatum knapp unter "Nicht
    // verfügbar", und der Text brach in jeder Zeile um.
    const b = spaltenbreiten(ALLE, TCGA, 515);
    expect(b.vitalDate).toBeCloseTo(63);
    expect(b.stratificationGroup).toBeLessThan(130);
    expect(summe(b)).toBeCloseTo(515);
  });

  it("bricht keine Zahl um, auch wenn es eng wird", () => {
    const b = spaltenbreiten(ALLE, TCGA, 200);
    expect(b.months).toBeGreaterThanOrEqual(31 + 6);
  });

  it("hält jede Spalte über ihrem längsten Wort, auch wenn es dann nicht passt", () => {
    const b = spaltenbreiten(ALLE, TCGA, 200);
    for (const spalte of ALLE) {
      expect(b[spalte]).toBeGreaterThanOrEqual(Math.max(24, TCGA[spalte].wort + 6) - 1e-9);
    }
  });
});
