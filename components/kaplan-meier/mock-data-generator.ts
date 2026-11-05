/**
 * Mock Data Generator for Kaplan-Meier Analysis
 * Generates realistic patient data for testing and demonstration
 */

import { Patient } from "./obds-parser-new";
import { categorizeTumor, categorizeSpread } from "./tumor-classification";
import { type TumorMainCategory, type SpreadCategory } from "./tumor-classification";

interface MockDataOptions {
  patientCount?: number;
  maxSurvivalMonths?: number;
  eventRate?: number; // Percentage of patients who experience the event (death)
}

/**
 * Generate mock patient data for testing
 */
export function generateMockPatients(options: MockDataOptions = {}): Patient[] {
  const {
    patientCount = 150,
    maxSurvivalMonths = 60,
    eventRate = 0.4
  } = options;

  const patients: Patient[] = [];
  
  // Realistic tumor types from oncology
  const tumorTypes = [
    "C78.9 - Bronchialkarzinom",
    "C50.9 - Mammakarzinom", 
    "C18.9 - Kolonkarzinom",
    "C25.9 - Pankreaskarzinom",
    "C61 - Prostatakarzinom",
    "C56 - Ovarialkarzinom",
    "C43.9 - Malignes Melanom",
    "C67.9 - Harnblasenkarzinom",
    "C22.0 - Hepatozelluläres Karzinom",
    "C15.9 - Ösophaguskarzinom"
  ];

  const tumorLocations = [
    "Lunge",
    "Brust", 
    "Kolon",
    "Pankreas",
    "Prostata",
    "Ovar",
    "Haut",
    "Harnblase",
    "Leber",
    "Ösophagus"
  ];

  const uiccStages = ["I", "II", "III", "IV"];
  const gradings = ["G1", "G2", "G3", "G4"];
  const genders = ["male", "female"];

  for (let i = 1; i <= patientCount; i++) {
    // Generate age with realistic distribution (more older patients)
    const age = Math.floor(Math.random() * 40) + 45 + Math.floor(Math.random() * 30);
    
    // Generate gender
    const gender = genders[Math.floor(Math.random() * genders.length)];
    
    // Select tumor type and location
    const tumorIndex = Math.floor(Math.random() * tumorTypes.length);
    const tumorType = tumorTypes[tumorIndex];
    const tumorLocation = tumorLocations[tumorIndex];
    
    // Generate staging with realistic distribution (more advanced stages)
    const stagingProbs = [0.15, 0.25, 0.35, 0.25]; // I, II, III, IV
    const stageRandom = Math.random();
    let selectedStage = "IV";
    let cumProb = 0;
    for (let j = 0; j < stagingProbs.length; j++) {
      cumProb += stagingProbs[j];
      if (stageRandom <= cumProb) {
        selectedStage = uiccStages[j];
        break;
      }
    }
    
    // Generate grading
    const grading = gradings[Math.floor(Math.random() * gradings.length)];
    
    // Generate diagnosis date (last 5 years) - now as string
    const diagnosisDate = new Date();
    diagnosisDate.setMonth(diagnosisDate.getMonth() - Math.floor(Math.random() * 60));
    const diagnosisDateString = diagnosisDate.toISOString().split('T')[0];
    
    // Generate survival time based on stage and tumor type
    let baseSurvivalMonths = maxSurvivalMonths;
    
    // Adjust survival based on stage
    switch (selectedStage) {
      case "I":
        baseSurvivalMonths = Math.floor(Math.random() * 48) + 24; // 24-72 months
        break;
      case "II":
        baseSurvivalMonths = Math.floor(Math.random() * 36) + 18; // 18-54 months
        break;
      case "III":
        baseSurvivalMonths = Math.floor(Math.random() * 24) + 12; // 12-36 months
        break;
      case "IV":
        baseSurvivalMonths = Math.floor(Math.random() * 18) + 6; // 6-24 months
        break;
    }
    
    // Adjust survival based on tumor type (some are more aggressive)
    if (tumorType.includes("Pankreaskarzinom")) {
      baseSurvivalMonths = Math.floor(baseSurvivalMonths * 0.5);
    } else if (tumorType.includes("Prostatakarzinom")) {
      baseSurvivalMonths = Math.floor(baseSurvivalMonths * 1.5);
    } else if (tumorType.includes("Mammakarzinom")) {
      baseSurvivalMonths = Math.floor(baseSurvivalMonths * 1.2);
    }
    
    // Ensure minimum survival time
    const survivalTime = Math.max(1, baseSurvivalMonths);
    
    // Determine if event occurred (death)
    let event = Math.random() < eventRate;
    
    // Adjust event probability based on stage
    const stageEventProbs = { "I": 0.2, "II": 0.3, "III": 0.5, "IV": 0.7 };
    event = Math.random() < (stageEventProbs[selectedStage as keyof typeof stageEventProbs] || 0.4);
    
    // Generate follow-up date
    const followupDate = new Date(diagnosisDate);
    followupDate.setMonth(followupDate.getMonth() + survivalTime);
    
    // Generate therapy information
    const surgery = Math.random() > 0.3; // 70% have surgery
    const chemotherapy = Math.random() > 0.4; // 60% have chemotherapy
    const radiotherapy = Math.random() > 0.5; // 50% have radiotherapy
    const immunotherapy = Math.random() > 0.8; // 20% have immunotherapy

    // Generate primary case (90% are primary cases)
    const isPrimaryCase = Math.random() > 0.1;

    // Generate TNM components
    const tnmData = generateTNM(selectedStage);

    // Categorize tumor
    const tumorClassification = categorizeTumor(tumorType);
    const spreadClassification = categorizeSpread({
      tCategory: tnmData.tCategory,
      nCategory: tnmData.nCategory,
      mCategory: tnmData.mCategory
    });

    const patient: Patient = {
      id: `MOCK_${i.toString().padStart(3, '0')}`,
      gender,
      age,
      tumorType,
      tumorCategory: tumorClassification.subCategory,
      tumorLocation,
      diagnosisDate: diagnosisDateString,
      survivalTime,
      event,
      followupDate,
      followupDateString: followupDate ? followupDate.toISOString() : null,
      vitalStatus: event, // boolean instead of string
      grading,
      isPrimaryCase,
      // Tumor classification
      tumorMainCategory: tumorClassification.mainCategory,
      tumorSubCategory: tumorClassification.subCategory,
      isHematological: tumorClassification.isHematological,
      isSolid: tumorClassification.isSolid,
      spreadCategory: "Lokal begrenzt" as SpreadCategory,
      staging: {
        tnm: {
          cT: tnmData.tClinical,
          cN: tnmData.nCategory,
          cM: tnmData.mCategory,
          pT: tnmData.tPathological,
          pN: tnmData.nCategory,
          pM: tnmData.mCategory
        },
        uicc: selectedStage,
        tCategory: tnmData.tCategory,
        tPathological: tnmData.tPathological,
        tClinical: tnmData.tClinical,
        tOneDigit: tnmData.tOneDigit,
        tTwoDigit: tnmData.tTwoDigit,
        nCategory: tnmData.nCategory,
        mCategory: tnmData.mCategory
      },
      therapy: {
        surgery,
        chemotherapy,
        radiotherapy,
        immunotherapy
      },
      // Custom fields for new parser
      cT: tnmData.tClinical,
      cN: tnmData.nCategory,
      cM: tnmData.mCategory,
      pT: tnmData.tPathological,
      pN: tnmData.nCategory,
      pM: tnmData.mCategory,
      primaerfall: isPrimaryCase ? "ja" : "nein",
      lokalisation: tumorLocation,
      tumorid: i,
      startdatum: diagnosisDateString,
      endedatum: followupDate.toISOString().split('T')[0],
      TNM_T: tnmData.tCategory,
      TNM_N: tnmData.nCategory,
      TNM_M: tnmData.mCategory,
      
      // DFS-spezifische Felder (Default: null für reguläre Mock-Daten)
      therapieBeginn: null,
      rezidivDatum: null,
      metastasenDatum: null,
      todDatum: null,
      nachsorgeDatum: null,
      zweitterTumorDatum: null,
      gesamtbeurteilungErkrankung: null,
      
      // DFS Inclusion Criteria (Default: nicht erfüllt für reguläre Daten)
      verlauf_Lokaler_Tumorstatus: null,
      verlauf_Regionaerer_Lymphknotenstatus: null,
      verlauf_Fernmetastasen: null,
      residualstatus: null,
      dfsEligible: false
    };

    patients.push(patient);
  }

  return patients;
}

