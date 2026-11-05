import type { BoxProfile } from "../box-profile";

/**
 * Brust 2.0, Darm 2.0 und Lunge 2.0 tragen alle überlebensrelevanten Felder
 * unter denselben Namen. Was sich unterscheidet, ist organspezifisch und wird
 * für Kurven nicht gebraucht.
 */
export const FAMILY_2_PROFILE: BoxProfile = {
  id: "family-2",
  patientsPath: "Patienten/Patient",
  patient: {
    cases: "Fall",
    patientId: "Stammdaten/OncoBoxID",
    gender: "Stammdaten/Geschlecht",
    birthYear: "Stammdaten/Geburtsjahr",
    ageAtDiagnosis: null,
    deathDate: "Stammdaten/Sterbedatum",
    deathTumorRelated: "Stammdaten/Tod_tumorbedingt",
  },
  case: {
    followUps: "Follow_Up",
    distantMets: "Fernmetastase",
    distantMetDate: "Fernmetastase_Diagnosedatum",
    distantMetSite: "Fernmetastase_Lokalisation",
    caseId: "Fallinformation/FallID",
    icd10: "Diagnose/ICD_10",
    side: "Diagnose/Seitenlokalisation",
    diagnosisDate: "Diagnose/Diagnosedatum",
    ageAtDiagnosis: "Diagnose/Alter",
    deathDateInCase: null,
    grading: "Histologie/Grading",
    preTherapy: {
      t: { value: "Diagnose/Praeth_T", designator: "Diagnose/Praeth_T_c_p" },
      n: { value: "Diagnose/Praeth_N", designator: "Diagnose/Praeth_N_c_p" },
      m: { value: "Diagnose/Praeth_M", designator: "Diagnose/Praeth_M_c_p" },
    },
    postOp: {
      t: { value: "Diagnose/Postop_T", designator: "Diagnose/Postop_T_c_p" },
      n: { value: "Diagnose/Postop_N", designator: "Diagnose/Postop_N_c_p" },
      m: { value: "Diagnose/Postop_M", designator: "Diagnose/Postop_M_c_p" },
    },
  },
  followUp: {
    date: "Untersuchungsdatum_Verlauf",
    vitalStatus: "Vitalstatus",
    localStatus: "Verlauf_Lokaler_Tumorstatus",
    nodalStatus: "Verlauf_Tumorstatus_Lymphknoten",
    distantStatus: "Verlauf_Tumorstatus_Fernmetastasen",
    overallStatus: "Gesamtbeurteilung_Tumorstatus",
    secondTumor: "Zweittumor",
    // Nur Brust 1.0 führt die Herkunft der Meldung.
    quelleFollowUp: null,
    // Nur Prostata 1.0 nennt eigene Ereignisdaten. Hier bleibt es beim
    // Untersuchungsdatum als Näherung.
    localRecurrenceDate: null,
    biochemicalRecurrence: null,
    biochemicalRecurrenceDate: null,
    distantMetastasisDate: null,
  },
  markers: {
    primary: { path: "Diagnose/Zertifizierung", values: ["1"] },
    centerCase: { path: "Diagnose/Zertifizierung", values: ["1", "2"] },
    centerType: null,
  },
  // Familie 2.0 bekommt ihre Kurvenregel erst mit dem EQ-Kategorienschema.
  // Bis dahin bleiben die Pfade leer, statt Felder der 1.0-Boxen zu raten.
  ausschluss: {
    residualstatusLokal: null,
    // Gesamtbeurteilung_Residualstatus steht im Diagnoseknoten, nicht im
    // Verlauf. Die EQ-Definition der 2.0-Boxen nennt R0 als eine der beiden
    // Bedingungen für "tumorfrei".
    residualstatusGesamt: "Diagnose/Gesamtbeurteilung_Residualstatus",
    krebsvorerkrankung: null,
    uiccStadium: null,
    synchronerPrimaertumor: null,
    opDatum: null,
    // Falltypisierung gibt es nur bei Prostata 1.0.
    opTyp: null,
    bestrahlungsTyp: null,
    bestrahlungsZeitpunkt: null,
    bestrahlungsIntention: null,
    therapieTyp: null,
    zufallsbefund: null,
  },
  icdIsTopography: false,
  // vitalstatus_einzeltyp aus den 2.0-Prüfschemata: L lebend, T verstorben.
  aliveVitalStatusValues: ["L"],
  deadVitalStatusValues: ["T"],
};
