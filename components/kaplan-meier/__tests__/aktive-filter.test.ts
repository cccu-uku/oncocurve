import { describe, expect, it } from "vitest";
import { aktiveFilterEintraege, entferneFilterTag, type AktiveFilterWerte } from "../filters/aktive-filter";

const leer: AktiveFilterWerte = {
  selectedGender: [],
  selectedAgeGroup: [],
  selectedICD10Codes: [],
  selectedTumorCategories: [],
  selectedStaging: [],
  selectedGrading: [],
  selectedYearRange: { start: null, end: null },
  selectedPrimaryCase: [],
  selectedSpreadCategory: [],
};

describe("aktiveFilterEintraege", () => {
  it("liefert keine Einträge ohne aktive Filter", () => {
    expect(aktiveFilterEintraege(leer)).toEqual([]);
  });

  it("liefert einen Eintrag je Wert, nicht einen je Kategorie", () => {
    const filter: AktiveFilterWerte = { ...leer, selectedGender: ["male", "female"] };
    const eintraege = aktiveFilterEintraege(filter);
    expect(eintraege).toEqual([
      { id: "gender:male", kategorie: "gender", wert: "male" },
      { id: "gender:female", kategorie: "gender", wert: "female" },
    ]);
  });

  it("liefert genau einen Eintrag für das Jahresfenster, auch mit nur einer Grenze", () => {
    const filter: AktiveFilterWerte = { ...leer, selectedYearRange: { start: 2015, end: null } };
    expect(aktiveFilterEintraege(filter)).toEqual([{ id: "yearRange", kategorie: "yearRange", wert: "" }]);
  });

  it("übergeht ein leeres Jahresfenster", () => {
    expect(aktiveFilterEintraege({ ...leer, selectedYearRange: { start: null, end: null } })).toEqual([]);
  });
});

describe("entferneFilterTag", () => {
  it("entfernt nur den benannten Wert, nicht die übrigen derselben Kategorie", () => {
    const filter: AktiveFilterWerte = { ...leer, selectedGender: ["male", "female"] };
    const ergebnis = entferneFilterTag(filter, "gender:male");
    expect(ergebnis.selectedGender).toEqual(["female"]);
  });

  it("lässt andere Kategorien unangetastet", () => {
    const filter: AktiveFilterWerte = { ...leer, selectedGender: ["male"], selectedStaging: ["II"] };
    const ergebnis = entferneFilterTag(filter, "gender:male");
    expect(ergebnis.selectedStaging).toEqual(["II"]);
  });

  it("leert das Jahresfenster vollständig", () => {
    const filter: AktiveFilterWerte = { ...leer, selectedYearRange: { start: 2015, end: 2020 } };
    const ergebnis = entferneFilterTag(filter, "yearRange");
    expect(ergebnis.selectedYearRange).toEqual({ start: null, end: null });
  });

  it("entfernt einen ICD-10-Code, dessen Wert selbst einen Doppelpunkt enthalten könnte, korrekt über den ersten Doppelpunkt", () => {
    const filter: AktiveFilterWerte = { ...leer, selectedTumorCategories: ["Mamma: invasiv"] };
    const ergebnis = entferneFilterTag(filter, "tumorCategory:Mamma: invasiv");
    expect(ergebnis.selectedTumorCategories).toEqual([]);
  });
});
