/**
 * Web Worker for Mock Data Generation
 * Offloads heavy patient data generation to background thread
 */

import { Patient } from "./obds-parser-new";
import { categorizeTumor, categorizeSpread } from "./tumor-classification";
import { type TumorMainCategory, type SpreadCategory } from "./tumor-classification";

interface MockDataOptions {
  patientCount?: number;
  maxSurvivalMonths?: number;
  eventRate?: number;
}

interface GenerationMessage {
  type: "generate";
  scenario: string;
  options?: MockDataOptions;
}

interface ProgressMessage {
  type: "progress";
  current: number;
  total: number;
  percentage: number;
}

interface CompleteMessage {
  type: "complete";
  patients: Patient[];
}

interface ErrorMessage {
  type: "error";
  error: string;
}

type WorkerMessage = GenerationMessage;
type WorkerResponse = ProgressMessage | CompleteMessage | ErrorMessage;

// Tumor types
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
  "Speiseröhre"
];

/**
 * Generate mock patient data (simplified version for worker)
 */
function generateMockPatients(options: MockDataOptions = {}): Patient[] {
  const {
    patientCount = 150,
    maxSurvivalMonths = 60,
    eventRate = 0.4
  } = options;

  const patients: Patient[] = [];
  
  for (let i = 0; i < patientCount; i++) {
    // Send progress update every 50 patients
    if (i % 50 === 0 && i > 0) {
      self.postMessage({
        type: "progress",
        current: i,
        total: patientCount,
        percentage: Math.round((i / patientCount) * 100)
      } as ProgressMessage);
    }

    const gender = Math.random() > 0.5 ? "male" : "female";
    const age = Math.floor(Math.random() * 40) + 40; // 40-80 years
    const tumorType = tumorTypes[Math.floor(Math.random() * tumorTypes.length)];
    const tumorLocation = tumorLocations[Math.floor(Math.random() * tumorLocations.length)];
    
    const diagnosisDate = new Date();
    diagnosisDate.setFullYear(diagnosisDate.getFullYear() - Math.floor(Math.random() * 5));
    const diagnosisDateString = diagnosisDate.toISOString().split('T')[0];
    
    const hasEvent = Math.random() < eventRate;
    const survivalMonths = Math.floor(Math.random() * maxSurvivalMonths);
    const survivalTime = Math.floor(survivalMonths / 12);
    
    const followupDate = new Date(diagnosisDate);
    followupDate.setMonth(followupDate.getMonth() + survivalMonths);
    
    const isPrimaryCase = Math.random() > 0.2;
    const grading = ["G1", "G2", "G3", "G4"][Math.floor(Math.random() * 4)];
    
    const selectedStage = ["IA", "IB", "IIA", "IIB", "IIIA", "IIIB", "IV"][Math.floor(Math.random() * 7)];
    
    // Simplified TNM generation
    const tCategory = ["T0", "T1", "T2", "T3", "T4"][Math.floor(Math.random() * 5)];
    const nCategory = ["N0", "N1", "N2", "N3"][Math.floor(Math.random() * 4)];
    const mCategory = Math.random() > 0.9 ? "M1" : "M0";
    
    const tumorClassification = categorizeTumor(tumorType);
    
    const patient: Patient = {
      id: `MOCK_${i.toString().padStart(3, '0')}`,
      gender,
      age,
      tumorType,
      tumorCategory: tumorClassification.subCategory,
      tumorLocation,
      diagnosisDate: diagnosisDateString,
      survivalTime,
      event: hasEvent,
      followupDate,
      followupDateString: followupDate ? followupDate.toISOString() : null,
      vitalStatus: hasEvent,
      grading,
      isPrimaryCase,
      tumorMainCategory: tumorClassification.mainCategory,
      tumorSubCategory: tumorClassification.subCategory,
      isHematological: tumorClassification.isHematological,
      isSolid: tumorClassification.isSolid,
      spreadCategory: "Lokal begrenzt" as SpreadCategory,
      staging: {
        tnm: {
          cT: tCategory,
          cN: nCategory,
          cM: mCategory,
          pT: tCategory,
          pN: nCategory,
          pM: mCategory
        },
        uicc: selectedStage,
        tCategory: tCategory,
        tPathological: tCategory,
        tClinical: tCategory,
        tOneDigit: tCategory.substring(1, 2),
        tTwoDigit: "99",
        nCategory: nCategory,
        mCategory: mCategory
      },
      therapy: {
        surgery: Math.random() > 0.3,
        chemotherapy: Math.random() > 0.4,
        radiotherapy: Math.random() > 0.5,
        immunotherapy: Math.random() > 0.7
      },
      cT: tCategory,
      cN: nCategory,
      cM: mCategory,
      pT: tCategory,
      pN: nCategory,
      pM: mCategory,
      primaerfall: isPrimaryCase ? "ja" : "nein",
      lokalisation: tumorLocation,
      tumorid: i,
      startdatum: diagnosisDateString,
      endedatum: followupDate.toISOString().split('T')[0],
      TNM_T: tCategory,
      TNM_N: nCategory,
      TNM_M: mCategory,
      therapieBeginn: null,
      rezidivDatum: null,
      metastasenDatum: null,
      todDatum: null,
      nachsorgeDatum: null,
      zweitterTumorDatum: null,
      gesamtbeurteilungErkrankung: hasEvent ? "Progress" : "Remission",
      dfsEligible: false
    };

    patients.push(patient);
  }

  return patients;
}

