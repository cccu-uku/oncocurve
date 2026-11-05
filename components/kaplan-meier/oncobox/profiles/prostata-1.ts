import type { BoxProfile } from "../box-profile";

/**
 * Prostata 1.0. Die Box nutzt als einzige englische Elementnamen und hängt
 * ihre Ausschlusskriterien an eine Falltypisierung, die Operation,
 * Bestrahlung und Systemtherapie liest.
 *
 * Quelle: _prüfschema oncobox xml (230115).xsd und
 * eb_prostata-Q1.1.1_spez xml-oncobox-A1 (251203).xlsx, Blatt Categories.
 */
export const PROSTATA_1_PROFILE: BoxProfile = {
  id: "prostata-1",
  // Wurzelelement ist Patienten wie bei Brust und Darm 1.0.
  patientsPath: "Patient",
  patient: {
    cases: "Case",
    patientId: "BasicInformation/PatientID",
    gender: "BasicInformation/Gender",
    // Die Box führt ein volles Geburtsdatum, kein Geburtsjahr. toInteger
    // liest die führende Jahreszahl, und daraus leitet parse-cases das Alter
    // am Diagnosedatum ab.
    birthYear: "BasicInformation/Birthday",
    ageAtDiagnosis: null,
    deathDate: "BasicInformation/DateOfDeath",
    deathTumorRelated: null,
  },
  case: {
    followUps: "FollowUp",
    distantMets: null,
    distantMetDate: null,
    distantMetSite: null,
    caseId: "CaseInformation/CaseID",
    icd10: "Diagnosis/ICD10",
    side: null,
    diagnosisDate: "Diagnosis/DateDiagnosis",
    ageAtDiagnosis: null,
    deathDateInCase: null,
    // Prostata bewertet mit dem Gleason-Wert, nicht mit einem Grading.
    grading: null,
    preTherapy: {
      t: { value: "Diagnosis/cT", designator: null },
      n: { value: "Diagnosis/cN", designator: null },
      m: { value: "Diagnosis/cM", designator: null },
    },
    postOp: {
      t: { value: "PostoperativeHistology/pT", designator: null },
      n: { value: "PostoperativeHistology/pN", designator: null },
      m: { value: "PostoperativeHistology/pM", designator: null },
    },
  },
  followUp: {
    date: "FollowUpDate",
    vitalStatus: "LifeStatus",
    localStatus: "LocalRecurrence",
    // Kein Lymphknotenfeld im Verlaufsknoten dieser Box.
    nodalStatus: null,
    distantStatus: "Metastasis",
    overallStatus: "TumourStatus",
    secondTumor: "SecondaryTumour",
    // Nur Brust 1.0 führt die Herkunft der Meldung.
    quelleFollowUp: null,
    localRecurrenceDate: "DateRecurrence",
    biochemicalRecurrence: "BiochemicalRecurrence",
    biochemicalRecurrenceDate: "DateBiochemical",
    distantMetastasisDate: "DateMetastasis",
  },
  markers: {
    // P steht für Primärfall, R für Rezidiv, D für Fernmetastasen.
    primary: { path: "CaseInformation/PrimaryTumour", values: ["P"] },
    centerCase: { path: "CaseInformation/CenterCase", values: ["CC"] },
    // Kein Organfeld. Der Zentrumstyp folgt aus der Boxbezeichnung.
    centerType: null,
  },
  icdIsTopography: false,
  // LifeStatus laut Blatt Kaplan-Meier (DFS): A lebend, D, DN und DX
  // verstorben mit unterschiedlicher Angabe zur Todesursache.
  aliveVitalStatusValues: ["A"],
  deadVitalStatusValues: ["D", "DN", "DX"],
  ausschluss: {
    residualstatusLokal: "PostoperativeHistology/MarginStatus",
    residualstatusGesamt: null,
    // Comorbidities ist eine Codeliste; 10 steht für die relevante
    // Krebsvorerkrankung, nicht J wie bei Brust.
    krebsvorerkrankung: "CaseInformation/Comorbidities",
    uiccStadium: null,
    synchronerPrimaertumor: null,
    opDatum: "Surgery/SurgeryDate",
    opTyp: "Surgery/SurgeryType",
    bestrahlungsTyp: "Radiotherapy/RadiotherapyType",
    bestrahlungsZeitpunkt: "Radiotherapy/RadiotherapyTime",
    bestrahlungsIntention: "Radiotherapy/RadiotherapyIntent",
    therapieTyp: "Treatment/TreatmentType",
    zufallsbefund: "PostoperativeHistology/IncidentalFinding",
  },
};