/**
 * Generiert Testdaten für Larynx-Karzinome mit verschiedenen TNM-Kombinationen und Stadien
 */
export function generateLarynxTestPatients(): Patient[] {
  const baseDate = "2020-02-01";
  // Stadium 0
  const p0 = {
    id: "LARYNX_0",
    gender: "male",
    age: 60,
    tumorType: "Larynxkarzinom",
    tumorCategory: "Larynx",
    tumorLocation: "Larynx",
    diagnosisDate: baseDate,
    survivalTime: 36,
    event: false,
    followupDate: new Date("2023-02-01"),
    followupDateString: "2023-02-01",
    vitalStatus: false,
    grading: "G1",
    tumorMainCategory: "Solide Tumore" as TumorMainCategory,
    tumorSubCategory: "Larynx",
    isHematological: false,
    isSolid: true,
    spreadCategory: "Lokal begrenzt" as SpreadCategory,
    staging: { 
      tnm: { cT: "Tis", cN: "N0", cM: "M0", pT: null, pN: null, pM: null },
      tCategory: "Tis", 
      nCategory: "N0", 
      mCategory: "M0" 
    },
    therapy: { surgery: true, chemotherapy: false, radiotherapy: false, immunotherapy: false },
    cT: "Tis",
    cN: "N0",
    cM: "M0",
    pT: null,
    pN: null,
    pM: null,
    primaerfall: "ja",
    lokalisation: "Larynx",
    tumorid: 1,
    startdatum: baseDate,
    endedatum: "2023-02-01",
    TNM_T: "Tis",
    TNM_N: "N0",
    TNM_M: "M0",
    // DFS-spezifische Felder (Default: null für reguläre Mock-Daten)
    therapieBeginn: null,
    rezidivDatum: null,
    metastasenDatum: null,
    todDatum: null,
    nachsorgeDatum: null,
    zweitterTumorDatum: null,
    gesamtbeurteilungErkrankung: null,
    // DFS Inclusion Criteria (Default: nicht erfüllt)
    verlauf_Lokaler_Tumorstatus: null,
    verlauf_Regionaerer_Lymphknotenstatus: null,
    verlauf_Fernmetastasen: null,
    residualstatus: null,
    dfsEligible: false
  };
  // Stadium I
  const p1 = { ...p0, id: "LARYNX_1", staging: { ...p0.staging, tnm: { cT: "T1", cN: "N0", cM: "M0", pT: null, pN: null, pM: null }, tCategory: "T1" }, survivalTime: 48, followupDate: new Date("2024-02-01"), followupDateString: "2024-02-01", cT: "T1", TNM_T: "T1" };
  // Stadium II
  const p2 = { ...p0, id: "LARYNX_2", staging: { ...p0.staging, tnm: { cT: "T2", cN: "N0", cM: "M0", pT: null, pN: null, pM: null }, tCategory: "T2" }, survivalTime: 36, followupDate: new Date("2023-02-01"), followupDateString: "2023-02-01", cT: "T2", TNM_T: "T2" };
  // Stadium III
  const p3 = { ...p0, id: "LARYNX_3", staging: { ...p0.staging, tnm: { cT: "T3", cN: "N0", cM: "M0", pT: null, pN: null, pM: null }, tCategory: "T3" }, survivalTime: 24, event: true, followupDate: new Date("2022-02-01"), followupDateString: "2022-02-01", vitalStatus: true, cT: "T3", TNM_T: "T3" };
  const p3b = { ...p0, id: "LARYNX_3B", staging: { ...p0.staging, tnm: { cT: "T1", cN: "N1", cM: "M0", pT: null, pN: null, pM: null }, tCategory: "T1", nCategory: "N1" }, survivalTime: 20, event: true, followupDate: new Date("2021-10-01"), followupDateString: "2021-10-01", vitalStatus: true, cT: "T1", cN: "N1", TNM_T: "T1", TNM_N: "N1" };
  // Stadium IVA
  const p4a = { ...p0, id: "LARYNX_4A", staging: { ...p0.staging, tnm: { cT: "T4a", cN: "N0", cM: "M0", pT: null, pN: null, pM: null }, tCategory: "T4a" }, survivalTime: 12, event: true, followupDate: new Date("2021-02-01"), followupDateString: "2021-02-01", vitalStatus: true, cT: "T4a", TNM_T: "T4a" };
  const p4a2 = { ...p0, id: "LARYNX_4A2", staging: { ...p0.staging, tnm: { cT: "T2", cN: "N2", cM: "M0", pT: null, pN: null, pM: null }, tCategory: "T2", nCategory: "N2" }, survivalTime: 10, event: true, followupDate: new Date("2020-12-01"), followupDateString: "2020-12-01", vitalStatus: true, cT: "T2", cN: "N2", TNM_T: "T2", TNM_N: "N2" };
  // Stadium IVB
  const p4b = { ...p0, id: "LARYNX_4B", staging: { ...p0.staging, tnm: { cT: "T4b", cN: "N2", cM: "M0", pT: null, pN: null, pM: null }, tCategory: "T4b", nCategory: "N2" }, survivalTime: 6, event: true, followupDate: new Date("2020-08-01"), followupDateString: "2020-08-01", vitalStatus: true, cT: "T4b", cN: "N2", TNM_T: "T4b", TNM_N: "N2" };
  // Stadium IVC
  const p4c = { ...p0, id: "LARYNX_4C", staging: { ...p0.staging, tnm: { cT: "T2", cN: "N2", cM: "M1", pT: null, pN: null, pM: null }, tCategory: "T2", nCategory: "N2", mCategory: "M1" }, survivalTime: 3, event: true, followupDate: new Date("2020-05-01"), followupDateString: "2020-05-01", vitalStatus: true, cT: "T2", cN: "N2", cM: "M1", TNM_T: "T2", TNM_N: "N2", TNM_M: "M1" };
  return [p0, p1, p2, p3, p3b, p4a, p4a2, p4b, p4c];
}

