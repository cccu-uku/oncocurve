/**
 * Shared patient-construction logic for CSV and XLSX parsers.
 * Worker-safe: no DOM access, no next-intl, no fetch.
 */

import { istPrimaerfall } from "./primaerfall";
import type { Patient } from "./obds-parser-new";
import { normalizeGender } from "./normalize-gender";
import { categorizeTumor, categorizeSpread } from "./tumor-classification";
import { ExtraColumnsState, ParseIssue, analyzeColumn } from './extra-columns';
import { tPrefixKind } from "./tnm-normalize";

// Maps a separate "clinical/pathological" designator column to a staging kind.
// Accepts p/patho/pathologisch/pathological and c/clinical / k/klinisch.
export function tnmDesignatorKind(val?: string | null): "clinical" | "pathological" | null {
  if (val == null) return null;
  const v = String(val).trim().toLowerCase();
  if (v === "") return null;
  if (v.startsWith("p")) return "pathological";
  if (v.startsWith("c") || v.startsWith("k")) return "clinical";
  return null;
}

// Derives the three T staging fields from any supported column layout:
//  - dedicated cT / pT columns (row.cT / row.pT)
//  - a shared TNM_T column whose value carries a c/p prefix (cT4 / pT4)
//  - a shared TNM_T column plus a separate designator column (row.tnmType)
// The value's own prefix wins over the designator column. tCategory is the
// general (prefix-agnostic) bucket and always falls back to whatever T is present.
export function deriveTStaging(row: Record<string, string>): {
  tCategory: string | null;
  tClinical: string | null;
  tPathological: string | null;
} {
  const dedClinical = row.cT || null;
  const dedPathological = row.pT || null;
  const designator = tnmDesignatorKind(row.tnmType);
  // Ein Wert ohne eigenes Präfix wird mit dem der Präfix-Spalte zu einer
  // vollständigen Kategorie zusammengesetzt: "c" und "4" ergeben "cT4".
  const roh = row.tnm_t || null;
  const general = roh && designator && !tPrefixKind(roh)
    ? `${designator === "clinical" ? "c" : "p"}T${roh.trim().replace(/^t/i, "")}`
    : roh;

  let tClinical = dedClinical;
  let tPathological = dedPathological;

  if (general) {
    const kind = tPrefixKind(general) ?? designator;
    if (kind === "pathological") tPathological = tPathological ?? general;
    else if (kind === "clinical") tClinical = tClinical ?? general;
  }

  const tCategory = general || dedPathological || dedClinical || null;
  return { tCategory, tClinical, tPathological };
}

