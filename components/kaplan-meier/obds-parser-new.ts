/**
 * oBDS (Onkologischer Basisdatensatz) v3.0.4 XML Parser
 * Extracts patient data for survival analysis from oBDS XML files (client-side CSV download)
 */


import { istPrimaerfall } from "./primaerfall";
import { normalizeGender } from "./normalize-gender";
import { HEMATOLOGICAL_TUMOR_CATEGORIES, SOLID_TUMOR_CATEGORIES, type SpreadCategory, type TumorMainCategory } from "./tumor-classification";

export interface Patient {
  id: string;
  gender: string;
  age: number;
  tumorType: string;
  tumorCategory: string | null,
  tumorLocation: string;
  /** Diagnosecode. Der Kaplan-Meier-Worker zeigt ihn im Tooltip und faellt
   *  ohne ihn auf tumorLocation zurueck. */
  icd10?: string | null;
  diagnosisDate: string;
  survivalTime: number; // in months (OS, or TTFT when endpoint === 'ttft')
  event: boolean; // true = event (death / first treatment for TTFT), false = censored
  endpoint?: 'overall' | 'ttft'; // 'ttft' = time to first treatment (set by parser)
  firstTreatmentDate?: string | null; // date of first systemic treatment (TTFT event)
  followupDate?: Date | null;
  followupDateString?: string | null; // Neues Feld für das Follow-up-Datum aus der XML
  vitalStatus: boolean;
  grading?: string | null;
  isPrimaryCase?: boolean;
  tumorMainCategory: TumorMainCategory;
  tumorSubCategory: string| null;
  isHematological: boolean;
  isSolid: boolean;
  spreadCategory: SpreadCategory;
  staging?: {
  tnm?: {
    cT: string | null;
    cN: string | null;
    cM: string | null;
    pT: string | null;
    pN: string | null;
    pM: string | null;
  };
  uicc?: string | null;
  tCategory?: string | null;
  tPathological?: string | null;
  tClinical?: string | null;
  tOneDigit?: string | null;
  tTwoDigit?: string | null;
  nCategory?: string | null;
  mCategory?: string | null;
};

  therapy?: {
    surgery?: boolean;
    chemotherapy?: boolean;
    radiotherapy?: boolean;
    immunotherapy?: boolean;
  };
  // Custom fields
  cT?: string | null;
  cN?: string | null;
  cM?: string | null;
  pT?: string | null;
  pN?: string | null;
  pM?: string | null;
  primaerfall?: string | null;
  lokalisation?: string | null;
  tumorid?: string | number | null;
  startdatum?: string | null;
  endedatum?: string | null;
  TNM_T?: string | null;
  TNM_N?: string | null;
  TNM_M?: string | null;
  
  // DFS (Disease Free Survival) Fields from oBDS
  gesamtbeurteilungErkrankung?: string | null; // z.B. "Vollremission", "Kein Tumor nachweisbar"
  rezidivDatum?: string | null; // Lokalrezidiv-Datum (Wiederauftreten der Krankheit)
  metastasenDatum?: string | null; // Metastasen-Datum (regional oder fern) - Wiederauftreten
  zweitterTumorDatum?: string | null; // Zweittumor-Datum (neuer Tumor, nicht Rezidiv)
  todDatum?: string | null; // Sterbedatum (auch wenn nicht tumorbedingt) - Endpoint
  nachsorgeDatum?: string | null; // letzter Nachsorgetermin / Follow-up-Datum für Zensierung
  therapieBeginn?: string | null; // Therapiestartdatum (alternative zu Diagnosedatum als DFS-Startpunkt)
  /**
   * Datum der ersten dokumentierten Progression. Kein Parser füllt es heute;
   * das Feld steht, damit PFS und PPS eine Regel haben und die Prüfung
   * "Daten fehlen" statt "Regel fehlt" melden kann.
   */
  progressionDatum?: string | Date | null;

  // DFS Inclusion Criteria (Verlauf_Lokaler_Tumorstatus, etc.)
  verlauf_Lokaler_Tumorstatus?: string | null; // K = "kein Tumor nachweisbar"
  verlauf_Regionaerer_Lymphknotenstatus?: string | null; // K = "kein Tumor nachweisbar"
  verlauf_Fernmetastasen?: string | null; // K = "kein Tumor nachweisbar"
  residualstatus?: string | null; // R0 = "kein Residualtumor lokal", optional
  
  // Computed DFS fields
  dfsTimeDays?: number; // berechnete DFS-Zeit in Tagen
  dfsTimeMonths?: number; // berechnete DFS-Zeit in Monaten
  dfsEvent?: 0 | 1; // 1 = Ereignis (Rezidiv/Metastasen/Tod), 0 = zensiert
  dfsEligible?: boolean; // true = Patient erfüllt DFS-Einschlusskriterien
  /**
   * Der Fall endete durch ein konkurrierendes Ereignis. Nur die
   * Lokalrezidivrate wertet es aus; alle übrigen Endpunkte lassen das Feld
   * unbeachtet.
   */
  konkurrenz?: boolean;

  extras?: Record<string, string>;  // Rohwerte aller nicht-bekannten Spalten aus dem Upload

  // Herkunft und Verlaufsserie aus einem OncoBox-Import. Die Statuscodes sind
  // roh, gedeutet werden sie auf der Ergebnisseite.
  oncoBox?: {
    boxType: string;
    /** Profilkennung, siehe OncoBoxMeta.profileId. */
    profileId: string;
    schemaVersion: string;
    patientId: string;
    caseId: string;
    isPrimary: boolean | null;
    isCenterCase: boolean | null;
    centerType: string | null;
    icd10: string | null;
    icdIsTopography: boolean;
    side: string | null;
    deathDate: string | null;
    deathTumorRelated: boolean | null;
    followUps: import("./oncobox/types").OncoBoxFollowUp[];
    distantMets: { date: string | null; site: string | null }[];
    /**
     * Der ungedeutete Fall, wie der Importer ihn gelesen hat. Die Boxregeln
     * lesen ihn als Ganzes: sie sind gegen genau diese Struktur getestet, und
     * eine zweite, flach verteilte Kopie der Felder ginge früher oder später
     * auseinander.
     */
    fall: import("./oncobox/types").OncoBoxCase;
  };
}