/**
 * Generiert Testdaten für Mammakarzinom mit diversen TNM-Kombinationen und Methoden
 */
export function generateMammaTestPatients(): Patient[] {
  const entitaet = "Mamma (incl. DCIS)";
  const icd = "C50.9 - Mammakarzinom";
  const alter = [35, 42, 50, 58, 65, 72, 80];
  const gradings = ["G1", "G2", "G3"];
  const genders = ["female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female", "female"];
  const tnmCombos = [
    // Stadium 0
    { t: "pTis", n: "pN0", m: "M0", method: "pathologisch", stage: "0" },
    // Stadium I
    { t: "cT1", n: "cN0", m: "M0", method: "klinisch", stage: "I" },
    { t: "pT1", n: "pN0", m: "M0", method: "pathologisch", stage: "I" },
    // Stadium II
    { t: "cT2", n: "cN0", m: "M0", method: "klinisch", stage: "IIA" },
    { t: "pT2", n: "pN1", m: "M0", method: "pathologisch", stage: "IIA" },
    { t: "cT2", n: "cN1", m: "M0", method: "klinisch", stage: "IIB" },
    { t: "pT3", n: "pN0", m: "M0", method: "pathologisch", stage: "IIB" },
    // Stadium III
    { t: "cT3", n: "cN2", m: "M0", method: "klinisch", stage: "IIIA" },
    { t: "pT4", n: "pN2", m: "M0", method: "pathologisch", stage: "IIIB" },
    { t: "cT4", n: "cN3", m: "M0", method: "klinisch", stage: "IIIC" },
    // Stadium IV
    { t: "cT1", n: "cN0", m: "M1", method: "klinisch", stage: "IV" },
    { t: "pT2", n: "pN1", m: "M1", method: "pathologisch", stage: "IV" },
  ];
  const patients: Patient[] = [];
  let id = 1;
  // Für Diversität: jede TNM-Kombi mehrfach, mit Variationen bei Alter, Grading, Followup, Event
  for (const combo of tnmCombos) {
    for (let i = 0; i < 10; i++) {
      const age = alter[(i + id) % alter.length];
      const grading = gradings[(i + id) % gradings.length];
      const gender = genders[(i + id) % genders.length];
      const diagnosisDate = new Date(2015 + (i % 8), (i * 3) % 12, 1 + (i * 2) % 28);
      const diagnosisDateString = diagnosisDate.toISOString().split('T')[0];
      const survivalTime = 12 + Math.floor(Math.random() * 72); // 1-7 Jahre
      const event = Math.random() < 0.4;
      const followupDate = new Date(diagnosisDate);
      followupDate.setMonth(followupDate.getMonth() + survivalTime);
      
      // Determine if clinical or pathological
      const isPathological = combo.t.startsWith("p");
      const cT = isPathological ? null : combo.t;
      const cN = isPathological ? null : combo.n;
      const cM = isPathological ? null : combo.m;
      const pT = isPathological ? combo.t : null;
      const pN = isPathological ? combo.n : null;
      const pM = isPathological ? combo.m : null;
      
      patients.push({
        id: `MAMMA_${id.toString().padStart(3, "0")}`,
        gender,
        age,
        tumorType: icd,
        tumorCategory: entitaet,
        tumorLocation: "Brust",
        diagnosisDate: diagnosisDateString,
        survivalTime,
        event,
        followupDate,
        vitalStatus: event,
        grading,
        isPrimaryCase: true,
        tumorMainCategory: "Solide Tumore",
        tumorSubCategory: entitaet,
        isHematological: false,
        isSolid: true,
        spreadCategory: "Lokal begrenzt",
        staging: {
          tnm: {
            cT,
            cN,
            cM,
            pT,
            pN,
            pM
          },
          uicc: combo.stage,
          tCategory: combo.t,
          tPathological: pT,
          tClinical: cT,
          tOneDigit: combo.t.replace(/^[pc]/, "").substring(0,2),
          tTwoDigit: combo.t.replace(/^[pc]/, ""),
          nCategory: combo.n,
          mCategory: combo.m
        },
        therapy: {
          surgery: Math.random() > 0.2,
          chemotherapy: Math.random() > 0.3,
          radiotherapy: Math.random() > 0.4,
          immunotherapy: Math.random() > 0.7
        },
        cT,
        cN,
        cM,
        pT,
        pN,
        pM,
        primaerfall: "ja",
        lokalisation: "Brust",
        tumorid: id,
        startdatum: diagnosisDateString,
        endedatum: followupDate.toISOString().split('T')[0],
        TNM_T: combo.t,
        TNM_N: combo.n,
        TNM_M: combo.m,
        
        // DFS-spezifische Felder (Default: null für reguläre Mock-Daten)
        therapieBeginn: null,
        rezidivDatum: null,
        metastasenDatum: null,
        todDatum: null,
        nachsorgeDatum: null,
        zweitterTumorDatum: null,
        gesamtbeurteilungErkrankung: null,
        
        // DFS Inclusion Criteria (Default: nicht erfüllt)
        verlauf_Lokaler_Tumorstatus: null,
        verlauf_Regionaerer_Lymphknotenstatus: null,
        verlauf_Fernmetastasen: null,
        residualstatus: null,
        dfsEligible: false
      });
      id++;
    }
  }
  return patients;
}

