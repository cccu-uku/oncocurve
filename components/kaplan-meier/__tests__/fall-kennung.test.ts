import { describe, expect, it } from "vitest";
import { fallKennung, zeilenSchluessel } from "../fall-kennung";
import type { Patient } from "../obds-parser-new";

function patient(teile: Partial<Patient> = {}): Patient {
  return { id: "P1", ...teile } as Patient;
}

describe("fallKennung", () => {
  it("trennt Patienten- und Fallnummer einer Boxkohorte", () => {
    const p = patient({
      id: "012933-0001234",
      oncoBox: { patientId: "012933", caseId: "0001234" },
    } as Partial<Patient>);
    expect(fallKennung(p)).toEqual({ patientId: "012933", caseId: "0001234" });
  });

  it("liest die Felder, statt die Kennung am Bindestrich zu zerlegen", () => {
    // Bei den 2.0-Boxen enthält die Fallnummer die Patientennummer bereits,
    // die Zeilenkennung ist dann die Fallnummer allein. Ein Trennen am
    // Bindestrich träfe hier die falsche Stelle.
    const p = patient({
      id: "1.2",
      oncoBox: { patientId: "1", caseId: "1.2" },
    } as Partial<Patient>);
    expect(fallKennung(p)).toEqual({ patientId: "1", caseId: "1.2" });
  });

  it("lässt die Fallnummer ausserhalb der OncoBoxen leer", () => {
    expect(fallKennung(patient({ id: "A-17" }))).toEqual({ patientId: "A-17", caseId: "" });
  });

  it("kommt ohne Kennung aus", () => {
    expect(fallKennung(patient({ id: undefined }))).toEqual({ patientId: "", caseId: "" });
  });
});

describe("zeilenSchluessel", () => {
  it("unterscheidet zwei Fälle derselben Person", () => {
    expect(zeilenSchluessel("012933", "0001234")).not.toBe(zeilenSchluessel("012933", "0001235"));
  });

  it("verwechselt keine Zerlegung, die dieselbe Zeichenkette ergäbe", () => {
    // Ohne Trennzeichen wären "AB" + "C" und "A" + "BC" derselbe Schlüssel.
    expect(zeilenSchluessel("AB", "C")).not.toBe(zeilenSchluessel("A", "BC"));
  });

  it("verträgt fehlende Teile", () => {
    expect(zeilenSchluessel(undefined, null)).toBe(zeilenSchluessel("", ""));
  });

  it("bleibt ohne Fallnummer die Patientennummer allein", () => {
    // Gewöhnliche Uploads führen keine Fallnummer. Käme dort ein Trennzeichen
    // dazu, fände die Datumsverschiebung der pseudonymisierten Exporte ihre
    // Rohdaten nicht mehr.
    expect(zeilenSchluessel("P1", "")).toBe("P1");
    expect(zeilenSchluessel("P1", undefined)).toBe("P1");
  });
});