interface ParseResult {
  patients: Patient[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse oBDS XML file and trigger client-side CSV download
 */
export function parseOBDSXMLNew(xmlContent: string): ParseResult {
  // Pre-normalize known tag-case mismatches from non-standard XML generators
  // e.g. <UeberlebensZeit> closed as </Ueberlebenszeit> breaks strict DOMParser
  const normalizedContent = xmlContent
    .replace(/<\/Ueberlebenszeit>/g, '</UeberlebensZeit>')
    .replace(/<\/ueberlebenszeit>/g, '</UeberlebensZeit>');

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(normalizedContent, "text/xml");

  const result: ParseResult = {
    patients: [],
    errors: [],
    warnings: []
  };

  const parseErrors = xmlDoc.getElementsByTagName("parsererror");
  if (parseErrors.length > 0) {
    result.errors.push("XML-Format ist ungültig");
  // Disabled automatic download on upload — keep result available for the caller
  // downloadResultAsCSV(result);
    return result;
  }

  const possiblePatientContainers = [
    "Patient", "Menge_Patient", "patient", "Fall", "fall",
    "Meldung", "meldung", "Datensatz", "datensatz"
  ];

  let patientElements: Element[] = [];
  for (const containerName of possiblePatientContainers) {
    const elements = xmlDoc.getElementsByTagName(containerName);
    if (elements.length > 0) {
      patientElements = Array.from(elements);
      break;
    }
  }

  if (patientElements.length === 0) {
    result.errors.push("Keine Patientendaten in der XML-Datei gefunden");
  // Disabled automatic download on upload — keep result available for the caller
  // downloadResultAsCSV(result);
    return result;
  }

  for (let i = 0; i < patientElements.length; i++) {
    try {
      const patientElement = patientElements[i];
      const patient = parsePatientElement(patientElement, i + 1);
      if (patient) {
        result.patients.push(patient);
      } else {
        result.warnings.push(`Patient ${i + 1}: Unvollständige Daten`);
      }
    } catch (error) {
      result.errors.push(
        `Patient ${i + 1}: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
      );
    }
  }

  // CSV-Download triggern
  // Disabled automatic download on upload — caller can trigger download if desired
  // downloadResultAsCSV(result);

  return result;
}

/**
 * Generate CSV and trigger download in browser
 */
function downloadResultAsCSV(result: ParseResult) {
  function toCSV(objArray: any[]): string {
    if (!objArray || objArray.length === 0) return "";
    
    const header = Object.keys(objArray[0]);
    
    const csv = [
      header.join(";"),
      ...objArray.map((row: Record<string, any>) =>
        header
          .map(field => {
            const value = row[field];
            // Wenn value ein Objekt ist, JSON.stringify verwenden
            const stringValue = typeof value === "object" && value !== null
              ? JSON.stringify(value)
              : value ?? "";
            return `"${stringValue.toString().replace(/"/g, '""')}"`;
          })
          .join(";")
      )
    ].join("\r\n");
    
    return csv;
  }

  if (result.patients.length > 0) {
    const csvContent = toCSV(result.patients);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "result.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

}



/**
 * --- Patient parsing functions ---
 */