/**
 * Generiert Testdaten für Brustkrebs (Mammakarzinom) - begrenzt auf eine Zielanzahl
 */
export function generateBreastCancerTestPatients(targetCount = 100): Patient[] {
  const all = generateMammaTestPatients();
  return all.slice(0, Math.max(1, targetCount));
}

/**
 * Generiert Testdaten für Lungenkrebs (Bronchialkarzinom)
 */
export function generateLungCancerTestPatients(count = 100): Patient[] {
  const base = generateMockPatients({ patientCount: count });
  return base.map((p, idx) => ({
    ...p,
    id: `LUNG_${(idx + 1).toString().padStart(3, '0')}`,
    tumorType: "C34 - Bronchialkarzinom",
    tumorLocation: "Lunge",
  }));
}

/**
 * Generiert Testdaten für Pankreaskarzinom
 */
export function generatePancreaticCancerTestPatients(count = 80): Patient[] {
  const base = generateMockPatients({ patientCount: count });
  return base.map((p, idx) => ({
    ...p,
    id: `PANCREAS_${(idx + 1).toString().padStart(3, '0')}`,
    tumorType: "C25.9 - Pankreaskarzinom",
    tumorLocation: "Pankreas",
  }));
}

/**
 * Generiert einen umfassenden Testdatensatz für alle App-Funktionen
 * Kompatibel mit obds-parser-new.ts und allen neuen Feldern
 */
