import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { parseCases } from "../oncobox/parse-cases";
import { detectOncoBox } from "../oncobox/registry";
import { toPatients } from "../oncobox/to-patients";
import type { OncoBoxCase } from "../oncobox/types";

/**
 * Brust 1.0 und die 2.0-Boxen notieren zu jedem TNM-Wert, ob er klinisch oder
 * pathologisch erhoben wurde. Ohne diesen Kennzeichner landete jeder
 * prätherapeutische Wert in der klinischen Spalte, und die Legende stellte ihm
 * ein c voran. In der Brust-1.0-Musterlösung betrifft das 30 von 33 Werten.
 */
function loadSample(fileName: string): { cases: OncoBoxCase[]; boxType: string } {
  const xml = readFileSync(
    new URL(`../../../public/oncobox-samples/${fileName}`, import.meta.url),
    "utf8",
  );
  const detection = detectOncoBox(xml);
  if (detection?.kind !== "supported") throw new Error(`${fileName} nicht als unterstuetzt erkannt`);
  return { cases: parseCases(xml, detection.profile).cases, boxType: detection.boxType };
}

const META = {
  boxType: "brust",
  profileId: "brust-1",
  schemaVersion: "1.0",
  patientCount: 0,
  caseCount: 0,
  followUpCount: 0,
};

describe("c/p-Kennzeichner der TNM-Werte", () => {
  it("legt einen als p gekennzeichneten praetherapeutischen Wert in die pathologische Spalte", () => {
    const { cases } = loadSample("brust-1.xml");
    // Faelle ohne postoperativen Wert zeigen die Zuordnung unvermischt.
    const pathological = cases.filter((item) => item.staging.pT && !item.staging.cT);

    expect(pathological.length).toBeGreaterThan(0);
    for (const item of pathological) {
      expect(item.staging.cT).toBeNull();
    }
  });

  it("laesst die drei als c gekennzeichneten Brust-1.0-Faelle klinisch", () => {
    const { cases } = loadSample("brust-1.xml");
    const clinical = cases.filter((item) => item.staging.cT !== null);

    expect(clinical).toHaveLength(3);
  });

  // Brust 2.0 kennzeichnet fast jedes postoperative M als klinisch erhoben. Die
  // Voreinstellung "postoperativ gleich pathologisch" waere dort falsch.
  it("ordnet ein als c gekennzeichnetes postoperatives M der klinischen Spalte zu", () => {
    const { cases } = loadSample("brust-2.xml");
    const clinicalM = cases.filter((item) => item.staging.cM !== null);
    const pathologicalM = cases.filter((item) => item.staging.pM !== null);

    expect(clinicalM.length).toBeGreaterThan(pathologicalM.length);
  });

  // Darm 1.0 fuehrt keinen Kennzeichner, dort muss die Voreinstellung greifen.
  it("bleibt ohne Kennzeichner bei praetherapeutisch gleich klinisch", () => {
    const { cases } = loadSample("darm-1.xml");
    const withPreTherapyT = cases.filter((item) => item.staging.cT !== null);

    expect(withPreTherapyT.length).toBeGreaterThan(0);
  });
});

describe("Geschlecht und DFS-Eignung", () => {
  it("vereinheitlicht die Rohwerte der Boxen auf male, female und unknown", () => {
    const { cases } = loadSample("brust-1.xml");
    const genders = new Set(toPatients(cases, META).map((patient) => patient.gender));

    expect(genders.has("male")).toBe(true);
    expect(genders.has("female")).toBe(true);
    for (const gender of genders) {
      expect(["male", "female", "unknown"]).toContain(gender);
    }
  });

  it("faengt auch die Werte D und X von Darm 2.0 ab", () => {
    const { cases } = loadSample("darm-2.xml");
    const genders = new Set(toPatients(cases, META).map((patient) => patient.gender));

    expect(genders.has("unknown")).toBe(true);
    for (const gender of genders) {
      expect(["male", "female", "unknown"]).toContain(gender);
    }
  });

  // Für eine Box mit eigener DFS-Regel entscheidet die Regel selbst, welcher
  // Fall auswertbar ist; der feste Riegel gilt nur noch dort, wo keine Regel
  // existiert. brust-2.xml gehört zur Familie 2.0, deren Profilkennung
  // "family-2" eine DFS-Regel führt.
  it("sperrt DFS nicht mehr fest, wenn die Box eine eigene Regel führt", () => {
    const { cases } = loadSample("brust-2.xml");
    const familyTwoMeta = { ...META, boxType: "brust", profileId: "family-2", schemaVersion: "2.0" };

    for (const patient of toPatients(cases, familyTwoMeta)) {
      expect(patient.dfsEligible).toBeUndefined();
    }
  });
});
