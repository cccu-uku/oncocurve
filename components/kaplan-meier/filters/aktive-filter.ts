/** Nur die Felder, die diese Zuordnung braucht: dieselbe Form wie FilterState
 * in der Ergebnisseite, aber ohne Abhängigkeit von dort. */
export interface AktiveFilterWerte {
  selectedGender: string[];
  selectedAgeGroup: string[];
  selectedICD10Codes: string[];
  selectedTumorCategories: string[];
  selectedStaging: string[];
  selectedGrading: string[];
  selectedYearRange: { start: number | null; end: number | null };
  selectedPrimaryCase: string[];
  selectedSpreadCategory: string[];
}

export type FilterKategorie =
  | "gender"
  | "ageGroup"
  | "icd10"
  | "tumorCategory"
  | "staging"
  | "grading"
  | "primaryCase"
  | "spread"
  | "yearRange";

/**
 * Eine einzelne aktive Filterausprägung, ein Eintrag je Wert: ein Tag muss
 * genau einen Wert entfernen können, ohne die übrigen Werte derselben
 * Kategorie anzutasten. Das Jahresfenster ist kein Wertesatz, sondern ein
 * einzelner Bereich, und bekommt deshalb genau einen Eintrag ohne eigenen
 * Wert; die Beschriftung dafür baut die Aufrufseite aus dem Bereich selbst.
 */
export interface AktiverFilterEintrag {
  id: string;
  kategorie: FilterKategorie;
  wert: string;
}

/** Alle aktiven Filter als atomare, einzeln entfernbare Einträge. */
export function aktiveFilterEintraege(filter: AktiveFilterWerte): AktiverFilterEintrag[] {
  const eintraege: AktiverFilterEintrag[] = [];
  const werteHinzufuegen = (kategorie: FilterKategorie, werte: string[]) => {
    for (const wert of werte) eintraege.push({ id: `${kategorie}:${wert}`, kategorie, wert });
  };
  werteHinzufuegen("gender", filter.selectedGender);
  werteHinzufuegen("ageGroup", filter.selectedAgeGroup);
  werteHinzufuegen("icd10", filter.selectedICD10Codes);
  werteHinzufuegen("tumorCategory", filter.selectedTumorCategories);
  werteHinzufuegen("staging", filter.selectedStaging);
  werteHinzufuegen("grading", filter.selectedGrading);
  werteHinzufuegen("primaryCase", filter.selectedPrimaryCase);
  werteHinzufuegen("spread", filter.selectedSpreadCategory);
  if (filter.selectedYearRange.start || filter.selectedYearRange.end) {
    eintraege.push({ id: "yearRange", kategorie: "yearRange", wert: "" });
  }
  return eintraege;
}

/**
 * Entfernt genau den Filter, den ein Tag benennt; jede andere Kategorie und
 * jeder andere Wert derselben Kategorie bleibt unverändert. Die id kommt
 * unverändert aus aktiveFilterEintraege zurück.
 */
export function entferneFilterTag(filter: AktiveFilterWerte, tagId: string): AktiveFilterWerte {
  if (tagId === "yearRange") {
    return { ...filter, selectedYearRange: { start: null, end: null } };
  }
  const trennstelle = tagId.indexOf(":");
  const kategorie = tagId.slice(0, trennstelle) as FilterKategorie;
  const wert = tagId.slice(trennstelle + 1);
  const ohneWert = (liste: string[]) => liste.filter((eintrag) => eintrag !== wert);
  switch (kategorie) {
    case "gender":
      return { ...filter, selectedGender: ohneWert(filter.selectedGender) };
    case "ageGroup":
      return { ...filter, selectedAgeGroup: ohneWert(filter.selectedAgeGroup) };
    case "icd10":
      return { ...filter, selectedICD10Codes: ohneWert(filter.selectedICD10Codes) };
    case "tumorCategory":
      return { ...filter, selectedTumorCategories: ohneWert(filter.selectedTumorCategories) };
    case "staging":
      return { ...filter, selectedStaging: ohneWert(filter.selectedStaging) };
    case "grading":
      return { ...filter, selectedGrading: ohneWert(filter.selectedGrading) };
    case "primaryCase":
      return { ...filter, selectedPrimaryCase: ohneWert(filter.selectedPrimaryCase) };
    case "spread":
      return { ...filter, selectedSpreadCategory: ohneWert(filter.selectedSpreadCategory) };
    default:
      return filter;
  }
}