export function generateComprehensiveTestDataset(count: number = 1350): Patient[] {
  const patients: Patient[] = [];
  let id = 1;

  // Verschiedene Tumorarten für Diversität
  const tumorTypes = [
    { type: "C50.9 - Mammakarzinom", location: "Brust", entity: "Mamma (incl. DCIS)" },
    { type: "C34.9 - Bronchialkarzinom", location: "Lunge", entity: "Bronchialkarzinom" },
    { type: "C25.9 - Pankreaskarzinom", location: "Pankreas", entity: "Pankreaskarzinom" },
    { type: "C18.9 - Kolonkarzinom", location: "Kolon", entity: "Kolonkarzinom" },
    { type: "C61 - Prostatakarzinom", location: "Prostata", entity: "Prostatakarzinom" },
    { type: "C56 - Ovarialkarzinom", location: "Ovar", entity: "Ovarialkarzinom" },
    { type: "C32.9 - Larynxkarzinom", location: "Larynx", entity: "Larynxkarzinom" },
    { type: "C43.9 - Malignes Melanom", location: "Haut", entity: "Malignes Melanom" },
    { type: "C67.9 - Harnblasenkarzinom", location: "Harnblase", entity: "Harnblasenkarzinom" },
    { type: "C22.0 - Hepatozelluläres Karzinom", location: "Leber", entity: "Hepatozelluläres Karzinom" }
  ];

  // Verschiedene TNM-Kombinationen für realistische Staging-Verteilung
  const tnmCombinations = [
    // Stadium 0
    { t: "pTis", n: "pN0", m: "M0", stage: "0", survival: [24, 60], eventRate: 0.05 },
    // Stadium I
    { t: "pT1", n: "pN0", m: "M0", stage: "I", survival: [36, 84], eventRate: 0.15 },
    { t: "pT2", n: "pN0", m: "M0", stage: "I", survival: [30, 72], eventRate: 0.20 },
    // Stadium II
    { t: "pT2", n: "pN1", m: "M0", stage: "II", survival: [24, 60], eventRate: 0.30 },
    { t: "pT3", n: "pN0", m: "M0", stage: "II", survival: [20, 48], eventRate: 0.35 },
    // Stadium III
    { t: "pT3", n: "pN2", m: "M0", stage: "III", survival: [12, 36], eventRate: 0.50 },
    { t: "pT4", n: "pN1", m: "M0", stage: "III", survival: [10, 30], eventRate: 0.55 },
    // Stadium IV
    { t: "pT2", n: "pN1", m: "M1", stage: "IV", survival: [6, 18], eventRate: 0.75 },
    { t: "pT4", n: "pN2", m: "M1", stage: "IV", survival: [4, 12], eventRate: 0.80 }
  ];

  // Verschiedene Altersgruppen
  const ages = [35, 42, 48, 55, 62, 68, 75, 82, 89];
  const gradings = ["G1", "G2", "G3", "G4"];
  const genders = ["male", "female"];

  // Für jede Tumorart und TNM-Kombination mehrere Patienten generieren, so
  // verteilt, dass die Summe exakt `count` ergibt (Basis + Rest auf die
  // ersten Kombinationen), statt pro Kombination zufällig 15-25 zu würfeln
  // und die Gesamtzahl dem Zufall zu überlassen.
  const totalCombinations = tumorTypes.length * tnmCombinations.length;
  const basePerCombination = Math.floor(count / totalCombinations);
  const remainder = count % totalCombinations;
  let combinationIndex = 0;

  for (const tumorType of tumorTypes) {
    for (const tnm of tnmCombinations) {
      const patientsPerCombination = basePerCombination + (combinationIndex < remainder ? 1 : 0);
      combinationIndex++;

      for (let i = 0; i < patientsPerCombination; i++) {
        const age = ages[Math.floor(Math.random() * ages.length)];
        const gender = genders[Math.floor(Math.random() * genders.length)];
        const grading = gradings[Math.floor(Math.random() * gradings.length)];
        
        // Realistische Diagnosedaten (2018-2023)
        const diagnosisYear = 2018 + Math.floor(Math.random() * 6);
        const diagnosisMonth = Math.floor(Math.random() * 12);
        const diagnosisDay = 1 + Math.floor(Math.random() * 28);
        const diagnosisDate = new Date(diagnosisYear, diagnosisMonth, diagnosisDay);
        const diagnosisDateString = diagnosisDate.toISOString().split('T')[0];
        
        // Überlebenszeit basierend auf Stadium
        const minSurvival = tnm.survival[0];
        const maxSurvival = tnm.survival[1];
        const survivalTime = minSurvival + Math.floor(Math.random() * (maxSurvival - minSurvival));
        
        // Event basierend auf Stadium und Zufall
        const event = Math.random() < tnm.eventRate;
        
        // Follow-up Datum
        const followupDate = new Date(diagnosisDate);
        followupDate.setMonth(followupDate.getMonth() + survivalTime);
        const followupDateString = followupDate.toISOString().split('T')[0];
        
        // Primärfall (90% sind Primärfälle)
        const isPrimaryCase = Math.random() > 0.1;
        
        // Therapie basierend auf Tumorart und Stadium
        const surgery = Math.random() > 0.2; // 80% Operation
        const chemotherapy = Math.random() > 0.3; // 70% Chemotherapie
        const radiotherapy = Math.random() > 0.4; // 60% Strahlentherapie
        const immunotherapy = Math.random() > 0.7; // 30% Immuntherapie
        
        // TNM-Details
        const isPathological = tnm.t.startsWith("p");
        const cT = isPathological ? null : tnm.t.replace("p", "c");
        const cN = isPathological ? null : tnm.n.replace("p", "c");
        const cM = isPathological ? null : tnm.m;
        const pT = isPathological ? tnm.t : null;
        const pN = isPathological ? tnm.n : null;
        const pM = isPathological ? tnm.m : null;
        
        // Tumor-Klassifikation
        const tumorClassification = categorizeTumor(tumorType.type);
        const spreadClassification = categorizeSpread({
          tCategory: tnm.t,
          nCategory: tnm.n,
          mCategory: tnm.m
        });
        
        const patient: Patient = {
          id: `COMP_${id.toString().padStart(4, '0')}`,
          gender,
          age,
          tumorType: tumorType.type,
          tumorCategory: tumorType.entity,
          tumorLocation: tumorType.location,
          diagnosisDate: diagnosisDateString,
          survivalTime,
          event,
          followupDate,
          followupDateString,
          vitalStatus: event,
          grading,
          isPrimaryCase,
          tumorMainCategory: tumorClassification.mainCategory,
          tumorSubCategory: tumorClassification.subCategory,
          isHematological: tumorClassification.isHematological,
          isSolid: tumorClassification.isSolid,
          spreadCategory: spreadClassification,
          staging: {
            tnm: {
              cT,
              cN,
              cM,
              pT,
              pN,
              pM
            },
            uicc: tnm.stage,
            tCategory: tnm.t,
            tPathological: pT,
            tClinical: cT,
            tOneDigit: tnm.t.replace(/^[pc]/, "").substring(0, 2),
            tTwoDigit: tnm.t.replace(/^[pc]/, ""),
            nCategory: tnm.n,
            mCategory: tnm.m
          },
          therapy: {
            surgery,
            chemotherapy,
            radiotherapy,
            immunotherapy
          },
          // Custom fields für neuen Parser
          cT,
          cN,
          cM,
          pT,
          pN,
          pM,
          primaerfall: isPrimaryCase ? "1" : "0",
          lokalisation: tumorType.location,
          tumorid: id,
          startdatum: diagnosisDateString,
          endedatum: followupDateString,
          TNM_T: tnm.t,
          TNM_N: tnm.n,
          TNM_M: tnm.m,
          
          // DFS-spezifische Felder (Default: null für reguläre Mock-Daten)
          therapieBeginn: null,
          rezidivDatum: null,
          metastasenDatum: null,
          todDatum: null,
          nachsorgeDatum: null,
          zweitterTumorDatum: null,
          gesamtbeurteilungErkrankung: null,
          
          // DFS Inclusion Criteria (Default: nicht erfüllt)
          verlauf_Lokaler_Tumorstatus: null,
          verlauf_Regionaerer_Lymphknotenstatus: null,
          verlauf_Fernmetastasen: null,
          residualstatus: null,
          dfsEligible: false
        };
        
        patients.push(patient);
        id++;
      }
    }
  }
  
  return patients;
}