function ensureTNDesignator(value: string, designator: "T" | "N" | "M"): string {
  const trimmed = value.trim();
  if (trimmed === "") return trimmed;
  const upper = trimmed.toUpperCase();
  const expectedPrefixes = [designator, `C${designator}`, `P${designator}`, `U${designator}`];
  if (expectedPrefixes.some(prefix => upper.startsWith(prefix))) {
    return trimmed;
  }
  const firstChar = trimmed[0];
  if (firstChar && /[cCpPuU]/.test(firstChar) && !/^[cCpPuU][TtNnMm]/.test(trimmed)) {
    return `${firstChar}${designator}${trimmed.slice(1).toUpperCase()}`;
  }
  return `${designator}${trimmed.toUpperCase()}`;
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function composeTNValue(
  prefixRaw: string | null | undefined,
  valueRaw: string | null | undefined,
  designator: "T" | "N" | "M"
): string | null {
  const prefix = (prefixRaw ?? "").trim();
  const value = (valueRaw ?? "").trim();
  if (value.length === 0) {
    return null;
  }

  const combined = `${prefix}${value}`.trim();
  if (combined.length > 0) {
    const expectedStart = prefix ? `${prefix.toUpperCase()}${designator}` : designator;
    if (combined.toUpperCase().startsWith(expectedStart)) {
      return combined;
    }
  }

  const normalizedValue = ensureTNDesignator(value, designator);

  if (!prefix) {
    return normalizedValue;
  }

  if (normalizedValue.toUpperCase().startsWith(prefix.toUpperCase())) {
    return normalizedValue;
  }

  return `${prefix}${normalizedValue}`;
}

function normalizeTNComponent(
  value: string | null | undefined,
  designator: "N" | "M"
): string | null {
  if (!value) return null;
  const ensured = ensureTNDesignator(value, designator);
  const trimmed = ensured.trim();
  if (trimmed.length === 0) return null;
  const upper = trimmed.toUpperCase();
  const match = upper.match(new RegExp(`${designator}[0-9A-Z]*`));
  if (match && match[0]) {
    return match[0];
  }
  if (upper.startsWith(designator)) {
    return upper;
  }
  const stripped = upper.replace(/^[CPU]\s*/, "");
  const suffix = stripped.startsWith(designator)
    ? stripped.slice(1)
    : stripped.replace(/[^0-9A-Z]/g, "");
  if (suffix.length === 0) return null;
  return `${designator}${suffix}`;
}

function parsePatientElement(element: Element, index: number): Patient | null {

  // --- Flat format detection (non-oBDS, e.g. oBDS_v3_4_0 generator) ---
  // Flat format has <Patient_ID> as a child element (not attribute),
  // <UeberlebensZeit>, <Vitalstatus>, <T_Kategorie> etc. directly under <Patient>
  const flatPatientIdEl = element.getElementsByTagName("Patient_ID")[0]?.textContent?.trim();
  if (flatPatientIdEl) {
    const flatId = flatPatientIdEl || `patient_${index}`;
    const flatGender = normalizeGender(element.getElementsByTagName("Geschlecht")[0]?.textContent);
    const flatAgeRaw = element.getElementsByTagName("Alter")[0]?.textContent?.trim();
    const flatAge = flatAgeRaw ? parseInt(flatAgeRaw, 10) || 0 : 0;

    // Tumortyp: "C50.9 - Mammakarzinom" → extract ICD code
    const flatTumorTypRaw = element.getElementsByTagName("Tumortyp")[0]?.textContent?.trim() || "";
    const flatICD = flatTumorTypRaw.match(/^([CDZ]\d{2}(?:\.\d+)?)/)?.[1] || flatTumorTypRaw;
    const flatTumorLocation = element.getElementsByTagName("Tumorlokalisation")[0]?.textContent?.trim() || "";

    const flatDiagDate = element.getElementsByTagName("Diagnosedatum")[0]?.textContent?.trim() || "Unbekannt";
    const flatSurvivalMonthsRaw = element.getElementsByTagName("UeberlebensZeit")[0]?.textContent?.trim();
    const flatSurvivalMonths = flatSurvivalMonthsRaw ? Math.max(0, parseFloat(flatSurvivalMonthsRaw) || 0) : 0;

    const flatVitalstatus = (element.getElementsByTagName("Vitalstatus")[0]?.textContent?.trim() || "").toLowerCase();
    const flatEvent = flatVitalstatus === "verstorben" || flatVitalstatus === "dead" || flatVitalstatus === "1";
    const flatVitalStatusBool = !flatEvent;

    const flatGrading = element.getElementsByTagName("Grading")[0]?.textContent?.trim() || null;
    const flatUicc = element.getElementsByTagName("UICC")[0]?.textContent?.trim() || null;
    const flatPrimaerfall = element.getElementsByTagName("Primaerfall")[0]?.textContent?.trim() || "1";
    const flatNachbeobachtung = element.getElementsByTagName("Nachbeobachtung")[0]?.textContent?.trim() || null;

    // TNM fields
    const flatPT = element.getElementsByTagName("pT")[0]?.textContent?.trim() || null;
    const flatTKat = element.getElementsByTagName("T_Kategorie")[0]?.textContent?.trim() || null;
    const flatNKat = element.getElementsByTagName("N_Kategorie")[0]?.textContent?.trim() || null;
    const flatMKat = element.getElementsByTagName("M_Kategorie")[0]?.textContent?.trim() || null;

    // Normalize N and M
    const flatNCategory = normalizeTNComponent(flatNKat, "N");
    const flatMCategory = normalizeTNComponent(flatMKat, "M");
    const flatTOneDigit = flatTKat ? flatTKat.replace(/^[pcPC]?/, "").replace(/[ABCXDabcxd]+$/, "") : null;
    const flatTOneDigitFull = flatTOneDigit ? `T${flatTOneDigit.replace(/^T?/, "")}` : null;

    // Compute followupDate from diagnosis + survival months
    let flatFollowupDate: Date | null = null;
    if (flatNachbeobachtung) {
      flatFollowupDate = new Date(flatNachbeobachtung);
    } else if (flatDiagDate !== "Unbekannt" && flatSurvivalMonths > 0) {
      const d = new Date(flatDiagDate);
      if (!isNaN(d.getTime())) {
        flatFollowupDate = new Date(d.getTime() + flatSurvivalMonths * 30.4375 * 24 * 60 * 60 * 1000);
      }
    }

    // Tumor classification by ICD code
    const flatTumorClassification = (() => {
      if (!flatICD) return { mainCategory: "Unbekannt" as TumorMainCategory, subCategory: null as string | null };
      for (const [cat, codes] of Object.entries(HEMATOLOGICAL_TUMOR_CATEGORIES)) {
        for (const code of codes) {
          if (flatICD === code || flatICD.startsWith(code)) {
            return { mainCategory: "Hämatologische Erkrankungen" as TumorMainCategory, subCategory: cat };
          }
        }
      }
      for (const [cat, codes] of Object.entries(SOLID_TUMOR_CATEGORIES)) {
        for (const code of codes) {
          if (flatICD === code || flatICD.startsWith(code) || (code.length === 3 && flatICD.startsWith(code))) {
            return { mainCategory: "Solide Tumore" as TumorMainCategory, subCategory: cat };
          }
        }
      }
      return { mainCategory: "Solide Tumore" as TumorMainCategory, subCategory: "Sonstige" };
    })();

    // Spread category. Reduce a raw TNM value to its base category+digit,
    // dropping the c/p prefix and any subcategory suffix so that values like
    // "cT1C", "pT3B", "N1A" or "M1C" still match (previously only the m/n prefix
    // was stripped and T not at all, so anything but a bare "T1"/"M0" fell
    // through to "Unbekannt").
    const flatSpread = (() => {
      const base = (raw: string | null | undefined, letter: string) => {
        const hit = (raw || "").toUpperCase().match(new RegExp(`${letter}(\\d)`));
        return hit ? `${letter}${hit[1]}` : "";
      };
      const m = base(flatMCategory, "M");
      const n = base(flatNCategory, "N");
      const t = base(flatTOneDigitFull, "T");
      if (m === "M1") return "Metastasiert" as SpreadCategory;
      if (["N1","N2","N3"].includes(n) && m === "M0") return "Fortgeschritten" as SpreadCategory;
      if (["T3","T4"].includes(t) && n === "N0" && m === "M0") return "Lokal fortgeschritten" as SpreadCategory;
      if (["T1","T2"].includes(t) && n === "N0" && m === "M0") return "Lokal begrenzt" as SpreadCategory;
      return "Unbekannt" as SpreadCategory;
    })();

    return {
      id: flatId,
      gender: flatGender,
      age: flatAge,
      tumorType: flatICD,
      tumorCategory: flatTumorClassification.subCategory,
      tumorLocation: flatTumorLocation,
      diagnosisDate: flatDiagDate,
      survivalTime: flatSurvivalMonths,
      event: flatEvent,
      followupDate: flatFollowupDate,
      followupDateString: flatNachbeobachtung,
      vitalStatus: flatVitalStatusBool,
      grading: flatGrading,
      isPrimaryCase: flatPrimaerfall === "1" || flatPrimaerfall.toLowerCase() === "ja",
      tumorMainCategory: flatTumorClassification.mainCategory,
      tumorSubCategory: flatTumorClassification.subCategory,
      isHematological: flatTumorClassification.mainCategory === "Hämatologische Erkrankungen",
      isSolid: flatTumorClassification.mainCategory === "Solide Tumore",
      spreadCategory: flatSpread,
      staging: {
        uicc: flatUicc,
        tCategory: flatTKat,
        tPathological: flatPT,
        tClinical: flatTKat,
        tOneDigit: flatTOneDigitFull,
        tTwoDigit: flatTKat,
        nCategory: flatNCategory,
        mCategory: flatMCategory,
        tnm: { cT: flatTKat, cN: flatNKat, cM: flatMKat, pT: flatPT, pN: flatNKat, pM: flatMKat },
      },
      cT: flatTKat,
      cN: flatNKat,
      cM: flatMKat,
      pT: flatPT,
      pN: flatNKat,
      pM: flatMKat,
      TNM_T: flatPT || flatTKat,
      TNM_N: flatNKat,
      TNM_M: flatMKat,
      primaerfall: flatPrimaerfall,
      lokalisation: flatICD,
      tumorid: null,
      startdatum: flatDiagDate,
      endedatum: flatNachbeobachtung,
      // DFS fields (not available in flat format)
      rezidivDatum: null, metastasenDatum: null, zweitterTumorDatum: null,
      todDatum: flatEvent ? flatNachbeobachtung : null,
      nachsorgeDatum: flatEvent ? null : flatNachbeobachtung,
      therapieBeginn: null,
      gesamtbeurteilungErkrankung: null,
      verlauf_Lokaler_Tumorstatus: null,
      verlauf_Regionaerer_Lymphknotenstatus: null,
      verlauf_Fernmetastasen: null,
      residualstatus: null,
      dfsEligible: false,
    };
  }
  // --- End flat format ---

  // Attribute und Sub-Elemente lesen
  const patnr = element.getAttribute("Patient_ID") || `patient_${index}`;
  const genderRaw = element.getElementsByTagName("Geschlecht")[0]?.textContent || "unknown";
  const gender = normalizeGender(genderRaw);
  const birthDateStr = element.getElementsByTagName("Geburtsdatum")[0]?.textContent || "";
  const age = birthDateStr ? new Date().getFullYear() - new Date(birthDateStr).getFullYear() : 0;
  //Eig ICD10 Diagnose im weiteren programmablauf
  //const tumorType = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("Meldung")[0]?.getElementsByTagName("Diagnose")[0]?.getElementsByTagName("Primaertumor_Diagnosetext")[0]?.getElementsByTagName("Code")[0]?.textContent?.trim() || "";
  const tumorLocation = element.getElementsByTagName("Menge_Meldung")[0]
  ?.getElementsByTagName("Meldung")[0]
  ?.getElementsByTagName("Diagnose")[0]
  ?.getElementsByTagName("Primaertumor_Topographie_ICD_O")[0]
  ?.getElementsByTagName("Code")[0]
  ?.textContent?.trim() || "";


  const diagnosisDateRaw = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("Meldung")[0]?.getElementsByTagName("Tumorzuordnung")[0]?.getElementsByTagName("Diagnosedatum")[0]?.textContent?.trim() || "Unbekannt";
  // oBDS exports use placeholder dates (e.g. 1900-07-01, 1890-07-01) when the
  // real diagnosis date is unknown. Treat an implausibly old (or future) year as
  // unknown, otherwise it yields a fantasy survival time (1900 diagnosis vs a
  // 2025 contact = ~125 years) and the case is silently excluded from the plot.
  const diagnosisDate = (() => {
    if (diagnosisDateRaw === "Unbekannt") return "Unbekannt";
    const d = new Date(diagnosisDateRaw);
    const y = d.getFullYear();
    if (isNaN(d.getTime()) || y < 1920 || y > new Date().getFullYear() + 1) return "Unbekannt";
    return diagnosisDateRaw;
  })();
  
  const grading = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("Histologie")[0]?.getElementsByTagName("Grading")[0]?.textContent?.trim() || null;
  
  const cTNMElement = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("cTNM")[0];
  const cTPrefix = cTNMElement?.getElementsByTagName("c_p_u_Praefix_T")[0]?.textContent || "";
  const cTRaw = cTNMElement?.getElementsByTagName("T")[0]?.textContent || null;
  const cT = composeTNValue(cTPrefix, cTRaw, "T");
  const cNPrefix = cTNMElement?.getElementsByTagName("c_p_u_Praefix_N")[0]?.textContent || "";
  const cNRaw = cTNMElement?.getElementsByTagName("N")[0]?.textContent || null;
  const cN = composeTNValue(cNPrefix, cNRaw, "N");
  const cMPrefix = cTNMElement?.getElementsByTagName("c_p_u_Praefix_M")[0]?.textContent || "";
  const cMRaw = cTNMElement?.getElementsByTagName("M")[0]?.textContent || null;
  const cM = composeTNValue(cMPrefix, cMRaw, "M");
  // UICC-Stadium über ALLE Meldungen suchen (nicht nur Meldung[0]). In oBDS kann
  // das Stadium in einer späteren Meldung stehen (z. B. eigene Staging-/Verlaufs-
  // meldung); zuvor wurden solche Fälle übersehen. Nimmt das erste nicht-leere
  // UICC_Stadium im jeweiligen TNM-Block über den ganzen Patienten.
  const firstUiccIn = (blockTag: string): string | null => {
    const blocks = element.getElementsByTagName(blockTag);
    for (let i = 0; i < blocks.length; i++) {
      const v = blocks[i]?.getElementsByTagName("UICC_Stadium")[0]?.textContent?.trim();
      if (v) return v;
    }
    return null;
  };
  const cTNM_UICC = firstUiccIn("cTNM");
  const pTNMElement = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("pTNM")[0];
  const pTPrefix = pTNMElement?.getElementsByTagName("c_p_u_Praefix_T")[0]?.textContent || "";
  const pTRaw = pTNMElement?.getElementsByTagName("T")[0]?.textContent || null;
  const pT = composeTNValue(pTPrefix, pTRaw, "T");
  const pNPrefix = pTNMElement?.getElementsByTagName("c_p_u_Praefix_N")[0]?.textContent || "";
  const pNRaw = pTNMElement?.getElementsByTagName("N")[0]?.textContent || null;
  const pN = composeTNValue(pNPrefix, pNRaw, "N");
  const pMPrefix = pTNMElement?.getElementsByTagName("c_p_u_Praefix_M")[0]?.textContent || "";
  const pMRaw = pTNMElement?.getElementsByTagName("M")[0]?.textContent || null;
  const pM = composeTNValue(pMPrefix, pMRaw, "M");
  const pTNM_UICC = firstUiccIn("pTNM");
  const TNM_UICC = firstUiccIn("TNM");


 
  //0 ist kein Primärfall
  const primaerfall = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("Meldung")[0]?.getElementsByTagName("Zertifizierung")[0]?.textContent?.trim() || "0";

  const lokalisation = element.getElementsByTagName("Primaertumor_ICD")[0]?.getElementsByTagName("Code")[0]?.textContent?.trim() || "unknown";
  
  const tumorid = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("Meldung")[0]?.getElementsByTagName("Tumorzuordnung")[0]?.getAttribute("Tumor_ID") || null;

  const startdatum = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("Meldung")[0]?.getElementsByTagName("Tumorzuordnung")[0]?.getElementsByTagName("Diagnosedatum")[0]?.textContent?.trim() || null;

  // Meldedatum (oft aktuellstes Datum)
  const meldedatumStr = element.getElementsByTagName("Menge_Meldung")[0]
    ?.getElementsByTagName("Meldung")[0]
    ?.getElementsByTagName("Meldedatum")[0]
    ?.textContent?.trim() || null;

  // Follow-up-Datum aus der XML-Datei lesen (Untersuchungsdatum_Verlauf)
  const followupDateString = element.getElementsByTagName("Menge_Meldung")[0]
    ?.getElementsByTagName("Meldung")[0]
    ?.getElementsByTagName("Verlauf")[0]
    ?.getElementsByTagName("Verlauf_Typ")[0]
    ?.getElementsByTagName("Untersuchungsdatum_Verlauf")[0]
    ?.textContent?.trim() || null;

  // wichtige Felder: Sterbedatum & letzte Kontrolle
  
  const letzteKontrolleStr = element.getAttribute("Letzte_Kontrolle") || null;
  const tod = element.getElementsByTagName("Tod")[0];
  const sterbedatumStr = tod?.getElementsByTagName("Sterbedatum")[0]?.textContent?.trim() || "";
  
  // OP-Datum (falls vorhanden)
  const opDatumStr = element.getElementsByTagName("Menge_Meldung")[0]
    ?.getElementsByTagName("Meldung")[0]
    ?.getElementsByTagName("Menge_OP")[0]
    ?.getElementsByTagName("OP")[0]
    ?.getElementsByTagName("Datum")[0]
    ?.textContent?.trim() || null;

  // Zusatzitem-Datums (können mehrere sein, wir nehmen das neueste)
  const zusatzitemElements = element.getElementsByTagName("Menge_Meldung")[0]
    ?.getElementsByTagName("Meldung")[0]
    ?.getElementsByTagName("Menge_Zusatzitem")[0]
    ?.getElementsByTagName("Zusatzitem");
  
  let neuetesZusatzitemDatum: string | null = null;
  if (zusatzitemElements && zusatzitemElements.length > 0) {
    const datums: Date[] = [];
    for (let i = 0; i < zusatzitemElements.length; i++) {
      const datumStr = zusatzitemElements[i]
        ?.getElementsByTagName("Datum")[0]
        ?.textContent?.trim();
      if (datumStr) {
        try {
          datums.push(new Date(datumStr));
        } catch (e) {
          // Ignoriere ungültige Datums
        }
      }
    }
    // Sortiere und nimm das neueste
    if (datums.length > 0) {
      datums.sort((a, b) => b.getTime() - a.getTime());
      neuetesZusatzitemDatum = datums[0].toISOString().split('T')[0];
    }
  }

  // endedatum auf Sterbedatum oder heutiges Datum, falls leer
  const endedatum = sterbedatumStr 
  ? new Date(sterbedatumStr).toLocaleDateString("de-DE") 
  : new Date().toLocaleDateString("de-DE");

  // Vitalstatus: true = lebendig, false = verstorben
  const vitalStatus = !sterbedatumStr;

  // Event wird später gesetzt basierend auf klinischem Kontakt
  
  // DFS-spezifische Felder aus Verlauf/Nachsorge
  const verlaufElement = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("Meldung")[0]?.getElementsByTagName("Verlauf")[0];
  
  // Rezidiv-Datum (Wiederauftreten)
  const rezidivDatum = verlaufElement?.getElementsByTagName("Rezidiv")[0]?.getElementsByTagName("Rezidiv_Datum")[0]?.textContent?.trim() || null;
  
  // Metastasen-Datum (Wiederauftreten fern oder regional)
  const metastasenDatum = verlaufElement?.getElementsByTagName("Metastasen")[0]?.getElementsByTagName("Metastasen_Datum")[0]?.textContent?.trim() || null;
  
  // Zweittumor-Datum (neuer unabhängiger Tumor)
  const zweitterTumorElement = verlaufElement?.getElementsByTagName("Zweittumor")[0];
  const zweitterTumorDatum = zweitterTumorElement?.getElementsByTagName("Diagnose_Datum")[0]?.textContent?.trim() || null;
  
  // Therapiebeginn (Behandlungsstartdatum)
  const therapieElement = element.getElementsByTagName("Menge_Meldung")[0]?.getElementsByTagName("Meldung")[0]?.getElementsByTagName("Menge_Therapie")[0]?.getElementsByTagName("Therapie")[0];
  const therapieBeginn = therapieElement?.getElementsByTagName("Therapie_Beginn")[0]?.textContent?.trim() || null;
  
  // Nachsorge-Datum (letzter Nachsorgetermin für Zensierung)
  const nachsorgeElement = verlaufElement?.getElementsByTagName("Nachsorge")[0];
  const nachsorgeDatum = nachsorgeElement?.getElementsByTagName("Nachsorge_Datum")[0]?.textContent?.trim() || null;
  
  // Sterbedatum für DFS (Wiederauftreten ist Endpoint)
  const todDatum = sterbedatumStr || null;

  // DFS Inclusion Criteria aus Verlauf
  // Verlauf_Lokaler_Tumorstatus = K (kein Tumor nachweisbar)
  const verlauf_Lokaler_Tumorstatus = verlaufElement?.getElementsByTagName("Verlauf_Lokaler_Tumorstatus")[0]?.textContent?.trim() || null;
  
  // Verlauf_Regionaerer_Lymphknotenstatus = K (kein Tumor nachweisbar)
  const verlauf_Regionaerer_Lymphknotenstatus = verlaufElement?.getElementsByTagName("Verlauf_Regionaerer_Lymphknotenstatus")[0]?.textContent?.trim() || null;
  
  // Verlauf_Fernmetastasen = K (kein Tumor nachweisbar)
  const verlauf_Fernmetastasen = verlaufElement?.getElementsByTagName("Verlauf_Fernmetastasen")[0]?.textContent?.trim() || null;
  
  // Residualstatus (optional): R0 = kein Residualtumor lokal
  const residualstatus = verlaufElement?.getElementsByTagName("Residualstatus")[0]?.textContent?.trim() || null;

  // Letzter Kontakt über ALLE Meldungen aggregieren. In oBDS ist jeder Verlauf
  // eine eigene Meldung (Meldeanlass="Verlauf"); getElementsByTagName sucht
  // rekursiv über den ganzen Patienten, daher sammeln wir jedes Verlaufs-,
  // Nachsorge-, Melde- und Therapiedatum und nehmen das späteste. Zuvor las der
  // Parser nur Meldung[0] und übersah damit alle späteren Follow-ups -> viel zu
  // kurze bzw. fehlende Überlebenszeiten bei zensierten Patienten.
  const parseObdsDate = (s?: string | null): Date | null => {
    if (!s) return null;
    const trimmed = s.trim();
    if (!trimmed) return null;
    let d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      const m = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (m) d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
    }
    return isNaN(d.getTime()) ? null : d;
  };
  const collectLatestDate = (tags: string[]): Date | null => {
    let best: number | null = null;
    for (const tag of tags) {
      const els = element.getElementsByTagName(tag);
      for (let i = 0; i < els.length; i++) {
        const d = parseObdsDate(els[i]?.textContent);
        if (d) { const tt = d.getTime(); if (best === null || tt > best) best = tt; }
      }
    }
    return best === null ? null : new Date(best);
  };
  const latestContact = collectLatestDate([
    "Untersuchungsdatum_Verlauf", "Nachsorge_Datum", "Meldedatum",
    "Therapie_Beginn", "Therapie_Ende",
  ]);

  // Follow-up-Datum: Erweiterte Prioritätsliste für maximale Patienten-Inklusion
  // KLINISCHE KONTAKTE (valide für Zensierung, event=0):
  // 1. Sterbedatum (definitives Enddatum, event=1)
  // 2. Nachsorge_Datum (wichtigster Follow-up-Termin)
  // 3. Untersuchungsdatum_Verlauf (Verlaufsdokumentation)
  // 4. OP_Datum (Operationsdatum)
  // 5. Therapie_Beginn (Behandlungsstart)
  // 6. Zusatzitem_Datum (neuestes aus Menge_Zusatzitem, oft klinische Zusatzdaten)
  // 7. Letzte_Kontrolle (medizinischer Kontrolltermin)
  // WICHTIG: Diagnosedatum wird NICHT verwendet, da followupDate != diagnosisDate sein muss
  
  let followupDate: Date | null = null;
  let followupDateSource = "none";
  let hasClinicalContact = false; // Flag ob klinischer Kontakt vorhanden
  
  if (sterbedatumStr) {
    followupDate = new Date(sterbedatumStr);
    followupDateSource = "Sterbedatum";
    hasClinicalContact = true; // Tod ist definitiver klinischer Endpoint
  } else if (latestContact) {
    followupDate = latestContact;
    followupDateSource = "letzter Kontakt (aggregiert über alle Meldungen)";
    hasClinicalContact = true;
  } else if (nachsorgeDatum) {
    followupDate = new Date(nachsorgeDatum);
    followupDateSource = "Nachsorge_Datum";
    hasClinicalContact = true; // Nachsorge ist klinischer Kontakt
  } else if (followupDateString) {
    followupDate = new Date(followupDateString);
    followupDateSource = "Untersuchungsdatum_Verlauf";
    hasClinicalContact = true; // Verlaufsuntersuchung ist klinischer Kontakt
  } else if (opDatumStr) {
    followupDate = new Date(opDatumStr);
    followupDateSource = "OP_Datum";
    hasClinicalContact = true; // OP ist klinischer Kontakt
  } else if (therapieBeginn) {
    followupDate = new Date(therapieBeginn);
    followupDateSource = "Therapie_Beginn";
    hasClinicalContact = true; // Therapiebeginn ist klinischer Kontakt
  } else if (neuetesZusatzitemDatum) {
    followupDate = new Date(neuetesZusatzitemDatum);
    followupDateSource = "Zusatzitem_Datum";
    hasClinicalContact = true; // Zusatzitems sind meist klinische Daten
  } else if (letzteKontrolleStr) {
    followupDate = new Date(letzteKontrolleStr);
    followupDateSource = "Letzte_Kontrolle";
    hasClinicalContact = true; // Letzte Kontrolle ist medizinischer Kontakt
  }
  // Diagnosedatum wird NICHT als followupDate verwendet, da followupDate != diagnosisDate sein muss
  
  // Validierung: followupDate darf nicht gleich diagnosisDate sein
  if (followupDate && diagnosisDate && diagnosisDate !== "Unbekannt") {
    const diagDate = new Date(diagnosisDate);
    // Wenn followupDate === diagnosisDate, dann followupDate auf null setzen
    if (followupDate.getTime() === diagDate.getTime()) {
      followupDate = null;
      followupDateSource = "none (identisch mit Diagnosedatum)";
      hasClinicalContact = false;
    }
  }
  
  // Event-Status: 1 = Tod, 0 = zensiert (klinischer Kontakt ohne Tod)
  // Patienten OHNE klinischen Kontakt werden später ausgefiltert
  const event: boolean = Boolean(sterbedatumStr);

	const isPrimaryCase = istPrimaerfall(primaerfall);


  // survivalTime berechnen (Monate zwischen Diagnose und endedatum/followup)
  let survivalTime = 0;
  if (followupDate && diagnosisDate !== "Unbekannt") {
    survivalTime =
      (followupDate.getTime() - new Date(diagnosisDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
    survivalTime = Math.max(0, Math.round(survivalTime));
  }
    const { tOneDigit: cTOneDigit, tTwoDigit: cTTwoDigit } = parseTCategory(cT);
    const { tOneDigit: pTOneDigit, tTwoDigit: pTTwoDigit } = parseTCategory(pT);
	const tOneDigit = [pTOneDigit, cTOneDigit].filter(Boolean).join(" / ") || null;
	const tTwoDigit = [pTTwoDigit, cTTwoDigit].filter(Boolean).join(" / ") || null;
   
	// --- TNM Parsing ---
	const cTNM = parseTNMString(cT);
	const pTNM = parseTNMString(pT);

	// 1- und 2-stellige T-Kategorien
	const cTParsed = parseTCategory(cTNM.t);
	const pTParsed = parseTCategory(pTNM.t);

	const tumorElement = element
	.getElementsByTagName("Menge_Meldung")[0]
	?.getElementsByTagName("Meldung")[0]
	?.getElementsByTagName("Tumorzuordnung")[0];

  const tumorClassification = categorizeTumorNew(tumorElement);

  const TNM_T = pickFirstNonEmpty(cT, pT);
  const nCategoryRaw = pickFirstNonEmpty(pN, cN);
  const mCategoryRaw = pickFirstNonEmpty(pM, cM);
  const nCategory = normalizeTNComponent(nCategoryRaw, "N");
  const mCategory = normalizeTNComponent(mCategoryRaw, "M");
  const TNM_N = nCategoryRaw;
  const TNM_M = mCategoryRaw;

  	const tumorType=element.getElementsByTagName("Primaertumor_ICD")[0]?.getElementsByTagName("Code")[0]?.textContent?.trim() || "unknown"+" - "+tumorClassification.subCategory;


	// --- Staging Objekt ---
  const staging = {
  tnm: { cT, cN, cM, pT, pN, pM },
  uicc: pTNM_UICC ?? cTNM_UICC ?? TNM_UICC ?? null,
  tCategory:  cT ?? pT ?? null, 
  tPathological: pT,
  tClinical: cT,
  tOneDigit: cTParsed.tOneDigit,
  tTwoDigit: cTParsed.tTwoDigit,
  nCategory,
  mCategory
  };

  const spreadClassification = categorizeSpreadNew({
    tOneDigit: cTParsed.tOneDigit || pTParsed.tOneDigit,
    nCategory: nCategory ?? undefined,
    mCategory: mCategory ?? undefined
    });

	

  return {
    id: patnr,
    gender,
    age,
    tumorType,
	tumorCategory: tumorClassification.subCategory,
    tumorLocation,
    diagnosisDate,
    survivalTime,
    event,
    followupDate,
    followupDateString,
    vitalStatus,
    grading,
    isPrimaryCase,
    tumorMainCategory: tumorClassification.mainCategory,
    tumorSubCategory: tumorClassification.subCategory,
    isHematological: false,
    isSolid: true,
    spreadCategory: spreadClassification,
    staging,

    therapy: {
     // surgery,
     // chemotherapy,
    //  radiotherapy,
    //  immunotherapy
    },
    cT,
	cN,
	cM,
    pT,
	pN,
	pM,
    primaerfall,
    lokalisation,
    tumorid,
    startdatum,
    endedatum,
	TNM_T,
    TNM_N,
    TNM_M,
    
    // DFS-Felder
    rezidivDatum,
    metastasenDatum,
    zweitterTumorDatum,
    todDatum,
    nachsorgeDatum,
    therapieBeginn,
    gesamtbeurteilungErkrankung: null, // kann später erweitert werden
    
    // DFS Inclusion Criteria
    verlauf_Lokaler_Tumorstatus,
    verlauf_Regionaerer_Lymphknotenstatus,
    verlauf_Fernmetastasen,
    residualstatus,
    
    // DFS Eligibility wird berechnet
    dfsEligible: 
      verlauf_Lokaler_Tumorstatus === "K" &&
      verlauf_Regionaerer_Lymphknotenstatus === "K" &&
      verlauf_Fernmetastasen === "K" &&
      (residualstatus === "R0" || residualstatus === null) // Optional R0
  };

	/**
	 * Parse combined TNM string into individual components
	 * Example: "pT1cN1M0" -> { t: "pT1c", n: "N1", m: "M0" }
	 */
	function parseTNMString(tnmString: string | null): { t: string | null; n: string | null; m: string | null } {
	if (!tnmString) return { t: null, n: null, m: null };

	const cleaned = tnmString.trim().toUpperCase();
	const match = cleaned.match(/^([PC]?T[0-4IS][ABCXD]*)(N[0-3X][ABCXD]*)(M[0-1X])$/);

	if (match) return { t: match[1] || null, n: match[2] || null, m: match[3] || null };

	// fallback
	const parts = cleaned.split(/(N[0-3X][ABCXD]*)/);
	if (parts.length >= 2) {
		const tPart = parts[0];
		const remaining = parts.slice(1).join('');
		const nM = remaining.match(/(N[0-3X][ABCXD]*)(M[0-1X])/);
		if (nM) return { t: tPart || null, n: nM[1] || null, m: nM[2] || null };
	}

	return { t: null, n: null, m: null };
	}

	/**
	 * Parse T-Category into 1-digit and 2-digit versions
	 */
	function parseTCategory(tValue: string | null): { tOneDigit: string | null; tTwoDigit: string | null } {
	if (!tValue) return { tOneDigit: null, tTwoDigit: null };

	const cleaned = tValue.trim().toUpperCase();
	const match = cleaned.match(/^([pcPC]?)(T[0-4IS])([ABCXD]*)$/);
	if (!match) return { tOneDigit: cleaned, tTwoDigit: cleaned };

	const mainCategory = match[2].replace(/^T/, ""); // z.B. "1"
	const subCategory = match[3]; // z.B. "a"
	return { tOneDigit: `T${mainCategory}`, tTwoDigit: subCategory ? `T${mainCategory}${subCategory}` : `T${mainCategory}` };
	}


	/**
	 * Categorize tumor based on ICD-10 code (client-side, new OBDS structure)
	 */
	function categorizeTumorNew(tumorElement: Element | null): {
	mainCategory: TumorMainCategory;
	subCategory: string | null;
	isHematological: boolean;
	isSolid: boolean;
	} {
	if (!tumorElement) {
		return {
		mainCategory: "Unbekannt",
		subCategory: null,
		isHematological: false,
		isSolid: false
		};
	}

	const icd10Code = tumorElement
		.getElementsByTagName("Code")[0]?.textContent?.trim() || "";

	if (!icd10Code) {
		return {
		mainCategory: "Unbekannt",
		subCategory: null,
		isHematological: false,
		isSolid: false
		};
	}

	// Check hematological categories first
	for (const [category, codes] of Object.entries(HEMATOLOGICAL_TUMOR_CATEGORIES)) {
		for (const code of codes) {
		if (matchesICD10Pattern(icd10Code, code)) {
			return {
			mainCategory: "Hämatologische Erkrankungen",
			subCategory: category,
			isHematological: true,
			isSolid: false
			};
		}
		}
	}

	// Check solid tumor categories
	for (const [category, codes] of Object.entries(SOLID_TUMOR_CATEGORIES)) {
		for (const code of codes) {
		if (matchesICD10Pattern(icd10Code, code)) {
			return {
			mainCategory: "Solide Tumore",
			subCategory: category,
			isHematological: false,
			isSolid: true
			};
		}
		}
	}

	// Default to solid tumor if not hematological
	return {
		mainCategory: "Solide Tumore",
		subCategory: "Sonstige",
		isHematological: false,
		isSolid: true
	};
	}
	/**
	 * Check if an ICD-10 code matches a pattern
	 */
	function matchesICD10Pattern(code: string, pattern: string): boolean {
	// Handle exact matches
	if (code === pattern) return true;
	
	// Handle range patterns like "C54.2-.9" 
	const rangeMatch = pattern.match(/^([CDZ]\d{2})\.(\d)-\.(\d)$/);
	if (rangeMatch) {
		const [, baseCode, startSub, endSub] = rangeMatch;
		if (code.startsWith(baseCode + ".")) {
		const subCode = code.split(".")[1];
		if (subCode && !isNaN(parseInt(subCode))) {
			const subNum = parseInt(subCode);
			return subNum >= parseInt(startSub) && subNum <= parseInt(endSub);
		}
		}
	}
	
	// Handle base code patterns like "C51" matching "C51.1", "C51.2", etc.
	if (pattern.length === 3 && code.startsWith(pattern)) {
		return true;
	}
	
	// Handle specific subcategory patterns
	if (code.startsWith(pattern.replace(/[.-].*$/, ""))) {
		return true;
	}
	
	return false;
	}

	/**
	 * Categorize tumor spread based on TNM staging (client-side, new OBDS)
	 */
	function categorizeSpreadNew(staging: {
	tOneDigit?: string | null;
	nCategory?: string | null;
	mCategory?: string | null;
	}): SpreadCategory {
	const { tOneDigit, nCategory, mCategory } = staging;

	// Reduce a raw TNM value to its base category+digit, ignoring the c/p prefix
	// and any subcategory suffix (e.g. "cT1C" -> "T1", "M1B" -> "M1", "N3A" ->
	// "N3"); "" when the category is absent.
	const base = (raw: string | null | undefined, letter: string) => {
		const hit = (raw || "").toUpperCase().match(new RegExp(`${letter}(\\d)`));
		return hit ? `${letter}${hit[1]}` : "";
	};
	const tBase = base(tOneDigit, "T");
	const nBase = base(nCategory, "N");
	const mBase = base(mCategory, "M");
	const tIsCis = /T\s*IS/i.test(tOneDigit || "");

	// Classify from whatever TNM information is available (a full T+N+M is not
	// required): M1 alone is metastatic, a positive node alone is advanced, and
	// the T-based categories still require a documented N0/M0.
	if (mBase === "M1") return "Metastasiert";
	if (["N1", "N2", "N3"].includes(nBase)) return "Fortgeschritten";
	if (["T3", "T4"].includes(tBase) && nBase === "N0" && mBase === "M0") return "Lokal fortgeschritten";
	if (["T1", "T2"].includes(tBase) && nBase === "N0" && mBase === "M0") return "Lokal begrenzt";
	if (tIsCis && nBase === "N0" && mBase === "M0") return "Carcinoma in situ";
	return "Unbekannt";
	}


}

