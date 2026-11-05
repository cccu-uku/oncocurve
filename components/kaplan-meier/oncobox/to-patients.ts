import type { Patient } from "../obds-parser-new";
import { normalizeGender } from "../normalize-gender";
import { deriveTStaging } from "../parse-rows";
import { normalizeTOneDigit, normalizeTTwoDigit } from "../tnm-normalize";
import { categorizeSpread, categorizeTumor } from "../tumor-classification";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import type { OncoBoxCase, OncoBoxMeta } from "./types";

// Die Ergebnisseite liest den Primaerfall als Zeichenkette "1", genau wie der
// oBDS-Parser sie aus dem Feld Zertifizierung setzt. Diese Abbildung laeuft nur
// ueber Primaerfaelle, der Wert ist also konstant.
const PRIMARY_CASE_FLAG = "1";

const DAYS_PER_MONTH = 30.44;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

// Ein Diagnosecode beginnt mit einem Buchstaben und zwei Ziffern. Die 2.0-Boxen
// tragen im selben Feld auch den Platzhalter "N" fuer "Kein Primaertumor,
// Lokalrezidiv"; er darf nicht als Tumorentitaet in die Klassifikation laufen.
// Das ist eine Formpruefung, keine Deutung des Codes.
const DIAGNOSIS_CODE = /^[A-Z]\d{2}/;

function asDiagnosisCode(raw: string | null): string | null {
  if (!raw || !DIAGNOSIS_CODE.test(raw)) return null;
  return raw;
}

/** Ein Fall zählt, wenn er als Primärfall markiert ist. Boxen ohne Marker
 *  fallen auf den Zentrumsfall zurück. */
function countsAsPrimary(item: OncoBoxCase): boolean {
  if (item.isPrimary !== null) return item.isPrimary;
  return item.isCenterCase !== false;
}

/** Sterbedatum, sonst spätestes Follow-up, sonst Diagnosedatum. */
function endDateOf(item: OncoBoxCase): string | null {
  if (item.deathDate) return item.deathDate;
  const dated = item.followUps.filter((followUp) => followUp.date);
  if (dated.length > 0) return dated[dated.length - 1].date;
  return item.diagnosisDate;
}

function monthsBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const days = (Date.parse(end) - Date.parse(start)) / MILLISECONDS_PER_DAY;
  if (Number.isNaN(days) || days < 0) return 0;
  return Math.round(days / DAYS_PER_MONTH);
}

function hasDied(item: OncoBoxCase): boolean {
  if (item.deathDate) return true;
  return item.followUps.some((followUp) => followUp.vitalStatus === "dead");
}

/**
 * Kennung einer Zeile. Die Fallkennung der 2.0-Boxen enthaelt die Patienten-
 * nummer bereits, dort waere eine Zusammensetzung doppelt gemoppelt und
 * ergaebe "1-1.2" statt "1.2". Nur wo sie das nicht tut, wird zusammengesetzt,
 * damit die Kennung ueber die ganze Kohorte eindeutig bleibt.
 */
function caseLabel(item: OncoBoxCase): string {
  if (item.caseId.startsWith(`${item.patientId}.`)) return item.caseId;
  return `${item.patientId}-${item.caseId}`;
}

