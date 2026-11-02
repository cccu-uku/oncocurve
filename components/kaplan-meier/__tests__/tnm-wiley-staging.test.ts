import { describe, it, expect } from "vitest";
import {
  findEntityByTumorCategory,
  getWileyStaging,
  getAllStagesForEntity,
  type WileyEntity,
} from "../tnm-wiley-staging";

// Erwartete Stadien aus den Stadiengruppierungen der TNM-Klassifikation, 9. Auflage.

function entity(category: string, icd10?: string, age?: number): WileyEntity {
  const found = findEntityByTumorCategory(category, icd10, age);
  if (!found) throw new Error(`keine Entität für ${category} / ${icd10}`);
  return found;
}

describe("findEntityByTumorCategory", () => {
  it("findet die Entität über den ICD-10-Code", () => {
    expect(entity("", "C11").entity).toBe("Nasopharynx");
  });

  it("bevorzugt den ICD-10-Code vor dem Kategorienamen", () => {
    expect(entity("Lunge", "C50.4").entity).toBe("Breast Tumours");
  });

  it.each([
    ["C16.2", "Stomach"],
    ["C25.0", "Pancreas"],
    ["C17.0", "Small Intestine"],
    ["C18.1", "Appendix"],
    ["C18.3", "Colon and Rectum"],
    ["C20", "Colon and Rectum"],
    ["C31.1", "Nasal Cavity and Paranasal Sinuses"],
    ["C44.3", "Carcinoma of Skin of the Head and Neck Region"],
    ["C53.9", "Cervix Uteri"],
    ["C61", "Prostate"],
  ])("ordnet %s dem Karzinom-Schema %s zu, nicht einer NET-, Sarkom- oder Melanom-Variante", (icd10, expected) => {
    expect(entity("", icd10).entity).toBe(expected);
  });

  it.each([
    ["C15.4", "Oesophagus - Adenocarcinoma"],
    ["C73", "Thyroid Gland - Papillary or Follicular (55 Years and Older)"],
    ["C10.9", "HPV-Independent Oropharynx and Hypopharynx"],
  ])("verwendet für mehrdeutige Codes die Standardvariante (%s -> %s)", (icd10, expected) => {
    expect(entity("", icd10).entity).toBe(expected);
  });

  it("ordnet deutsche Kategorienamen zu", () => {
    expect(entity("Mamma (incl. DCIS)").entity).toBe("Breast Tumours");
    expect(entity("Prostata").entity).toBe("Prostate");
  });

  it("wählt bei Schilddrüsenkarzinomen die Entität nach Alter", () => {
    expect(entity("Schilddrüse", "C73.9", 40).entity).toBe("Thyroid Gland - Papillary and Follicular (<55 Years)");
    expect(entity("Schilddrüse", "C73.9", 70).entity).toBe("Thyroid Gland - Papillary or Follicular (55 Years and Older)");
  });

  it("normalisiert ICD-10-Codes vor der Altersunterscheidung (Kleinschreibung, Leerzeichen)", () => {
    expect(entity("", " c73.9", 40).entity).toBe("Thyroid Gland - Papillary and Follicular (<55 Years)");
  });

  it("liefert null für unbekannte Kategorien ohne ICD-10-Code", () => {
    expect(findEntityByTumorCategory("xyz")).toBeNull();
  });
});

describe("getWileyStaging", () => {
  it.each([
    ["T1", "N0", "M0", "IA"],
    ["T2", "N1", "M0", "IB"],
    ["T4", "N2", "M0", "III"],
    ["T1", "N1", "M1b", "IVB"],
  ])("Nasopharynx %s %s %s -> %s", (t, n, m, stage) => {
    expect(getWileyStaging(entity("", "C11"), t, n, m)).toBe(stage);
  });

  it("unterscheidet klinische und pathologische Gruppierung (HPV-assoziierter Oropharynx, T4 N0 M0)", () => {
    const oropharynx = entity("Oropharynx - HPV Associated");
    expect(getWileyStaging(oropharynx, "cT4", "cN0", "M0")).toBe("IV");
    expect(getWileyStaging(oropharynx, "pT4", "pN0", "M0")).toBe("III");
  });

  it.each([
    ["pT1", "pN0", "M0", "IA"],
    ["pT2", "pN1", "cM0", "IIA"],
    ["cT3", "cN0", "M0", "IIB"],
  ])("Magen %s %s %s -> %s", (t, n, m, stage) => {
    expect(getWileyStaging(entity("Magen", "C16.2"), t, n, m)).toBe(stage);
  });

  it("lässt ein abweichendes Präfix nicht auf eine präfixierte Regel passen (Prostata cT2 vs. pT2)", () => {
    const prostate = entity("Prostata", "C61");
    expect(getWileyStaging(prostate, "pT2", "pN0", "M0")).toBe("II");
    expect(getWileyStaging(prostate, "pT3", "pN0", "M0")).toBe("III");
    expect(getWileyStaging(prostate, "cT2b", "cN0", "M0")).toBe("II");
  });

  it("richtet Schilddrüsenkarzinome unter 55 Jahren nur nach M aus", () => {
    const thyroid = entity("Schilddrüse", "C73.9", 40);
    expect(getWileyStaging(thyroid, "pT3", "pN1", "M0")).toBe("I");
    expect(getWileyStaging(thyroid, "pT1", "pN0", "M1")).toBe("II");
  });

  it("berechnet kein Stadium ohne c/p-Präfix, wenn die Entität klinisch und pathologisch getrennt gruppiert", () => {
    expect(getWileyStaging(entity("Prostata", "C61"), "T2", "N0", "M0")).toBeNull();
    // Gemischte Tabelle: ohne Präfix würde sonst die untypisierte Zeile "III" greifen
    expect(getWileyStaging(entity("", "C77.0"), "T0", "N1", "M0")).toBeNull();
    expect(getWileyStaging(entity("", "C77.0"), "T0", "cN1", "M0")).toBe("I");
  });

  it("liefert null bei unvollständigem TNM", () => {
    expect(getWileyStaging(entity("", "C11"), "T1", null, "M0")).toBeNull();
  });
});

describe("getAllStagesForEntity", () => {
  it("sortiert die Stadien in klinischer Reihenfolge", () => {
    expect(getAllStagesForEntity(entity("Kolon"))).toEqual([
      "0", "I", "II", "IIA", "IIB", "IIC", "III", "IIIA", "IIIB", "IIIC", "IV", "IVA", "IVB", "IVC",
    ]);
  });
});