// Header alias mapping for flexible column-name recognition
export const HEADER_ALIASES: Record<string, string[]> = {
  id: ['id', 'patient_id', 'patientid', 'patient id', 'pid', 'patnr'],
  gender: ['gender', 'geschlecht', 'sex', 'g'],
  age: ['age', 'alter'],
  birthDate: ['birth_date', 'birthdate', 'birth date', 'geburtsdatum', 'dob', 'date_of_birth'],
  tumorType: ['tumor_type', 'tumortype', 'tumor type', 'icd', 'icd10', 'diagnosis', 'lokalisation'],
  tumorCategory: ['tumor_category', 'tumorcategory', 'tumor category', 'category'],
  tumorLocation: ['tumor_location', 'tumorlocation', 'tumor location', 'location'],
  tumorId: ['tumor_id', 'tumorid', 'tumor id'],
  diagnosisDate: ['diagnosis_date', 'diagnosisdate', 'diagnosis date', 'datum', 'erstdiagnose', 'startdatum'],
  endDate: ['end_date', 'enddate', 'end date', 'enddatum', 'endedatum', 'last_contact', 'lastcontactdate'],
  deathDate: ['death_date', 'deathdate', 'death date', 'todesdatum', 'sterbedatum', 'date_of_death'],
  lastContactDate: ['last_contact_date', 'lastcontactdate', 'last contact date', 'vitaldatum', 'last_contact', 'lastcontact', 'followup_date', 'follow_up_date', 'last_followup', 'lastfollowup', 'last_follow_up', 'lastfollowupdate', 'last_followup_date', 'letzter_kontakt', 'nachbeobachtung'],
  // Ereignisdaten für die endpunktbezogene Auswertung. Ohne diese Spalten
  // kann eine CSV kein Rezidiv melden, und krankheitsfreies Überleben bleibt
  // ohne Ereignisse. Der oBDS-Pfad liest die Felder längst.
  rezidivDatum: ['rezidivdatum', 'rezidiv_datum', 'rezidiv', 'recurrence_date', 'recurrencedate', 'relapse_date', 'lokalrezidiv_datum'],
  metastasenDatum: ['metastasendatum', 'metastasen_datum', 'metastasis_date', 'metastasisdate', 'fernmetastasen_datum', 'distant_metastasis_date'],
  progressionsDatum: ['progressionsdatum', 'progressions_datum', 'progression_date', 'progressiondate', 'progress_datum'],
  // 'followup_date' bleibt außen vor: der Alias gehört schon lastContactDate,
  // eine dritte Doppelvergabe würde die Zuordnung von der Reihenfolge abhängig machen.
  nachsorgeDatum: ['nachsorgedatum', 'nachsorge_datum', 'follow_up_datum', 'aftercare_date'],
  // Date of first systemic treatment. Its presence switches the dataset to the
  // TTFT (time to first treatment) endpoint: t0 = diagnosis, event = treatment
  // start, censoring = last contact for untreated patients.
  firstTreatmentDate: ['first_treatment_date', 'firsttreatmentdate', 'first treatment date', 'first_treatment', 'firsttreatment', 'erstbehandlung', 'erstbehandlungsdatum', 'ersttherapie', 'therapiebeginn', 'therapie_beginn', 'treatment_date', 'treatmentdate', 'tx_date', 'ttft_date'],
  survivalTime: ['survival_time', 'survivaltime', 'survival time', 'follow_up', 'followup', 'months'],
  event: ['event', 'status', 'death', 'tod', 'vital_status', 'vitalstatus'],
  grading: ['grading', 'grade'],
  staging: ['staging', 'stage', 'uicc'],
  tnm_t: ['tnm_t', 't', 't_category', 'tcategory'],
  tnm_n: ['tnm_n', 'n', 'n_category', 'ncategory', 'cn'],
  tnm_m: ['tnm_m', 'm', 'm_category', 'mcategory', 'cm'],
  cUICC: ['c_uicc', 'cuicc', 'c_uicc_stage', 'cuiccstage'],
  // Dedicated clinical T column (kept separate from the general TNM_T column so
  // clinical stratification can read staging.tClinical).
  cT: ['c_t', 'ct', 'clinical_t', 'clinicalt', 'ct_category', 'ctcategory', 'klinisches_t'],
  // Separate "clinical vs pathological" designator column that qualifies an
  // otherwise unprefixed value in the general TNM_T column.
  tnmType: ['tnm_typ', 'tnm_type', 't_typ', 't_type', 'tnm_praefix', 't_praefix', 'praefix', 'prefix', 'staging_typ', 'staging_type'],
  pT: ['p_t', 'pt', 'p_category', 'ptcategory', 'pathological_t'],
  pN: ['p_n', 'pn', 'p_n_category', 'pncategory', 'pathological_n'],
  pM: ['p_m', 'pm', 'p_m_category', 'pmcategory', 'pathological_m'],
  pUICC: ['p_uicc', 'puicc', 'p_uicc_stage', 'puiccstage'],
  primaerfall: ['primaerfall', 'primaer_fall', 'primary_case', 'isPrimaryCase'],
};

