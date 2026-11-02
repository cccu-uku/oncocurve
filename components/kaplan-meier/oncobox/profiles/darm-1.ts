import type { BoxProfile } from "../box-profile";

export const DARM_1_PROFILE: BoxProfile = {
  id: "darm-1",
  // Wurzelelement ist Patienten, siehe Kommentar im Brust-1.0-Profil.
  patientsPath: "Patient",
  patient: {
    cases: "Fall",
    patientId: "Stammdaten/PatientID",
    gender: "Stammdaten/Geschlecht",
    birthYear: "Stammdaten/GeburtsJahr",
    ageAtDiagnosis: null,
    deathDate: null,
    deathTumorRelated: null,
  },
  case: {
    followUps: "FollowUp",
    distantMets: null,
    distantMetDate: null,
    distantMetSite: null,
    caseId: "Fallinfos/FallNummer",
    icd10: "Diagnose/ICDOLokalisation",
    side: null,
    diagnosisDate: "Diagnose/DatumErstdiagnosePrimaertumor",
    ageAtDiagnosis: null,
    // Darm 1.0 kennt kein Abschluss-Element. Der Tod steht ausschließlich im
    // Follow-up-Feld Verstorben.
    deathDateInCase: null,
    grading: "PostoperativeHistologieStaging/Grading",
    // Darm 1.0 führt keinen c/p-Kennzeichner. Es bleibt bei der Zuordnung
    // prätherapeutisch gleich klinisch, postoperativ gleich pathologisch.
    preTherapy: {
      t: { value: "Diagnose/praeT", designator: null },
      n: { value: "Diagnose/praeN", designator: null },
      m: { value: "Diagnose/praeM", designator: null },
    },
    postOp: {
      t: { value: "PostoperativeHistologieStaging/pT", designator: null },
      n: { value: "PostoperativeHistologieStaging/pN", designator: null },
      // Die Darm-Box nennt die pathologische M-Kategorie postM, nicht pM.
      m: { value: "PostoperativeHistologieStaging/postM", designator: null },
    },
  },
  // Der Follow-up-Block von Darm 1.0 heißt anders als der von Brust 1.0.
  // Quelle: Spezifikationstabelle eb_darm-P1.1.1, Felder Q1 bis Q7.
  followUp: {
    date: "DatumFollowUp",
    vitalStatus: "Verstorben",
    localStatus: "LokoregionaeresRezidiv",
    nodalStatus: "LymphknotenRezidiv",
    distantStatus: "Fernmetastasen",
    // Einen Gesamtstatus führt die Darm-1.0-Box nicht.
    overallStatus: null,
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
    // Darm 1.0 kennt keinen Primärfallmarker. Alle Zentrumsfälle gelten als
    // Primärfälle, siehe Hinweis im Datenqualitätspanel.
    primary: null,
    centerCase: { path: "Fallinfos/Zentrumsfall", values: ["1"] },
    centerType: "Fallinfos/Organ",
  },
  // Quelle: eb_darm-F4.1_prüfschema xml (140920).xsd. Darm 1.0 führt zwei
  // Residualstatus: lokal nach allen Operationen und gesamt nach
  // Primärtherapie. Die Vollremission des Ausschlusskriteriums meint den
  // zweiten.
  ausschluss: {
    residualstatusLokal: "PostoperativeHistologieStaging/PSRLokalNachAllenOPs",
    residualstatusGesamt: "PostoperativeHistologieStaging/PSRGesamtNachPrimaertherapie",
    krebsvorerkrankung: "Anamnese/RelevanteKrebsvorerkrankungen",
    uiccStadium: "Diagnose/UICCStadium",
    synchronerPrimaertumor: "Diagnose/SynchroneBehandlungKolorektalerPrimaertumoren",
    opDatum: "ChirurgischePrimaertherapie/DatumOperativeTumorentfernung",
    // Falltypisierung gibt es nur bei Prostata 1.0.
    opTyp: null,
    bestrahlungsTyp: null,
    bestrahlungsZeitpunkt: null,
    bestrahlungsIntention: null,
    therapieTyp: null,
    zufallsbefund: null,
  },
  icdIsTopography: true,
  // Feld Verstorben (Q6) laut Spezifikationstabelle: 0 nicht verstorben,
  // 1 tumorbedingt, 2 nicht tumorbedingt, 3 Todesursache unbekannt.
  aliveVitalStatusValues: ["0"],
  deadVitalStatusValues: ["1", "2", "3"],
};
