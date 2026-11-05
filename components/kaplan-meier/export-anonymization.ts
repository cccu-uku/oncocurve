import { zeilenSchluessel } from "./fall-kennung";

// Pure helpers for the "share this export" modes. Deliberately free of React,
// next-intl and DOM access so the whole transform can be unit-tested in the
// Node test environment.
//
// The analyses (KM curves, log-rank, Cox) always run on the ORIGINAL data;
// this module is applied afterwards, to the exported patient table only.

export type ExportMode = "full" | "noPatients" | "pseudonymized";

/** Maximum shift applied to a patient's dates, in days (4 weeks). */
export const MAX_SHIFT_DAYS = 28;

export interface RawPatientDates {
  diagnosis: Date | null;
  vital: Date | null;
}

// FNV-1a (32 bit). Any stable, well-spread hash would do; this one is short,
// dependency-free and gives the same result in every browser and in Node.
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Per-patient date offset in whole days, within [-MAX_SHIFT_DAYS, +MAX_SHIFT_DAYS].
 *
 * Derived from the real patient id rather than Math.random() on purpose: with a
 * fresh random offset per export, the same patient would get different dates in
 * two exports, and anyone holding both files could average the offset out and
 * recover the true date. Deterministic means repeated exports leak nothing new.
 */
export function dateOffsetDaysFor(patientId: string): number {
  const span = MAX_SHIFT_DAYS * 2 + 1; // 57 possible values: -28 .. +28
  return (hash32(patientId) % span) - MAX_SHIFT_DAYS;
}

/** Returns a NEW date shifted by `days`; null passes through. */
export function shiftDate(date: Date | null, days: number): Date | null {
  if (!date) return null;
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + days); // handles month/year rollover
  return out;
}

/** Sequential, 1-based, zero-padded pseudonym: index 0 -> "P0001". */
export function pseudonymFor(index: number): string {
  return `P${String(index + 1).padStart(4, "0")}`;
}

/**
 * Replaces real patient ids with sequential pseudonyms and shifts both date
 * columns by that patient's offset.
 *
 * Both dates of one patient move by the SAME amount, so the interval between
 * them — and therefore the "months" column and every statistic derived from it
 * — stays exactly intact.
 *
 * Pseudonyms are positional: re-sorting the table and exporting again yields
 * different numbers for the same patients. That is accepted; it also prevents a
 * stable pseudonym from becoming a recognisable marker across several files.
 *
 * `formatDate` is injected so this module stays free of locale handling.
 */
export function pseudonymizeTableRows<T extends Record<string, unknown>>(
  rows: T[],
  rawDatesById: Map<string, RawPatientDates>,
  formatDate: (d: Date | null) => string,
): T[] {
  return rows.map((row, index) => {
    // Beide Kennungen zusammen, denn die Tabelle führt sie getrennt. Mit der
    // Patientennummer allein fände die Verschiebung bei mehreren Fällen
    // derselben Person die falsche Zeile.
    const realId = zeilenSchluessel(row.patientId, row.caseId);
    const offset = dateOffsetDaysFor(realId);
    const raw = rawDatesById.get(realId);
    return {
      ...row,
      patientId: pseudonymFor(index),
      // Die Fallnummer stammt aus dem Quellsystem und identifiziert für sich
      // genommen. Sie darf ein pseudonymisierter Export nicht mitnehmen, sonst
      // wäre das Pseudonym daneben wertlos.
      ...("caseId" in row ? { caseId: "" } : {}),
      diagnosisDate: raw ? formatDate(shiftDate(raw.diagnosis, offset)) : row.diagnosisDate,
      vitalDate: raw ? formatDate(shiftDate(raw.vital, offset)) : row.vitalDate,
    };
  });
}
