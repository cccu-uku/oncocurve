// Welche Stratifizierungsgruppe gehört zu einem Patienten?
//
// Diese Zuordnung lag zweimal im Code: einmal auf der Ergebnisseite für Kurven,
// Legende und Tabelle, einmal in der Cox-Analyse. Die zweite Fassung kannte
// sieben Kriterien nicht, die aus Datei- und Boxspalten stammen (cT, pT,
// Primärfall, Lokalisation, Tumor-ID, Start- und Endedatum). Sie fiel dort auf
// "all" zurück, die Regression sah eine einzige Gruppe und meldete, es gebe
// keine Daten, während die Kurve daneben stratifizierte.
//
// null heißt: der Fall gehört nicht in die betrachtete Teilmenge und wird gar
// nicht gezählt. "unknown" heißt: er gehört dazu, die Angabe fehlt aber.

import { getAgeGroup } from "./age-group";
import { parseDateValue } from "./date-utils";
import { type Bin, type ExtraColumnsState, parseNumberWithUnit } from "./extra-columns";
import type { Patient } from "./obds-parser-new";
import type { StratificationCriterion } from "./stratification-control";
import { normalizeTOneDigit, normalizeTTwoDigit } from "./tnm-normalize";
import { findEntityByTumorCategory, getWileyStaging, tnmForStaging } from "./tnm-wiley-staging";

export interface GruppenKontext {
  extraColumns?: ExtraColumnsState;
  /**
   * Vorberechnete Klassen je numerischer Zusatzspalte. Sie gehören in den
   * Kontext und werden nicht hier gebildet: die Quantilsgrenzen hängen davon
   * ab, über welche Fälle sie gebildet wurden, und zwei Aufrufer mit
   * verschiedenen Mengen kämen sonst auf verschiedene Klassen.
   */
  extraBins?: Map<string, Bin[]>;
}

/** Die Gruppe einer Zusatzspalte, kategorial oder über die vorgegebenen Klassen. */
function zusatzspalte(
  patient: Patient,
  spalte: string,
  kontext: GruppenKontext,
): string {
  const meta = kontext.extraColumns?.columns[spalte];
  if (!meta) return "unknown";
  const roh = (patient as { extras?: Record<string, unknown> }).extras?.[spalte];
  if (roh == null || String(roh).trim() === "") return "__missing__";
  if (meta.type === "categorical") return String(roh);

  const gelesen = parseNumberWithUnit(String(roh));
  if (!gelesen) return "__missing__";
  const faktor = meta.conversionFactors?.[gelesen.unit ?? ""]
    ?? (gelesen.unit == null || gelesen.unit === "" ? 1 : NaN);
  if (!isFinite(faktor)) return "__missing__";
  const wert = gelesen.number * faktor;
  const treffer = kontext.extraBins?.get(spalte)?.find((klasse) => klasse.matches(wert));
  return treffer?.id ?? "__missing__";
}

export function patientGruppe(
  patient: Patient,
  criterion: StratificationCriterion,
  kontext: GruppenKontext = {},
): string | null {
  switch (criterion) {
    case "none": return "all";

    case "gender": return patient.gender;
    case "ageGroup": {
      const gruppe = getAgeGroup(patient.age);
      return gruppe === "unknown" ? null : gruppe;
    }

    case "tumorType": return patient.tumorType || "unknown";
    case "tumorCategory": return patient.tumorCategory || "unknown";
    case "tumorMainCategory": return patient.tumorMainCategory;
    case "tumorSubCategory": return patient.tumorSubCategory || "unknown";
    case "spreadCategory": return patient.spreadCategory;

    case "staging": return patient.staging?.uicc || "unknown";
    case "grading": return patient.grading || "unknown";
    case "nCategory": return patient.staging?.nCategory || "unknown";
    case "mCategory": return patient.staging?.mCategory || "unknown";

    case "tCategoryOneDigit":
      return normalizeTOneDigit(patient.staging?.tOneDigit || patient.staging?.tCategory || null);
    case "tCategoryTwoDigit":
      return normalizeTTwoDigit(patient.staging?.tTwoDigit || patient.staging?.tCategory || null);
    case "tPathological": return patient.staging?.tPathological || "unknown";
    case "tPathologicalOneDigit":
      return normalizeTOneDigit(patient.staging?.tPathological || null, "pathological");
    case "tPathologicalTwoDigit":
      return normalizeTTwoDigit(patient.staging?.tPathological || null, "pathological");
    case "tClinical": return patient.staging?.tClinical || "unknown";
    case "tClinicalOneDigit":
      return normalizeTOneDigit(patient.staging?.tClinical || null, "clinical");
    case "tClinicalTwoDigit":
      return normalizeTTwoDigit(patient.staging?.tClinical || null, "clinical");

    // Spalten, die oBDS-, CSV- und Boximporte mitbringen.
    case "cT": return patient.cT || "unknown";
    case "pT": return patient.pT || "unknown";
    case "primaerfall": return patient.primaerfall || "unknown";
    case "lokalisation": return patient.lokalisation || "unknown";
    // String(undefined) ergibt "undefined" und ist wahr: ein Fall ohne
    // Tumor-ID stand bisher in einer Gruppe, die in der Legende "undefined"
    // hiess. Fehlt die Angabe, gilt sie wie überall als unbekannt.
    case "tumorid":
      return patient.tumorid == null || patient.tumorid === "" ? "unknown" : String(patient.tumorid);
    case "startdatum": return patient.startdatum || "unknown";
    case "endedatum": return patient.endedatum || "unknown";

    case "diagnosisYear": {
      // Ohne lesbares Datum das laufende Jahr, wie bisher auf der Seite.
      const datum = parseDateValue(patient.diagnosisDate) ?? new Date();
      return String(datum.getFullYear());
    }

    case "entityStaging": {
      const icd10 = patient.tumorType?.match(/^([CDZ]\d{2})/)?.[1];
      if (!icd10) return "no_match";
      const alter = typeof patient.age === "number" ? patient.age : undefined;
      const entitaet = findEntityByTumorCategory("", icd10, alter);
      if (!entitaet) return "no_match";
      const { t, n, m } = tnmForStaging(patient.staging);
      const stadium = getWileyStaging(entitaet, t, n, m);
      return stadium ? `${icd10}__${stadium}` : "no_match";
    }

    default: {
      if (typeof criterion === "string" && criterion.startsWith("extra:")) {
        return zusatzspalte(patient, criterion.slice("extra:".length), kontext);
      }
      return "unknown";
    }
  }
}