/**
 * Generate comprehensive test dataset (1350 patients)
 */
function generateComprehensiveTestDataset(): Patient[] {
  return generateMockPatients({ patientCount: 1350 });
}

/**
 * Generate breast cancer specific data
 */
function generateBreastCancerTestPatients(count: number = 100): Patient[] {
  const patients: Patient[] = [];
  
  for (let i = 0; i < count; i++) {
    if (i % 50 === 0 && i > 0) {
      self.postMessage({
        type: "progress",
        current: i,
        total: count,
        percentage: Math.round((i / count) * 100)
      } as ProgressMessage);
    }

    const basePatient = generateMockPatients({ patientCount: 1 })[0];
    basePatient.tumorType = "C50.9 - Mammakarzinom";
    basePatient.tumorLocation = "Brust";
    basePatient.tumorMainCategory = "Solide Tumore";
    basePatient.isHematological = false;
    basePatient.isSolid = true;
    patients.push(basePatient);
  }
  
  return patients;
}

/**
 * Generate lung cancer specific data
 */
function generateLungCancerTestPatients(count: number = 100): Patient[] {
  const patients: Patient[] = [];
  
  for (let i = 0; i < count; i++) {
    if (i % 50 === 0 && i > 0) {
      self.postMessage({
        type: "progress",
        current: i,
        total: count,
        percentage: Math.round((i / count) * 100)
      } as ProgressMessage);
    }

    const basePatient = generateMockPatients({ patientCount: 1 })[0];
    basePatient.tumorType = "C78.9 - Bronchialkarzinom";
    basePatient.tumorLocation = "Lunge";
    basePatient.tumorMainCategory = "Solide Tumore";
    patients.push(basePatient);
  }
  
  return patients;
}

/**
 * Generate pancreatic cancer specific data
 */
function generatePancreaticCancerTestPatients(count: number = 80): Patient[] {
  const patients: Patient[] = [];
  
  for (let i = 0; i < count; i++) {
    if (i % 50 === 0 && i > 0) {
      self.postMessage({
        type: "progress",
        current: i,
        total: count,
        percentage: Math.round((i / count) * 100)
      } as ProgressMessage);
    }

    const basePatient = generateMockPatients({ patientCount: 1 })[0];
    basePatient.tumorType = "C25.9 - Pankreaskarzinom";
    basePatient.tumorLocation = "Pankreas";
    basePatient.tumorMainCategory = "Solide Tumore";
    patients.push(basePatient);
  }
  
  return patients;
}

/**
 * Generate disease-free survival specific data
 */
function generateDiseaseFreeeSurvivalTestPatients(count: number = 120): Patient[] {
  const patients: Patient[] = [];
  
  for (let i = 0; i < count; i++) {
    if (i % 50 === 0 && i > 0) {
      self.postMessage({
        type: "progress",
        current: i,
        total: count,
        percentage: Math.round((i / count) * 100)
      } as ProgressMessage);
    }

    const basePatient = generateMockPatients({ patientCount: 1 })[0];
    basePatient.dfsEligible = true;
    basePatient.verlauf_Lokaler_Tumorstatus = "K";
    basePatient.verlauf_Regionaerer_Lymphknotenstatus = "K";
    basePatient.verlauf_Fernmetastasen = "K";
    basePatient.residualstatus = "R0";
    patients.push(basePatient);
  }
  
  return patients;
}

// Scenario mapping
const scenarios: Record<string, (options?: MockDataOptions) => Patient[]> = {
  small: () => generateMockPatients({ patientCount: 50 }),
  medium: () => generateMockPatients({ patientCount: 150 }),
  large: () => generateMockPatients({ patientCount: 300 }),
  comprehensive: () => generateComprehensiveTestDataset(),
  larynx: () => generateMockPatients({ patientCount: 100 }),
  mamma: () => generateMockPatients({ patientCount: 100 }),
  breastCancer: () => generateBreastCancerTestPatients(100),
  lungCancer: () => generateLungCancerTestPatients(100),
  pancreaticCancer: () => generatePancreaticCancerTestPatients(80),
  diseaseFreeSurvival: () => generateDiseaseFreeeSurvivalTestPatients(120),
};

// Listen for messages from main thread
self.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, scenario, options } = event.data;
    
    if (type === "generate") {
      const generator = scenarios[scenario];
      if (!generator) {
        self.postMessage({
          type: "error",
          error: `Unknown scenario: ${scenario}`
        } as ErrorMessage);
        return;
      }
      
      const patients = generator(options);
      
      self.postMessage({
        type: "complete",
        patients
      } as CompleteMessage);
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    } as ErrorMessage);
  }
});