// Converts an ExcelJS cell value to a plain string for the shared row-parsing
// pipeline below. Excel auto-formats date-looking text into real Date cells
// (e.g. when a CSV gets "saved as" .xlsx), and a naive String(cellValue) turns
// those into output like "Fri Mar 11 2022 00:00:00 GMT+0100 (...)" that
// parseDate() cannot recognise — silently zeroing survivalTime for every row
// and leaving no valid patient for the KM curve. Formats dates as DD.MM.YYYY,
// which parseDate() already handles. Also unwraps the other non-primitive
// ExcelJS cell shapes (hyperlink, rich text, formula/shared-formula, error) so
// a formatted or computed cell doesn't turn into "[object Object]".
export function xlsxCellToString(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) {
    const dd = String(v.getDate()).padStart(2, "0");
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${v.getFullYear()}`;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return o.text; // hyperlink cell
    if (Array.isArray(o.richText)) {
      return o.richText.map((r: any) => (typeof r?.text === "string" ? r.text : "")).join("");
    }
    if ("result" in o) return xlsxCellToString(o.result); // formula / shared formula
    if (typeof o.error === "string") return ""; // #N/A, #REF!, ...
    return "";
  }
  return String(v);
}

export interface CSVParseResult {
  patients: Patient[];
  errors: string[];
  warnings: string[];
  extraColumns: ExtraColumnsState;
  issues: ParseIssue[];
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const trimmed = dateStr.trim();

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try DD.MM.YYYY format (German format)
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('.');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

// Formats a Date's LOCAL year/month/day as YYYY-MM-DD. parseDate() constructs
// dates via `new Date(year, month, day)`, i.e. local midnight; converting that
// via `.toISOString()` (always UTC) shifts the date backward by one day for
// every timezone ahead of UTC (e.g. Germany/Austria, UTC+1/+2) — 01.01.2020
// silently became "2019-12-31". Building the string from local components
// avoids any UTC conversion entirely.
function formatLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Convert date string to ISO format for consistent storage
 */
function toISODateString(dateStr: string | undefined): string {
  if (!dateStr) return formatLocalISODate(new Date());
  const parsed = parseDate(dateStr);
  if (parsed) {
    return formatLocalISODate(parsed);
  }
  return dateStr; // Return original if unparseable
}

/**
 * Normalize header name for matching
 */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_\s-]+/g, '_');
}

/**
 * Map CSV header to internal field name
 */
export function mapHeader(header: string): string | null {
  const normalized = normalizeHeader(header);

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some(alias => normalizeHeader(alias) === normalized)) {
      return field;
    }
  }

  return null;
}

// Eine Spalte, die nur "p" oder "c" heißt, ist für sich genommen mehrdeutig,
// "p" kann genauso ein p-Wert sein. Als c/p-Präfix der T-Kategorie gilt sie
// deshalb nur, wenn jeder belegte Wert c oder p ist.
function praefixSpalte(header: string, werte: (string | undefined)[]): string | null {
  if (!['p', 'c'].includes(normalizeHeader(header))) return null;
  const belegt = werte.map(w => (w ?? '').trim().toLowerCase()).filter(w => w !== '');
  return belegt.length > 0 && belegt.every(w => w === 'c' || w === 'p') ? 'tnmType' : null;
}

/**
 * Parse boolean value from various formats
 */
function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ['true', '1', 'yes', 'ja', 'y', 'tod', 'death'].includes(normalized);
}

/**
 * Calculate survival time in months between two dates
 */
function calculateSurvivalTimeMonths(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.round(diffDays / 30.44); // Average days per month
}

/**
 * Calculate age from birth date to diagnosis date
 */
function calculateAge(
  birthDateStr: string | undefined,
  diagnosisDateStr: string | undefined
): number | null {
  if (!birthDateStr) return null;

  const birthDate = parseDate(birthDateStr);
  if (!birthDate) return null;

  // Use diagnosis date if available, otherwise use current date
  const referenceDate = diagnosisDateStr ? parseDate(diagnosisDateStr) : new Date();
  if (!referenceDate) return null;

  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Calculate survival time from diagnosis date to death/last contact
 */
function calculateSurvivalTime(
  diagnosisDateStr: string | undefined,
  deathDateStr: string | undefined,
  lastContactDateStr: string | undefined,
  isEvent: boolean
): number {
  // Default to 0 if diagnosis date missing
  if (!diagnosisDateStr) return 0;

  const diagnosisDate = parseDate(diagnosisDateStr);
  if (!diagnosisDate) return 0;

  // If patient died, use death date (preferred for events)
  if (isEvent && deathDateStr) {
    const deathDate = parseDate(deathDateStr);
    if (deathDate) {
      return calculateSurvivalTimeMonths(diagnosisDate, deathDate);
    }
  }

  // For censored patients or if death date missing, use last contact date
  if (lastContactDateStr) {
    const lastContactDate = parseDate(lastContactDateStr);
    if (lastContactDate) {
      return calculateSurvivalTimeMonths(diagnosisDate, lastContactDate);
    }
  }

  // If neither death nor last contact date exists, return 0
  return 0;
}

/**
 * Parse TXT file with $ delimiter (legacy format support).
 * Accepts the raw text and performs its own splitting.
 */
export function parseTXTFormat(csvText: string): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const patients: Patient[] = [];

  try {
    const lines = csvText.trim().split(/\r?\n/);

    if (lines.length < 2) {
      errors.push('TXT file must contain at least a header row and one data row');
      return { patients, errors, warnings, extraColumns: { columns: {}, warnings: [] }, issues: [] };
    }

    // For TXT format, use $ as delimiter
    const delimiter = '$';

    // Parse header
    const headers = lines[0].split(delimiter).map(h => h.trim());

    const headerMap = new Map<number, string>();

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      const mappedField = mapHeader(header);

      if (mappedField) {
        headerMap.set(index, mappedField);
      } else {
        // For TXT format, map KMA-specific fields directly
        // Header format: patnr$tumorid$lokalisation$startdatum$endedatum$event$cT$cN$cM$cUICC$primaerfall
        // NOTE: lokalisation contains ICD-10 code (e.g., C50.9), NOT tumor name
        if (normalizedHeader === 'patnr') headerMap.set(index, 'id');
        else if (normalizedHeader === 'tumorid') headerMap.set(index, 'tumorId');
        else if (normalizedHeader === 'lokalisation') headerMap.set(index, 'tumorType');  // ICD-10 code
        else if (normalizedHeader === 'startdatum') headerMap.set(index, 'diagnosisDate');
        else if (normalizedHeader === 'endedatum') headerMap.set(index, 'endDate');
        else if (normalizedHeader === 'event') headerMap.set(index, 'event');
        else if (normalizedHeader === 'ct') headerMap.set(index, 'cT');
        else if (normalizedHeader === 'cn') headerMap.set(index, 'cN');
        else if (normalizedHeader === 'cm') headerMap.set(index, 'cM');
        else if (normalizedHeader === 'cuicc') headerMap.set(index, 'cUICC');
        else if (normalizedHeader === 'primaerfall') headerMap.set(index, 'primaerfall');
      }
    });

    if (headerMap.size === 0) {
      errors.push('TXT header could not be parsed or mapped');
      return { patients, errors, warnings, extraColumns: { columns: {}, warnings: [] }, issues: [] };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(delimiter).map(v => v.trim());
      const row: Record<string, string> = {};

      values.forEach((value, index) => {
        const field = headerMap.get(index);
        if (field) {
          row[field] = value;
        }
      });

      try {
        // Parse event status
        const isEvent = row.event ? parseBoolean(row.event) : false;

        // Calculate or use provided survival time
        let survivalTime: number;
        if (row.survivalTime) {
          survivalTime = parseFloat(row.survivalTime) || 0;
        } else if (row.diagnosisDate && row.endDate) {
          // For TXT: calculate directly from startdatum (diagnosisDate) and endedatum (endDate)
          // endDate is either death date (event=true) or last contact (event=false)
          const diagDate = parseDate(row.diagnosisDate);
          const endDate = parseDate(row.endDate);

          if (diagDate && endDate) {
            survivalTime = calculateSurvivalTimeMonths(diagDate, endDate);
          } else {
            survivalTime = 0;
            warnings.push(`Zeile ${i + 1}: Ungültiges Datumsformat (diagnosisDate=${row.diagnosisDate}, endDate=${row.endDate})`);
          }
        } else {
          survivalTime = 0;
          // Convert to warning instead of error - we can still use this patient
          warnings.push(`Zeile ${i + 1}: Überlebensdaten (startdatum/endedatum) fehlen`);
        }

        // Calculate age at time of diagnosis or end date
        let age = 0;

        if (row.birthDate) {
          const refDate = row.endDate || row.diagnosisDate;
          const calculatedAge = calculateAge(row.birthDate, refDate);
          age = calculatedAge ?? 0;
        }

        // Parse primaerfall (primary case flag)
        const isPrimaryCase = row.primaerfall
          ? istPrimaerfall(row.primaerfall)
          : true;

        // Build patient object
        // NOTE: For KMA TXT format, lokalisation contains ICD-10 code (e.g., C50.9)
        const icd10Code = row.tumorType || 'Unknown';  // tumorType is mapped from lokalisation

        const tStg = deriveTStaging(row);
        const nCategory = row.tnm_n || row.cN || null;
        const mCategory = row.tnm_m || row.cM || null;
        const tumorClassification = categorizeTumor(icd10Code);
        const spreadClassification = categorizeSpread({ tCategory: tStg.tCategory, nCategory, mCategory });
        const patient: Patient = {
          id: row.id || `patient_${i}`,
          // Rohwerte wie M, W oder Female treffen den Geschlechtsfilter nicht.
          gender: normalizeGender(row.gender),
          age: age,
          tumorType: icd10Code,  // ICD-10 code from lokalisation (e.g., C50.9)
          tumorCategory: icd10Code,  // Use ICD-10 code as category for filtering
          tumorLocation: icd10Code,  // Same as tumorType for TXT format
          diagnosisDate: toISODateString(row.diagnosisDate),
          followupDateString: row.endDate || null,  // Store original endDate for display
          survivalTime: survivalTime,
          event: isEvent,
          vitalStatus: !isEvent,
          grading: null,
          isPrimaryCase: isPrimaryCase,
          tumorMainCategory: tumorClassification.mainCategory,
          tumorSubCategory: tumorClassification.subCategory,
          isHematological: tumorClassification.isHematological,
          isSolid: tumorClassification.isSolid,
          spreadCategory: spreadClassification,
          tumorid: row.tumorId || null,
          staging: {
            tCategory: tStg.tCategory,
            nCategory,
            mCategory,
            uicc: row.cUICC || row.pUICC || null,
            tClinical: tStg.tClinical,
            tPathological: tStg.tPathological,
          },
          cT: row.tnm_t || row.cT || null,
          cN: row.tnm_n || row.cN || null,
          cM: row.tnm_m || row.cM || null,
          pT: row.pT || null,
          pN: row.pN || null,
          pM: row.pM || null,
          primaerfall: row.primaerfall || null,
          rezidivDatum: row.rezidivDatum ? toISODateString(row.rezidivDatum) : null,
          metastasenDatum: row.metastasenDatum ? toISODateString(row.metastasenDatum) : null,
          nachsorgeDatum: row.nachsorgeDatum ? toISODateString(row.nachsorgeDatum) : null,
        };

        patients.push(patient);
      } catch (err) {
        warnings.push(`Zeile ${i + 1}: Fehler beim Parsen: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (patients.length === 0) {
      errors.push('No valid patient data found in TXT file');
    }

  } catch (err) {
    errors.push(`TXT parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Build empty extraColumns for TXT format (no extra columns expected)
  const extraColumns: ExtraColumnsState = { columns: {}, warnings: [] };

  // Build issues array for TXT format
  const issues: ParseIssue[] = [];

  return { patients, errors, warnings, extraColumns, issues };
}

/**
 * Build Patient objects from pre-split header + row arrays (CSV path).
 *
 * @param headers  - Column names, already trimmed and unquoted
 * @param rows     - Data rows; each inner array matches the headers by index,
 *                   values already trimmed and unquoted
 * @param warnings - Optional warnings array accumulated before this call
 *                   (e.g. from delimiter detection); defaults to []
 */
export function parseRows(
  headers: string[],
  rows: string[][],
  warnings: string[] = []
): CSVParseResult {
  const errors: string[] = [];
  const patients: Patient[] = [];

  // Build header → field map
  const headerMap = new Map<number, string>();

  headers.forEach((header, index) => {
    const mappedField = mapHeader(header) ?? praefixSpalte(header, rows.map(r => r[index]));
    if (mappedField) {
      headerMap.set(index, mappedField);
    }
  });

  // Build list of extra headers (those not mapped to known fields)
  const extraHeaders: string[] = [];
  const headerIndex: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h) continue;
    headerIndex[h] = i;
    if (!headerMap.has(i)) extraHeaders.push(h);
  }

  // TTFT (time to first treatment): a first-treatment-date column switches the
  // endpoint. Then survivalTime + event are DERIVED from dates, so they are not
  // required as columns; diagnosisDate (t0) is required instead.
  const mappedFields = Array.from(headerMap.values());
  const isTtftDataset = mappedFields.includes('firstTreatmentDate');

  // Validate required fields
  const requiredFields = isTtftDataset ? ['id'] : ['id', 'survivalTime', 'event'];
  const missingFields = requiredFields.filter(field => !mappedFields.includes(field));

  // Check if we have date fields for automatic survival time calculation
  const hasDateFields = mappedFields.some(field =>
    ['diagnosisDate', 'deathDate', 'lastContactDate', 'endDate'].includes(field)
  );

  if (isTtftDataset && !mappedFields.includes('diagnosisDate')) {
    errors.push('TTFT: "diagnosisDate" (Erstdiagnose) wird als Startzeit (t0) benötigt.');
    return { patients, errors, warnings, extraColumns: { columns: {}, warnings: [] }, issues: [] };
  }

  if (!isTtftDataset && missingFields.includes('survivalTime') && !hasDateFields) {
    errors.push('CSV muss entweder "survivalTime" oder Datumsfelder (diagnosisDate + deathDate/lastContactDate) enthalten');
    return { patients, errors, warnings, extraColumns: { columns: {}, warnings: [] }, issues: [] };
  }

  if (!isTtftDataset && missingFields.length > 0 && !missingFields.includes('survivalTime')) {
    warnings.push(`Fehlende empfohlene Felder: ${missingFields.join(', ')}. Verwende Standardwerte.`);
  }

  // Parse data rows
  for (let i = 0; i < rows.length; i++) {
    const values = rows[i];
    if (values.length === 0 || values.every(v => v === '')) continue;

    const row: Record<string, string> = {};

    values.forEach((value, index) => {
      const field = headerMap.get(index);
      if (field) {
        row[field] = value;
      }
    });

    try {
      // Parse event status first (needed for survival time calculation)
      let isEvent = row.event ? parseBoolean(row.event) : false;

      // Calculate or use provided survival time
      let survivalTime: number;
      if (isTtftDataset) {
        // TTFT: t0 = diagnosis; event = first treatment started; otherwise
        // censor at last contact. Derives both survivalTime and event.
        const diag = parseDate(row.diagnosisDate);
        const tx = parseDate(row.firstTreatmentDate);
        const censor = parseDate(row.lastContactDate || row.endDate || row.deathDate);
        if (diag && tx) {
          isEvent = true;
          survivalTime = calculateSurvivalTimeMonths(diag, tx);
        } else if (diag && censor) {
          isEvent = false;
          survivalTime = calculateSurvivalTimeMonths(diag, censor);
        } else {
          isEvent = false;
          survivalTime = 0;
          warnings.push(`Zeile ${i + 1}: TTFT braucht diagnosisDate + (firstTreatmentDate oder lastContactDate).`);
        }
      } else if (row.survivalTime) {
        survivalTime = parseFloat(row.survivalTime) || 0;
      } else {
        // Try to calculate from dates
        survivalTime = calculateSurvivalTime(
          row.diagnosisDate,
          row.deathDate,
          row.lastContactDate || row.endDate,
          isEvent
        );
      }

      // Calculate or use provided age
      let age: number;
      if (row.age) {
        age = parseInt(row.age) || 0;
      } else {
        const calculatedAge = calculateAge(row.birthDate, row.diagnosisDate);
        age = calculatedAge !== null ? calculatedAge : 0;
      }

      // Build patient object with defaults
      const tStg = deriveTStaging(row);
      const nCategory = row.tnm_n || row.cN || null;
      const mCategory = row.tnm_m || row.cM || null;
      const tumorClassification = categorizeTumor(row.tumorType || 'Unknown');
      const spreadClassification = categorizeSpread({ tCategory: tStg.tCategory, nCategory, mCategory });
      const patient: Patient = {
        id: row.id || `patient_${i + 1}`,
        // Rohwerte wie M, W oder Female treffen den Geschlechtsfilter nicht.
        gender: normalizeGender(row.gender),
        age: age,
        tumorType: row.tumorType || 'Unknown',
        tumorCategory: row.tumorCategory || row.tumorLocation || null,
        tumorLocation: row.tumorLocation || 'Unknown',
        diagnosisDate: toISODateString(row.diagnosisDate),
        followupDateString: row.endDate || row.lastContactDate || row.deathDate || null,
        survivalTime: survivalTime,
        event: isEvent,
        vitalStatus: !isEvent,
        grading: row.grading || null,
        isPrimaryCase: true,
        tumorMainCategory: tumorClassification.mainCategory,
        tumorSubCategory: tumorClassification.subCategory,
        isHematological: tumorClassification.isHematological,
        isSolid: tumorClassification.isSolid,
        spreadCategory: spreadClassification,
        tumorid: row.tumorId || null,
        staging: {
          uicc: row.staging || row.cUICC || null,
          tCategory: tStg.tCategory,
          nCategory,
          mCategory,
          tClinical: tStg.tClinical,
          tPathological: tStg.tPathological,
        },
        cT: row.cT || row.tnm_t || null,
        cN: row.cN || row.tnm_n || null,
        cM: row.cM || row.tnm_m || null,
        pT: row.pT || null,
        pN: row.pN || null,
        pM: row.pM || null,
        primaerfall: row.primaerfall || null,
        firstTreatmentDate: row.firstTreatmentDate ? toISODateString(row.firstTreatmentDate) : null,
        rezidivDatum: row.rezidivDatum ? toISODateString(row.rezidivDatum) : null,
        metastasenDatum: row.metastasenDatum ? toISODateString(row.metastasenDatum) : null,
        nachsorgeDatum: row.nachsorgeDatum ? toISODateString(row.nachsorgeDatum) : null,
        endpoint: isTtftDataset ? 'ttft' : undefined,
      };

      // Populate extras from extra headers
      const extras: Record<string, string> = {};
      for (const eh of extraHeaders) {
        const idx = headerIndex[eh];
        const v = values[idx];
        if (v != null && String(v).trim() !== "") {
          extras[eh] = String(v);
        }
      }
      if (Object.keys(extras).length > 0) {
        patient.extras = extras;
      }

      patients.push(patient);
    } catch (err) {
      errors.push(`Error parsing row ${i + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  if (patients.length === 0 && errors.length === 0) {
    errors.push('No valid patient data found in CSV file');
  }

  // Build extraColumns state
  const extraColumns: ExtraColumnsState = { columns: {}, warnings: [] };
  for (const eh of extraHeaders) {
    const values = patients
      .map(p => p.extras?.[eh])
      .filter((v): v is string => typeof v === "string");
    const meta = analyzeColumn(values);
    extraColumns.columns[eh] = meta;
    if (meta.type === 'numeric' && meta.conversionApplied && meta.conversionApplied.length > 0) {
      for (const c of meta.conversionApplied) {
        extraColumns.warnings.push({
          kind: 'unit_conversion',
          column: eh,
          message: 'unit_conversion',
          details: { fromUnit: c.fromUnit, toUnit: c.toUnit, nValues: c.nValues, factor: c.factor },
        });
      }
    }
    if (meta.type === 'categorical' && meta.cardinalityWarning) {
      extraColumns.warnings.push({
        kind: 'cardinality',
        column: eh,
        message: 'cardinality',
        details: { cardinality: meta.cardinality },
      });
    }
  }

  // Build issues array
  const issues: ParseIssue[] = [];

  const hasField = (field: string): boolean => {
    return HEADER_ALIASES[field]?.some(alias =>
      headers.some(h => normalizeHeader(h) === normalizeHeader(alias))
    ) ?? false;
  };

  // For TTFT datasets, event + survivalTime are derived from the dates, so they
  // are not required as columns and must not raise blocking validation issues.
  if (!isTtftDataset) {
    if (!hasField('event')) {
      issues.push({ level: 'required', field: 'event', message: 'event' });
    }
    const hasSurvivalTime = hasField('survivalTime');
    const hasDateBased = hasField('diagnosisDate') &&
      (hasField('endDate') || hasField('deathDate') || hasField('lastContactDate'));
    if (!hasSurvivalTime && !hasDateBased) {
      issues.push({ level: 'required', field: 'survivalTime', message: 'survivalTime' });
    }
  }

  if (!hasField('id')) issues.push({ level: 'recommended', field: 'id', message: 'id' });
  if (!hasField('tumorType')) issues.push({ level: 'recommended', field: 'tumorType', message: 'tumorType' });
  if (!hasField('diagnosisDate')) issues.push({ level: 'recommended', field: 'diagnosisDate', message: 'diagnosisDate' });

  return { patients, errors, warnings, extraColumns, issues };
}
