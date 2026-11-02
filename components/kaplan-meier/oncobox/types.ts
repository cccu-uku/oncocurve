import type { VitalStatus } from "./vital-status";

export interface OncoBoxFollowUp {
  date: string | null;
  vitalStatus: VitalStatus | null;
  localStatus: string | null;
  nodalStatus: string | null;
  distantStatus: string | null;
  overallStatus: string | null;
  secondTumor: boolean | null;
  /**
   * Rohwert des Zweittumorfelds. Darm 1.0 codiert 0, 1 und 2, wobei 2
   * "unbekannt" heißt; die Umwandlung in einen Wahrheitswert macht daraus
   * dasselbe wie aus 0 und verliert genau den Unterschied, den die Kategorien
   * B und C der Spezifikation brauchen.
   */
  secondTumorRaw: string | null;
  /** Nur Brust 1.0 führt die Herkunft der Meldung, andere Boxen liefern null. */
  quelleFollowUp: string | null;
  /** Nur Prostata 1.0: Ereignisdaten, die die Box selbst nennt. */
  localRecurrenceDate: string | null;
  biochemicalRecurrence: string | null;
  biochemicalRecurrenceDate: string | null;
  distantMetastasisDate: string | null;
}

export interface OncoBoxStaging {
  cT: string | null;
  cN: string | null;
  cM: string | null;
  pT: string | null;
  pN: string | null;
  pM: string | null;
  grading: string | null;
}

/**
 * Felder, die allein die Ausschlusskriterien der Boxspezifikationen brauchen.
 * Roh und ungedeutet: was ein Wert bedeutet, entscheidet die Boxregel, nicht
 * der Importer. Eine Box, die ein Feld nicht führt, liefert null.
 */
export interface OncoBoxAusschlussFelder {
  /** Residualstatus lokal nach allen Operationen, etwa R0, R1, R2, RX. */
  residualstatusLokal: string | null;
  /** Residualstatus gesamt nach Primärtherapie. Nur Darm 1.0 führt ihn. */
  residualstatusGesamt: string | null;
  /** Relevante Krebsvorerkrankung. Brust codiert J/N, Darm 0/1/9. */
  krebsvorerkrankung: string | null;
  /** Prätherapeutisches UICC-Stadium, Darm: 1 bis 4, 9 gleich nicht ermittelbar. */
  uiccStadium: string | null;
  /** Synchron behandelter weiterer kolorektaler Primärtumor, Darm: 0 oder 1. */
  synchronerPrimaertumor: string | null;
  /** Datum der operativen Tumorentfernung, Grundlage der 30-Tage-Mortalität. */
  opDatum: string | null;
  /** Nur Prostata 1.0, siehe AusschlussPaths. */
  opTyp: string | null;
  bestrahlungsTyp: string | null;
  bestrahlungsZeitpunkt: string | null;
  bestrahlungsIntention: string | null;
  therapieTyp: string | null;
  zufallsbefund: string | null;
}

export interface OncoBoxCase {
  patientId: string;
  caseId: string;
  isPrimary: boolean | null;
  isCenterCase: boolean | null;
  centerType: string | null;
  icd10: string | null;
  icdIsTopography: boolean;
  side: string | null;
  diagnosisDate: string | null;
  ageAtDiagnosis: number | null;
  gender: string;
  deathDate: string | null;
  deathTumorRelated: boolean | null;
  staging: OncoBoxStaging;
  followUps: OncoBoxFollowUp[];
  distantMets: { date: string | null; site: string | null }[];
  ausschlussFelder: OncoBoxAusschlussFelder;
}

export interface OncoBoxMeta {
  boxType: string;
  /**
   * Kennung des Profils, mit dem die Datei gelesen wurde: brust-1, darm-1
   * oder family-2. boxType allein trennt die Familien nicht, es steht für
   * Brust 1.0 und Brust 2.0 gleichermaßen auf "brust".
   */
  profileId: string;
  schemaVersion: string;
  patientCount: number;
  caseCount: number;
  followUpCount: number;
}

export interface OncoBoxImportResult {
  patients: unknown[];
  errors: string[];
  warnings: string[];
  meta: OncoBoxMeta | null;
  /**
   * Gesetzt, wenn die Datei einwandfrei gelesen und einer Box zugeordnet wurde,
   * diese Box aber noch nicht unterstuetzt wird. Das ist kein Lesefehler, und
   * die Oberflaeche soll es auch nicht als solchen darstellen.
   */
  unsupported?: { boxType: string; schemaVersion: string };
}