// (duplicate Larynx generator removed — keep the primary implementation above)

/**
 * Generate realistic TNM staging
 */
function generateTNM(uiccStage: string): { tnm: string; tCategory: string; nCategory: string; mCategory: string; tPathological: string | null; tClinical: string | null; tOneDigit: string; tTwoDigit: string; } {
  const tValues = ["T1", "T1a", "T1b", "T2", "T2a", "T2b", "T3", "T3a", "T3b", "T4", "T4a", "T4b"];
  const nValues = ["N0", "N1", "N1a", "N1b", "N2", "N2a", "N2b", "N3"];
  const mValues = ["M0", "M1", "M1a", "M1b"];

  let t = "T1", n = "N0", m = "M0";

  switch (uiccStage) {
    case "I":
      t = Math.random() > 0.5 ? "T1" : "T2";
      n = "N0";
      m = "M0";
      break;
    case "II":
      t = Math.random() > 0.3 ? "T2" : "T3";
      n = Math.random() > 0.7 ? "N0" : "N1";
      m = "M0";
      break;
    case "III":
      t = Math.random() > 0.3 ? "T3" : "T4";
      n = Math.random() > 0.5 ? "N1" : "N2";
      m = "M0";
      break;
    case "IV":
      t = tValues[Math.floor(Math.random() * tValues.length)];
      n = nValues[Math.floor(Math.random() * nValues.length)];
      m = "M1";
      break;
  }

  // Decide if pathological or clinical
  const isPathological = Math.random() > 0.3; // 70% pathological
  const prefix = isPathological ? "p" : "c";
  
  const tPathological = isPathological ? `p${t}` : null;
  const tClinical = !isPathological ? `c${t}` : null;
  
  // Parse T into 1-digit and 2-digit
  const tMatch = t.match(/^T([0-4])([abc]?)$/);
  const tOneDigit = tMatch ? `T${tMatch[1]}` : t;
  const tTwoDigit = t;

  return {
    tnm: `${prefix}${t}${n}${m}`,
    tCategory: `${prefix}${t}`,
    nCategory: n,
    mCategory: m,
    tPathological,
    tClinical,
    tOneDigit,
    tTwoDigit
  };
}

/**
 * Generate mock oBDS XML content compatible with obds-parser-new.ts
 */
