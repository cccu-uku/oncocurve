/** Pfade innerhalb eines Follow-up-Knotens. */
export interface FollowUpPaths {
  date: string;
  vitalStatus: string;
  localStatus: string;
  /** Prostata 1.0 führt kein Lymphknotenfeld im Verlauf, dort ist es null. */
  nodalStatus: string | null;
  distantStatus: string;
  /** Darm 1.0 kennt keinen Gesamtstatus, dort ist das Feld null. */
  overallStatus: string | null;
  secondTumor: string;
  /** Herkunft der Meldung. Nur Brust 1.0 führt sie, andere Boxen setzen null. */
  quelleFollowUp: string | null;
  /**
   * Eigene Ereignisdaten im Verlaufsknoten. Nur Prostata 1.0 führt sie: die
   * Box nennt das Datum des Rezidivs selbst, statt es über das
   * Untersuchungsdatum zu nähern. Alle anderen Boxen setzen null.
   */
  localRecurrenceDate: string | null;
  biochemicalRecurrence: string | null;
  biochemicalRecurrenceDate: string | null;
  distantMetastasisDate: string | null;
}

/**
 * Ein TNM-Wert samt Kennzeichner, ob er klinisch oder pathologisch erhoben
 * wurde. Brust 1.0 (praeTcp) und die 2.0-Boxen (Praeth_T_c_p, Postop_T_c_p)
 * notieren ihn je Komponente, Darm 1.0 und Lunge 2.0 gar nicht.
 */
export interface TnmPath {
  value: string;
  /** null, wo die Box keinen Kennzeichner führt. */
  designator: string | null;
}

/** T, N und M eines Erhebungszeitpunkts. */
export interface TnmBlockPaths {
  t: TnmPath;
  n: TnmPath;
  m: TnmPath;
}

/** Pfade innerhalb eines Fallknotens und darüber. */
export interface CasePaths {
  followUps: string;
  distantMets: string | null;
  distantMetDate: string | null;
  distantMetSite: string | null;
  caseId: string;
  icd10: string;
  side: string | null;
  diagnosisDate: string;
  ageAtDiagnosis: string | null;
  deathDateInCase: string | null;
  grading: string | null;
  // Getrennt nach Erhebungszeitpunkt, nicht nach klinisch und pathologisch:
  // welche der beiden Spalten ein Wert füllt, entscheidet erst sein
  // Kennzeichner. Die Musterlösungen belegen beide Richtungen: 30 von 33
  // prätherapeutischen Werten in Brust 1.0 sind pathologisch, und umgekehrt
  // ist fast jedes postoperative M in Brust 2.0 klinisch erhoben.
  preTherapy: TnmBlockPaths;
  postOp: TnmBlockPaths;
}

/** Pfade innerhalb eines Patientenknotens. */
export interface PatientPaths {
  cases: string;
  patientId: string;
  gender: string;
  birthYear: string | null;
  /**
   * Alter am Patientknoten. Brust 1.0 fuehrt es dort statt am Fall und hat
   * kein Geburtsjahr, laesst sich also weder direkt noch abgeleitet lesen,
   * solange nur der Fallknoten geprueft wird.
   */
  ageAtDiagnosis: string | null;
  deathDate: string | null;
  deathTumorRelated: string | null;
}

export interface MarkerPaths {
  /** Pfad im Fallknoten, dessen Wert einen Primärfall kennzeichnet. */
  primary: { path: string; values: string[] } | null;
  centerCase: { path: string; values: string[] } | null;
  /** Zentrumstyp wie BZ oder DZ, nur Familie 1.0 führt ihn im Datensatz. */
  centerType: string | null;
}

/**
 * Pfade der Felder, die nur die Ausschlusskriterien brauchen. Jeder Eintrag
 * ist einzeln abschaltbar, weil keine Box alle sechs führt.
 */
export interface AusschlussPaths {
  residualstatusLokal: string | null;
  residualstatusGesamt: string | null;
  krebsvorerkrankung: string | null;
  uiccStadium: string | null;
  synchronerPrimaertumor: string | null;
  opDatum: string | null;
  /**
   * Felder der Falltypisierung von Prostata 1.0. Die Ausschlussmatrix dieser
   * Box verzweigt nach nicht interventionellem Fall, interventionellem Fall
   * und Zufallsbefund, und diese Einteilung hängt an Operation, Bestrahlung
   * und Systemtherapie. Keine andere Box kennt so etwas.
   */
  opTyp: string | null;
  bestrahlungsTyp: string | null;
  bestrahlungsZeitpunkt: string | null;
  bestrahlungsIntention: string | null;
  therapieTyp: string | null;
  zufallsbefund: string | null;
}

export interface BoxProfile {
  id: string;
  patientsPath: string;
  patient: PatientPaths;
  case: CasePaths;
  followUp: FollowUpPaths;
  markers: MarkerPaths;
  ausschluss: AusschlussPaths;
  /** Darm 1.0 liefert eine ICD-O-Topographie statt eines ICD-10-Codes. */
  icdIsTopography: boolean;
  // Vitalstatus je Box als exakte Wertelisten. Kein Präfixvergleich: die
  // 1.0-Prüfschemata deklarieren das Feld als offenen xs:string, ein Präfix
  // würde künftige Codes stillschweigend mitfangen. Ein Rohwert, der in keiner
  // der beiden Listen steht, ergibt null und damit Zensierung.
  aliveVitalStatusValues: string[];
  deadVitalStatusValues: string[];
}
