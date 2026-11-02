import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { detectOncoBox } from "../oncobox/registry";
import { get, getAll, parseXml, readRootName } from "../oncobox/read-xml";
import { FAMILY_2_PROFILE } from "../oncobox/profiles/family-2";
import { BRUST_1_PROFILE } from "../oncobox/profiles/brust-1";
import { DARM_1_PROFILE } from "../oncobox/profiles/darm-1";
import { PROSTATA_1_PROFILE } from "../oncobox/profiles/prostata-1";

function sample(name: string): string {
  return readFileSync(new URL(`../../../public/oncobox-samples/${name}`, import.meta.url), "utf8");
}

function schema(name: string): string {
  return readFileSync(new URL(`../../../data/oncobox-schemas/${name}`, import.meta.url), "utf8");
}

describe("detectOncoBox", () => {
  it.each([
    ["brust-2.xml", "brust", "2.0", "family-2"],
    ["darm-2.xml", "darm", "2.0", "family-2"],
    ["lunge-2.xml", "lunge", "2.0", "family-2"],
    ["brust-1.xml", "brust", "1.0", "brust-1"],
    ["darm-1.xml", "darm", "1.0", "darm-1"],
  ])("erkennt %s als %s %s", (file, boxType, schemaVersion, profileId) => {
    const detection = detectOncoBox(sample(file));

    expect(detection).toMatchObject({ kind: "supported", boxType, schemaVersion });
    expect(detection?.kind === "supported" && detection.profile.id).toBe(profileId);
  });

  it.each([
    ["brust-2.xml", "family-2"],
    ["darm-2.xml", "family-2"],
    ["lunge-2.xml", "family-2"],
    ["brust-1.xml", "brust-1"],
    ["darm-1.xml", "darm-1"],
  ])("löst die Pflichtpfade von %s gegen die Musterlösung auf", (file, profileId) => {
    const xml = sample(file);
    const detection = detectOncoBox(xml);
    if (detection?.kind !== "supported") throw new Error("erwartete unterstützte Erkennung");
    expect(detection.profile.id).toBe(profileId);

    const { profile } = detection;
    const doc = parseXml(xml);
    const root = readRootName(doc);
    const patient = getAll(doc[root as string], profile.patientsPath)[0];
    expect(get(patient, profile.patient.patientId)).not.toBeNull();
    expect(get(patient, profile.patient.gender)).not.toBeNull();

    const oncoCase = getAll(patient, profile.patient.cases)[0];
    expect(get(oncoCase, profile.case.icd10)).not.toBeNull();
    expect(get(oncoCase, profile.case.diagnosisDate)).not.toBeNull();

    // darm-1.xml enthält keine Follow-ups, dort ist der Follow-up-Pfad nicht prüfbar.
    if (profileId !== "darm-1") {
      const followUp = getAll(oncoCase, profile.case.followUps)[0];
      expect(get(followUp, profile.followUp.vitalStatus)).not.toBeNull();
    }
  });

  // Prostata 1.0 hat jetzt ein eigenes Profil, siehe profiles/prostata-1.ts.
  it("erkennt Prostata 1.0 als unterstützt", () => {
    const detection = detectOncoBox(sample("prostata-1.xml"));
    expect(detection).toMatchObject({ kind: "supported", boxType: "prostata", schemaVersion: "1.0" });
    expect(detection?.kind === "supported" && detection.profile.id).toBe(PROSTATA_1_PROFILE.id);
  });

  it("meldet die DIGINET-Variante der Lunge-Box gesondert", () => {
    const diginet = `<?xml version="1.0" encoding="utf-8"?>
      <OncoBoxLunge>
        <ImportInfo><DatumXML>2023-11-16</DatumXML></ImportInfo>
        <Patienten>
          <Patient>
            <Stammdaten>
              <OncoBoxID>1</OncoBoxID>
              <Nachname>Musterfrau</Nachname>
              <Geburtsdatum>1961-11-20</Geburtsdatum>
            </Stammdaten>
          </Patient>
        </Patienten>
      </OncoBoxLunge>`;

    expect(detectOncoBox(diginet)).toEqual({
      kind: "known",
      boxType: "lunge",
      schemaVersion: "2.0",
      reason: "diginet",
    });
  });

  // Die bisherige Erkennung prüfte auf Teilzeichenketten wie "diagnose" und
  // hätte oBDS-Dateien an den OncoBox-Parser geleitet.
  it("erkennt eine oBDS-Datei nicht als OncoBox", () => {
    const obds = `<?xml version="1.0" encoding="UTF-8"?>
      <oBDS_v3_4_0>
        <Patientendaten>
          <Patient><Diagnose><Stammdaten>x</Stammdaten></Diagnose></Patient>
        </Patientendaten>
      </oBDS_v3_4_0>`;

    expect(detectOncoBox(obds)).toBeNull();
  });

  it("liefert null für unbrauchbare Eingaben", () => {
    expect(detectOncoBox("")).toBeNull();
    expect(detectOncoBox("kein xml")).toBeNull();
  });
});

// Die Darm-1.0-Musterlösung enthält keine Follow-ups, deshalb kann der
// Pfadauflösungs-Test oben die Follow-up-Pfade dort nicht prüfen. Diese Suite
// hält die Pfade stattdessen gegen das Prüfschema, das jedes Feld unabhängig
// von der Musterlösung als name="..." deklariert.
describe("Follow-up-Pfade gegen Prüfschema", () => {
  it.each([
    ["family-2", FAMILY_2_PROFILE, "brust-2.xsd"],
    ["brust-1", BRUST_1_PROFILE, "brust-1.xsd"],
    ["darm-1", DARM_1_PROFILE, "darm-1.xsd"],
  ] as const)("löst die Follow-up-Pfade von %s gegen das Prüfschema auf", (_id, profile, xsdFile) => {
    const xsd = schema(xsdFile);
    const paths = Object.values(profile.followUp).filter((path): path is string => path !== null);

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(xsd).toContain(`name="${path}"`);
    }
  });
});

/**
 * Das gemeinsame 2.0-Profil ist an drei Prüfschemata geprüft. Eine künftige
 * Box mit derselben Wurzelform damit zu parsen wäre geraten: legt sie ein Feld
 * anders an, liefert der Vitalstatus überall null, jeder Fall gilt als
 * zensiert und die Kurve zeigt hundert Prozent Überleben, ohne jede Warnung.
 */
describe("Erkennung fremder 2.0-Boxen", () => {
  const fremdeBox = `<?xml version="1.0" encoding="utf-8"?>
    <OncoBoxPankreas>
      <ImportInfo><DatumXML>2026-01-01</DatumXML></ImportInfo>
      <Patienten>
        <Patient>
          <Stammdaten><OncoBoxID>1</OncoBoxID><Geburtsjahr>1960</Geburtsjahr></Stammdaten>
          <Fall><Diagnose><ICD_10>C25.0</ICD_10></Diagnose></Fall>
        </Patient>
      </Patienten>
    </OncoBoxPankreas>`;

  it("meldet eine unbekannte 2.0-Box als noch nicht unterstützt", () => {
    expect(detectOncoBox(fremdeBox)).toEqual({
      kind: "known",
      boxType: "pankreas",
      schemaVersion: "2.0",
      reason: "notYetSupported",
    });
  });

  it("erkennt die drei geprüften Boxen weiterhin als unterstützt", () => {
    for (const datei of ["brust-2.xml", "darm-2.xml", "lunge-2.xml"]) {
      expect(detectOncoBox(sample(datei))?.kind).toBe("supported");
    }
  });
});
