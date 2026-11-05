import { describe, expect, it } from "vitest";
import { detectAnomalies } from "../anomaly-detection";
import type { Patient } from "../obds-parser-new";

function buildPatient(id: string, oncoBox: Partial<NonNullable<Patient["oncoBox"]>>): Patient {
  return {
    id,
    gender: "W",
    age: 60,
    tumorType: "C50.4",
    tumorCategory: "C50.4",
    tumorLocation: "L",
    diagnosisDate: "2018-01-01",
    survivalTime: 24,
    event: false,
    vitalStatus: true,
    tumorMainCategory: "Solide Tumore",
    tumorSubCategory: null,
    isHematological: false,
    isSolid: true,
    spreadCategory: "Lokal begrenzt",
    oncoBox: {
      boxType: "brust",
      schemaVersion: "2.0",
      patientId: "1",
      caseId: "1.1",
      isPrimary: true,
      isCenterCase: true,
      centerType: null,
      icd10: "C50.4",
      icdIsTopography: false,
      side: "L",
      deathDate: null,
      deathTumorRelated: null,
      followUps: [],
      distantMets: [],
      ...oncoBox,
    },
  } as Patient;
}

describe("OncoBox-Anomalien", () => {
  it("meldet Personen mit mehreren Primärfällen", () => {
    const issues = detectAnomalies([
      buildPatient("1-1.1", { patientId: "1", caseId: "1.1" }),
      buildPatient("1-1.2", { patientId: "1", caseId: "1.2" }),
      buildPatient("2-2.1", { patientId: "2", caseId: "2.1" }),
    ]).issues;

    expect(issues.some((issue) => issue.ruleId === "oncobox_multiple_primaries")).toBe(true);
  });

  it("meldet keine Mehrfachprimäre, wenn jede Person einen Fall hat", () => {
    const issues = detectAnomalies([
      buildPatient("1-1.1", { patientId: "1" }),
      buildPatient("2-2.1", { patientId: "2" }),
    ]).issues;

    expect(issues.some((issue) => issue.ruleId === "oncobox_multiple_primaries")).toBe(false);
  });

  it("meldet Fälle ohne Verlaufsdaten und ohne Sterbedatum", () => {
    const issues = detectAnomalies([
      buildPatient("1-1.1", { followUps: [], deathDate: null }),
    ]).issues;

    expect(issues.some((issue) => issue.ruleId === "oncobox_no_follow_up")).toBe(true);
  });

  it("meldet keinen fehlenden Verlauf bei vorhandenem Sterbedatum", () => {
    const issues = detectAnomalies([
      buildPatient("1-1.1", { followUps: [], deathDate: "2020-01-01" }),
    ]).issues;

    expect(issues.some((issue) => issue.ruleId === "oncobox_no_follow_up")).toBe(false);
  });

  it("weist auf den fehlenden Primärmarker von Darm 1.0 hin", () => {
    const issues = detectAnomalies([
      buildPatient("1-1", { boxType: "darm", schemaVersion: "1.0", isPrimary: null }),
    ]).issues;

    expect(issues.some((issue) => issue.ruleId === "oncobox_no_primary_marker")).toBe(true);
  });

  it("meldet keinen fehlenden Primärmarker, wenn er gesetzt ist", () => {
    const issues = detectAnomalies([
      buildPatient("1-1", { isPrimary: true }),
    ]).issues;

    expect(issues.some((issue) => issue.ruleId === "oncobox_no_primary_marker")).toBe(false);
  });

  it("meldet Fälle mit dem ICD-Platzhalter 'N' als ohne verwertbaren Diagnosecode", () => {
    const patient = buildPatient("1-1.1", { icd10: "N" });
    patient.tumorType = "Unbekannt";
    const issues = detectAnomalies([patient]).issues;

    expect(issues.some((issue) => issue.ruleId === "oncobox_no_diagnosis_code")).toBe(true);
  });

  it("meldet keinen fehlenden Diagnosecode bei bekannter Tumorentität", () => {
    const issues = detectAnomalies([buildPatient("1-1.1", {})]).issues;

    expect(issues.some((issue) => issue.ruleId === "oncobox_no_diagnosis_code")).toBe(false);
  });

  it("lässt Kohorten ohne OncoBox-Herkunft unberührt", () => {
    const patient = buildPatient("1-1.1", {});
    delete (patient as { oncoBox?: unknown }).oncoBox;

    const issues = detectAnomalies([patient]).issues;

    expect(issues.some((issue) => issue.ruleId.startsWith("oncobox"))).toBe(false);
  });
});
