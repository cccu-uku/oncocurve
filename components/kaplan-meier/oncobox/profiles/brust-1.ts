import type { BoxProfile } from "../box-profile";

export const BRUST_1_PROFILE: BoxProfile = {
  id: "brust-1",
  // Bei Familie 1.0 ist Patienten selbst das Wurzelelement, der Pfad ist also
  // relativ dazu nur Patient. Familie 2.0 hat Patienten unter der Wurzel.
  patientsPath: "Patient",
  patient: {
    cases: "Fall",
    patientId: "Stammdaten/PatientID",
    gender: "Stammdaten/Geschlecht",
    birthYear: null,
    ageAtDiagnosis: "Stammdaten/Alter",
    deathDate: null,
    deathTumorRelated: null,
  },
  case: {
    followUps: "FollowUp",
    distantMets: null,
    distantMetDate: null,
    distantMetSite: null,
    caseId: "Fallinfos/FallNummer",
    icd10: "Diagnose/TumordiagnoseICD10",
    side: "Diagnose/Seitenlokalisation",
    diagnosisDate: "Diagnose/DatumDiagnose",
    ageAtDiagnosis: null,
    deathDateInCase: "Abschluss/Sterbedatum",
    grading: "PostoperativeHistologieStaging/Grading",
    preTherapy: {
      t: { value: "Diagnose/praeT", designator: "Diagnose/praeTcp" },
      n: { value: "Diagnose/praeN", designator: "Diagnose/praeNcp" },
      m: { value: "Diagnose/praeM", designator: "Diagnose/praeMcp" },
    },
    postOp: {
      t: { value: "PostoperativeHistologieStaging/pT", designator: null },
      n: { value: "PostoperativeHistologieStaging/pN", designator: null },
      m: { value: "PostoperativeHistologieStaging/pM", designator: null },
    },
  },
  followUp: {
    date: "DatumFollowUp",
    vitalStatus: "Vitalstatus",
    localStatus: "TumorstatusLokal",
    nodalStatus: "LymphknotenRezidiv",
    distantStatus: "Fernmetastasen",
    overallStatus: "TumorstatusGesamt",
    secondTumor: "Zweittumor",
    quelleFollowUp: "QuelleFollowUp",
    // Nur Prostata 1.0 nennt eigene Ereignisdaten. Hier bleibt es beim
    // Untersuchungsdatum als Näherung.
    localRecurrenceDate: null,
    biochemicalRecurrence: null,
    biochemicalRecurrenceDate: null,
    distantMetastasisDate: null,
  },
  markers: {
    primary: { path: "Fallinfos/Primärtumor", values: ["P"] },
    centerCase: { path: "Fallinfos/Zentrumsfall", values: ["ZF"] },
    centerType: "Fallinfos/Organ",
  },
  // Quelle: eb_brust-G3.1_prüfschema xml (141202).xsd. Brust 1.0 führt weder
  // ein UICC-Stadium noch ein Datum der Tumorentfernung.
  ausschluss: {
    residualstatusLokal: "PostoperativeHistologieStaging/PSRLokalNachAllenOPs",
    residualstatusGesamt: null,
    krebsvorerkrankung: "Fallinfos/Vorerkrankungen",
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
  // Die Brust-1.0-Box führt keine Spezifikationstabelle im Ordner, das
  // Prüfschema deklariert Vitalstatus als offenen xs:string. Die Musterlösung
  // nutzt L, T, TN und TX, und genau die 9 T-Werte tragen ein Sterbedatum.
  // Die Vierteilung entspricht der von Darm 1.0: lebend plus drei Todesursachen.
  aliveVitalStatusValues: ["L"],
  deadVitalStatusValues: ["T", "TN", "TX"],
};