export function toPatients(cases: OncoBoxCase[], meta: OncoBoxMeta): Patient[] {
  return cases.filter(countsAsPrimary).map((item) => {
    const endDate = endDateOf(item);
    const event = hasDied(item);
    const tumorType = asDiagnosisCode(item.icd10) ?? "Unbekannt";
    const classification = categorizeTumor(tumorType);
    // Die Ergebnisseite und die Stratifizierung lesen die T-Kategorie flach,
    // nicht unter staging.tnm. Der vorhandene Helfer leitet sie so ab wie fuer
    // CSV-Uploads, damit beide Quellen dieselbe Logik durchlaufen.
    const tStaging = deriveTStaging({
      cT: item.staging.cT ?? "",
      pT: item.staging.pT ?? "",
    });

    return {
      id: caseLabel(item),
      // Die Boxen führen M, W, m, w und bei Darm 2.0 zusätzlich D und X.
      // Filter und Legende der Ergebnisseite kennen nur male, female, unknown.
      gender: normalizeGender(item.gender),
      age: item.ageAtDiagnosis ?? 0,
      tumorType,
      tumorCategory: tumorType,
      // Der Diagnosecode gehoert an das eigene Feld. Ohne ihn faellt der
      // Kaplan-Meier-Worker im Tooltip auf tumorLocation zurueck und zeigt
      // dort die Seitenlokalisation, also L oder R, als waere es ein ICD-Code.
      // Dieselbe Formprüfung wie für tumorType: Lunge 2.0 trägt im Feld auch
      // den Platzhalter "N", der sonst als ICD-Code im Tooltip stünde.
      icd10: asDiagnosisCode(item.icd10),
      // tumorLocation meint die Tumorlokalisation, nicht die Seite. Der
      // CSV-Pfad trägt hier ebenfalls den Diagnosecode. Stand hier die Seite,
      // zeigte der Tooltip für jeden Fall ohne gültigen Code ein L oder R,
      // als wäre es der ICD-Code. Die Seite steht in lokalisation.
      tumorLocation: tumorType,
      // Das Stratifizierungskriterium "lokalisation" liest dieses Feld eigens,
      // nicht tumorLocation.
      lokalisation: item.side,
      diagnosisDate: item.diagnosisDate ?? "",
      followupDateString: endDate,
      survivalTime: monthsBetween(item.diagnosisDate, endDate),
      event,
      vitalStatus: !event,
      grading: item.staging.grading,
      isPrimaryCase: true,
      // Tabelle, Filter, PDF-Export und Stratifizierung lesen ausschließlich
      // primaerfall. Ohne dieses Feld meldete die Tabelle fuer jede Zeile
      // "Primaerfall: Nein", waehrend die Kachel darueber sie als Primaerfaelle
      // zaehlte, und der Filter "Primaerfall: ja" lieferte nichts.
      primaerfall: PRIMARY_CASE_FLAG,
      tumorMainCategory: classification.mainCategory,
      tumorSubCategory: classification.subCategory,
      isHematological: classification.isHematological,
      isSolid: classification.isSolid,
      spreadCategory: categorizeSpread({
        tCategory: item.staging.pT ?? item.staging.cT,
        nCategory: item.staging.pN ?? item.staging.cN,
        mCategory: item.staging.pM ?? item.staging.cM,
      }),
      // Die Stratifizierung baut ihre Gruppen aus den flachen Feldern cT und
      // pT, nicht aus staging.tnm.
      cT: item.staging.cT,
      cN: item.staging.cN,
      cM: item.staging.cM,
      pT: item.staging.pT,
      pN: item.staging.pN,
      pM: item.staging.pM,
      staging: {
        tnm: {
          cT: item.staging.cT,
          cN: item.staging.cN,
          cM: item.staging.cM,
          pT: item.staging.pT,
          pN: item.staging.pN,
          pM: item.staging.pM,
        },
        // Spalte T-Kategorie, Staging-Filter und die T-Stratifizierungen lesen
        // diese flachen Felder. Ohne sie blieb die Spalte leer und die
        // Stratifizierungen ergaben eine einzige Gruppe.
        tCategory: tStaging.tCategory,
        tClinical: tStaging.tClinical,
        tPathological: tStaging.tPathological,
        tOneDigit: normalizeTOneDigit(tStaging.tCategory),
        tTwoDigit: normalizeTTwoDigit(tStaging.tCategory),
        nCategory: item.staging.pN ?? item.staging.cN,
        mCategory: item.staging.pM ?? item.staging.cM,
        // Ein UICC-Stadium fuehren die OncoBoxen nicht durchgaengig; Darm 1.0
        // hat eines, die uebrigen nicht. Bewusst nicht geraten.
        uicc: null,
      },
      firstTreatmentDate: null,
      // Ob ein Fall in die DFS-Auswertung gehört, entscheidet ab jetzt die
      // Regel seiner Box. Wo es keine gibt, bleibt es beim bisherigen Halt:
      // ohne Rezidiv- und Metastasendatum zensierte die allgemeine Regel jeden
      // Fall und zeichnete eine Linie auf 100 Prozent, die wie ein Befund
      // aussieht.
      dfsEligible: boxRegelFuer(meta.profileId, "dfs") ? undefined : false,
      extras: {},
      oncoBox: {
        boxType: meta.boxType,
        profileId: meta.profileId,
        schemaVersion: meta.schemaVersion,
        patientId: item.patientId,
        caseId: item.caseId,
        isPrimary: item.isPrimary,
        isCenterCase: item.isCenterCase,
        centerType: item.centerType,
        icd10: item.icd10,
        icdIsTopography: item.icdIsTopography,
        side: item.side,
        deathDate: item.deathDate,
        deathTumorRelated: item.deathTumorRelated,
        followUps: item.followUps,
        distantMets: item.distantMets,
        fall: item,
      },
    };
  });
}