export function generateMockXML(patients: Patient[]): string {
  const xmlPatients = patients.map(patient => `
    <Patient>
      <Patient_ID>${patient.id}</Patient_ID>
      <Geschlecht>${patient.gender}</Geschlecht>
      <Alter>${patient.age}</Alter>
      <Tumortyp>${patient.tumorType}</Tumortyp>
      <Tumorlokalisation>${patient.tumorLocation}</Tumorlokalisation>
      <Diagnosedatum>${patient.diagnosisDate}</Diagnosedatum>
      <UeberlebensZeit>${patient.survivalTime}</UeberlebensZeit>
      <Vitalstatus>${patient.vitalStatus ? 'verstorben' : 'lebend'}</Vitalstatus>
      <Grading>${patient.grading}</Grading>
      <TNM>${patient.staging?.tCategory}${patient.staging?.nCategory}${patient.staging?.mCategory}</TNM>
      <UICC>${patient.staging?.uicc}</UICC>
      <Primaerfall>${patient.primaerfall}</Primaerfall>
      ${patient.pT ? `<pT>${patient.pT}</pT>` : ''}
      ${patient.cT ? `<cT>${patient.cT}</cT>` : ''}
      <T_Kategorie>${patient.staging?.tCategory?.replace(/^[pc]/, '') || ''}</T_Kategorie>
      <N_Kategorie>${patient.staging?.nCategory || ''}</N_Kategorie>
      <M_Kategorie>${patient.staging?.mCategory || ''}</M_Kategorie>
      <Operation>${patient.therapy?.surgery ? 'ja' : 'nein'}</Operation>
      <Chemotherapie>${patient.therapy?.chemotherapy ? 'ja' : 'nein'}</Chemotherapie>
      <Radiotherapie>${patient.therapy?.radiotherapy ? 'ja' : 'nein'}</Radiotherapie>
      <Immuntherapie>${patient.therapy?.immunotherapy ? 'ja' : 'nein'}</Immuntherapie>
      ${patient.followupDateString ? `<Nachbeobachtung>${patient.followupDateString}</Nachbeobachtung>` : ''}
    </Patient>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<oBDS_v3_4_0>
  <Metadaten>
    <Ersteller>Mock Data Generator</Ersteller>
    <ErstellungsDatum>${new Date().toISOString().split('T')[0]}</ErstellungsDatum>
    <Version>3.4.0</Version>
    <Beschreibung>Mock-Daten für Kaplan-Meier Analyse</Beschreibung>
  </Metadaten>
  <Patientendaten>
    ${xmlPatients}
  </Patientendaten>
</oBDS_v3_4_0>`;
}

/**
 * Generate complete sample XML with all 1350 patients
 */
export function generateCompleteSampleXML(): string {
  const patients = generateComprehensiveTestDataset();
  return generateMockXML(patients);
}

/**
 * Generiert Testdaten speziell für Disease Free Survival (DFS) Tests
 * Mit realistischen Rezidiv-, Metastasen- und Therapiebeginn-Daten
 */
export function generateDiseaseFreeeSurvivalTestPatients(count: number = 100): Patient[] {
  const patients: Patient[] = [];
  
  const tumorTypes = [
    { type: "C50.9 - Mammakarzinom", location: "Brust", entity: "Mamma" },
    { type: "C34.9 - Bronchialkarzinom", location: "Lunge", entity: "Bronchialkarzinom" },
    { type: "C18.9 - Kolonkarzinom", location: "Kolon", entity: "Kolonkarzinom" }
  ];

  const gradings = ["G1", "G2", "G3"];
  const genders = ["male", "female"];
  const stages = ["I", "II", "III", "IV"];

  for (let i = 1; i <= count; i++) {
    const tumorType = tumorTypes[i % tumorTypes.length];
    const grading = gradings[i % gradings.length];
    const gender = genders[i % 2];
    const stage = stages[Math.floor((i / 25) % stages.length)];
    const age = 45 + (i % 40);

    // Diagnosedatum: 3-5 Jahre zurück
    const diagnosisDate = new Date();
    diagnosisDate.setFullYear(diagnosisDate.getFullYear() - (3 + Math.floor(Math.random() * 3)));
    diagnosisDate.setMonth(Math.floor(Math.random() * 12));
    diagnosisDate.setDate(1 + Math.floor(Math.random() * 28));
    const diagnosisDateString = diagnosisDate.toISOString().split('T')[0];

    // Therapiebeginn: 1-4 Wochen nach Diagnose
    const therapieBeginn = new Date(diagnosisDate);
    therapieBeginn.setDate(therapieBeginn.getDate() + (7 + Math.floor(Math.random() * 28)));
    const therapieBeginString = therapieBeginn.toISOString().split('T')[0];

    // Nachsorgedatum: 1-4 Jahre nach Therapiebeginn
    const nachsorgeDate = new Date(therapieBeginn);
    nachsorgeDate.setMonth(nachsorgeDate.getMonth() + (12 + Math.floor(Math.random() * 36)));
    const nachsorgeDateString = nachsorgeDate.toISOString().split('T')[0];

    // Wiederauftreten basierend auf Stadium (höheres Stadium = höhere Rezidivrate)
    let hasRecurrence = false;
    let recurrenceType = "none";
    let rezidivDatum: string | null = null;
    let metastasenDatum: string | null = null;
    let todDatum: string | null = null;

    // Rezidivrate nach Stadium
    const recurrenceRates = { I: 0.15, II: 0.35, III: 0.55, IV: 0.75 };
    const recurrenceRate = recurrenceRates[stage as keyof typeof recurrenceRates] || 0.5;

    if (Math.random() < recurrenceRate) {
      hasRecurrence = true;
      
      // Zeitpunkt des Wiederauftretens (6-36 Monate nach Diagnose)
      const recurrenceMonths = 6 + Math.floor(Math.random() * 30);
      const recurrenceDate = new Date(diagnosisDate);
      recurrenceDate.setMonth(recurrenceDate.getMonth() + recurrenceMonths);
      const recurrenceDateString = recurrenceDate.toISOString().split('T')[0];

      // Art des Wiederauftretens (Rezidiv oder Metastasen)
      if (Math.random() < 0.6) {
        rezidivDatum = recurrenceDateString;
        recurrenceType = "rezidiv";
      } else {
        metastasenDatum = recurrenceDateString;
        recurrenceType = "metastasen";
      }

      // Todeseintritt: 6-24 Monate nach Wiederauftreten (falls nicht zensiert)
      if (Math.random() < 0.4) {
        const deathDate = new Date(recurrenceDate);
        deathDate.setMonth(deathDate.getMonth() + (6 + Math.floor(Math.random() * 18)));
        todDatum = deathDate.toISOString().split('T')[0];
      }
    }

    // Followup/Nachsorge: Ende der Beobachtung
    let followupDate = nachsorgeDate;
    let survivalTime = Math.round(
      (followupDate.getTime() - diagnosisDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
    );
    const event = Boolean(todDatum);
    const vitalStatus = !event;

    // TNM-Daten basierend auf Stadium
    const tnmData: Record<string, { t: string; n: string; m: string }> = {
      I: { t: "pT1", n: "pN0", m: "M0" },
      II: { t: "pT2", n: "pN1", m: "M0" },
      III: { t: "pT3", n: "pN2", m: "M0" },
      IV: { t: "pT2", n: "pN1", m: "M1" }
    };
    const tnm = tnmData[stage] || tnmData["III"];

    const patient: Patient = {
      id: `DFS_${i.toString().padStart(3, "0")}`,
      gender,
      age,
      tumorType: tumorType.type,
      tumorCategory: tumorType.entity,
      tumorLocation: tumorType.location,
      diagnosisDate: diagnosisDateString,
      survivalTime,
      event,
      followupDate,
      followupDateString: nachsorgeDateString,
      vitalStatus,
      grading,
      isPrimaryCase: true,
      tumorMainCategory: "Solide Tumore" as TumorMainCategory,
      tumorSubCategory: tumorType.entity,
      isHematological: false,
      isSolid: true,
      spreadCategory: stage === "IV" ? "Metastasiert" : stage === "III" ? "Fortgeschritten" : "Lokal begrenzt" as SpreadCategory,
      staging: {
        tnm: {
          cT: null,
          cN: null,
          cM: null,
          pT: tnm.t,
          pN: tnm.n,
          pM: tnm.m
        },
        uicc: stage,
        tCategory: tnm.t,
        tPathological: tnm.t,
        tClinical: null,
        tOneDigit: tnm.t.replace(/^p/, "").substring(0, 2),
        tTwoDigit: tnm.t.replace(/^p/, ""),
        nCategory: tnm.n,
        mCategory: tnm.m
      },
      therapy: {
        surgery: Math.random() > 0.2,
        chemotherapy: Math.random() > 0.25,
        radiotherapy: Math.random() > 0.4,
        immunotherapy: Math.random() > 0.6
      },
      cT: null,
      cN: null,
      cM: null,
      pT: tnm.t,
      pN: tnm.n,
      pM: tnm.m,
      primaerfall: "1",
      lokalisation: tumorType.location,
      tumorid: i,
      startdatum: diagnosisDateString,
      endedatum: (todDatum || nachsorgeDateString),
      TNM_T: tnm.t,
      TNM_N: tnm.n,
      TNM_M: tnm.m,
      
      // DFS-spezifische Felder
      therapieBeginn: therapieBeginString,
      rezidivDatum: rezidivDatum,
      metastasenDatum: metastasenDatum,
      todDatum: todDatum,
      nachsorgeDatum: nachsorgeDateString,
      zweitterTumorDatum: null,
      gesamtbeurteilungErkrankung: hasRecurrence ? "Progress" : "Remission",
      
      // DFS Inclusion Criteria (alle erfüllt für Test-Daten)
      // Alle haben Complete Response (CR) nach Therapie
      verlauf_Lokaler_Tumorstatus: "K", // kein Tumor nachweisbar
      verlauf_Regionaerer_Lymphknotenstatus: "K", // kein Tumor nachweisbar
      verlauf_Fernmetastasen: "K", // kein Fernmetastasen
      residualstatus: "R0", // kein Residualtumor
      dfsEligible: true // alle Test-Patienten erfüllen Kriterien
    };

    patients.push(patient);
  }

  return patients;
}

/**
 * Create different mock data scenarios
 */
export const mockDataScenarios = {
  small: () => generateMockPatients({ patientCount: 50 }),
  medium: () => generateMockPatients({ patientCount: 150 }),
  large: () => generateMockPatients({ patientCount: 300 }),
  comprehensive: () => generateComprehensiveTestDataset(1350),
  larynx: generateLarynxTestPatients,
  mamma: generateMammaTestPatients,
  breastCancer: () => generateBreastCancerTestPatients(100),
  lungCancer: () => generateLungCancerTestPatients(100),
  pancreaticCancer: () => generatePancreaticCancerTestPatients(80),
  diseaseFreeSurvival: () => generateDiseaseFreeeSurvivalTestPatients(120),
}; 