import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { parseCases } from "../oncobox/parse-cases";
import { detectOncoBox } from "../oncobox/registry";

function parseSample(name: string) {
  const xml = readFileSync(new URL(`../../../public/oncobox-samples/${name}`, import.meta.url), "utf8");
  const detection = detectOncoBox(xml);
  if (detection?.kind !== "supported") throw new Error(`${name} nicht unterstützt`);
  return parseCases(xml, detection.profile);
}

describe("parseCases: Strukturzahlen der Musterlösungen", () => {
  it.each([
    ["brust-1.xml", 33, 65],
    ["brust-2.xml", 39, 39],
    ["darm-1.xml", 32, 0],
    ["darm-2.xml", 43, 43],
    ["lunge-2.xml", 46, 48],
  ])("liest aus %s %i Fälle und %i Follow-ups", (file, caseCount, followUpCount) => {
    const { cases } = parseSample(file);

    expect(cases).toHaveLength(caseCount);
    expect(cases.reduce((sum, item) => sum + item.followUps.length, 0)).toBe(followUpCount);
  });

  // Der alte Importer nahm per regulaerem Ausdruck den ersten Treffer und
  // verkürzte damit die Beobachtungszeit.
  it("sortiert die Follow-ups eines Falls chronologisch", () => {
    const { cases } = parseSample("brust-1.xml");
    const withSeveral = cases.filter((item) => item.followUps.length > 1);

    expect(withSeveral.length).toBeGreaterThan(0);
    for (const item of withSeveral) {
      const dates = item.followUps.map((followUp) => followUp.date ?? "");
      expect([...dates].sort()).toEqual(dates);
    }
  });

  it("lässt Statuscodes roh", () => {
    const { cases } = parseSample("brust-2.xml");
    const codes = new Set(cases.flatMap((item) => item.followUps.map((f) => f.localStatus)));

    expect([...codes].every((code) => code === null || code.length <= 2)).toBe(true);
  });

  it("liest ICD-10 aus dem Diagnosezweig, nicht aus der Diagnoseart", () => {
    const { cases } = parseSample("brust-1.xml");

    // brust-1.xml enthält neben invasiven Diagnosen (C50) auch In-situ-Diagnosen
    // (D05), beides gültige ICD-10-Codes aus dem Diagnosezweig. Geprüft wird die
    // ICD-10-Form, nicht ein einzelner Code, denn nicht jeder Fall ist invasiv.
    expect(cases.every((item) => /^[A-Z]\d{2}/.test(item.icd10 ?? ""))).toBe(true);
  });

  it("kennzeichnet die ICD-O-Topographie von Darm 1.0", () => {
    const { cases } = parseSample("darm-1.xml");

    expect(cases[0].icdIsTopography).toBe(true);
  });

  it("erkennt mehrere Fälle je Patient", () => {
    const { cases } = parseSample("brust-1.xml");
    const perPatient = new Map<string, number>();
    for (const item of cases) perPatient.set(item.patientId, (perPatient.get(item.patientId) ?? 0) + 1);

    expect([...perPatient.values()].some((count) => count > 1)).toBe(true);
  });

  it("markiert Fälle ohne Verlaufsdaten als Warnung", () => {
    const { warnings } = parseSample("darm-1.xml");

    expect(warnings.length).toBe(32);
  });
});

/**
 * Brust 1.0 fuehrt das Alter am Patientknoten und kein Geburtsjahr. Wurde nur
 * der Fallknoten geprueft, blieb ageAtDiagnosis null und jeder Fall bekam
 * spaeter Alter 0. Der Fehler war stumm, weil 0 innerhalb der
 * Plausibilitaetsgrenzen liegt und eine Kohorte aus Nullen keine Ausreisser hat.
 */
describe("Alter bei Diagnose", () => {
  it("liest das Alter von Brust 1.0 vom Patientknoten", () => {
    const { cases } = parseSample("brust-1.xml");
    const alter = cases.map((fall) => fall.ageAtDiagnosis);

    expect(alter.every((a) => a !== null && a > 0)).toBe(true);
    expect(Math.max(...(alter as number[]))).toBeLessThan(120);
  });

  it("liest das Alter von Brust 2.0 weiterhin vom Fallknoten", () => {
    const { cases } = parseSample("brust-2.xml");

    expect(cases.every((fall) => fall.ageAtDiagnosis !== null && fall.ageAtDiagnosis > 0)).toBe(true);
  });

  it("leitet das Alter von Darm 1.0 weiterhin aus dem Geburtsjahr ab", () => {
    const { cases } = parseSample("darm-1.xml");

    expect(cases.every((fall) => fall.ageAtDiagnosis !== null && fall.ageAtDiagnosis > 0)).toBe(true);
  });
});
