import { describe, expect, it } from "vitest";
import { detectOncoBox } from "../oncobox/registry";
import { parseCases } from "../oncobox/parse-cases";
import { PROSTATA_1_PROFILE } from "../oncobox/profiles/prostata-1";

const PROSTATA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Patienten>
  <Patient>
    <BasicInformation><PatientID>1</PatientID><Birthday>1955-12-01</Birthday><Gender>M</Gender><DateOfDeath></DateOfDeath></BasicInformation>
    <Case>
      <CaseInformation><CenterCase>CC</CenterCase><CaseID>1</CaseID><PrimaryTumour>P</PrimaryTumour><Comorbidities>10</Comorbidities></CaseInformation>
      <Diagnosis><DateDiagnosis>2019-01-10</DateDiagnosis><ICD10>C61</ICD10><cT>T2a</cT><cN>N0</cN><cM>M0</cM></Diagnosis>
      <Surgery><SurgeryDate>2019-02-01</SurgeryDate><SurgeryType>RPE</SurgeryType></Surgery>
      <PostoperativeHistology><IncidentalFinding>N</IncidentalFinding><pT>T2c</pT><pN>N0</pN><pM>M0</pM><MarginStatus>R1</MarginStatus></PostoperativeHistology>
      <Radiotherapy><RadiotherapyType></RadiotherapyType><RadiotherapyTime></RadiotherapyTime><RadiotherapyIntent></RadiotherapyIntent></Radiotherapy>
      <Treatment><TreatmentType></TreatmentType></Treatment>
      <FollowUp>
        <FollowUpDate>2020-01-10</FollowUpDate><LifeStatus>A</LifeStatus>
        <LocalRecurrence>R</LocalRecurrence><DateRecurrence>2019-11-20</DateRecurrence>
        <BiochemicalRecurrence>Y</BiochemicalRecurrence><DateBiochemical>2019-09-15</DateBiochemical>
        <Metastasis>N</Metastasis><DateMetastasis></DateMetastasis>
        <TumourStatus>P</TumourStatus><SecondaryTumour>N</SecondaryTumour>
      </FollowUp>
    </Case>
  </Patient>
</Patienten>`;

describe("Prostata 1.0 wird erkannt", () => {
  // Bisher meldete die Erkennung notYetSupported. Der Beispieldatensatz muss
  // jetzt durchlaufen, sonst kommt der Rest des Plans dort nie an.
  it("liefert das Prostata-Profil statt einer Absage", () => {
    const erkannt = detectOncoBox(PROSTATA_XML);
    expect(erkannt?.kind).toBe("supported");
    expect(erkannt && "profile" in erkannt ? erkannt.profile.id : null).toBe("prostata-1");
    expect(erkannt?.boxType).toBe("prostata");
  });
});

describe("Prostata 1.0 wird gelesen", () => {
  it("liest Stammdaten und Diagnose", () => {
    const { cases } = parseCases(PROSTATA_XML, PROSTATA_1_PROFILE);
    expect(cases).toHaveLength(1);
    expect(cases[0].patientId).toBe("1");
    expect(cases[0].diagnosisDate).toBe("2019-01-10");
    expect(cases[0].icd10).toBe("C61");
    // Alter aus Geburtsdatum und Diagnosedatum: 2019 minus 1955.
    expect(cases[0].ageAtDiagnosis).toBe(64);
  });

  it("liest den Verlauf ohne Lymphknotenfeld", () => {
    const { cases } = parseCases(PROSTATA_XML, PROSTATA_1_PROFILE);
    const verlauf = cases[0].followUps[0];
    expect(verlauf.vitalStatus).toBe("alive");
    expect(verlauf.localStatus).toBe("R");
    expect(verlauf.distantStatus).toBe("N");
    expect(verlauf.overallStatus).toBe("P");
    // Prostata führt kein Lymphknotenfeld. null, nicht geraten.
    expect(verlauf.nodalStatus).toBeNull();
  });

  // Der Unterschied, der Prostata von Brust und Darm abhebt: die Box nennt das
  // Ereignisdatum selbst, statt es über das Untersuchungsdatum zu nähern.
  it("liest die eigenen Ereignisdaten", () => {
    const { cases } = parseCases(PROSTATA_XML, PROSTATA_1_PROFILE);
    const verlauf = cases[0].followUps[0];
    expect(verlauf.localRecurrenceDate).toBe("2019-11-20");
    expect(verlauf.biochemicalRecurrence).toBe("Y");
    expect(verlauf.biochemicalRecurrenceDate).toBe("2019-09-15");
    expect(verlauf.distantMetastasisDate).toBeNull();
  });

  it("liest die Felder der Falltypisierung", () => {
    const { cases } = parseCases(PROSTATA_XML, PROSTATA_1_PROFILE);
    const felder = cases[0].ausschlussFelder;
    expect(felder.opTyp).toBe("RPE");
    expect(felder.zufallsbefund).toBe("N");
    expect(felder.residualstatusLokal).toBe("R1");
    expect(felder.krebsvorerkrankung).toBe("10");
    expect(felder.bestrahlungsTyp).toBeNull();
    expect(felder.therapieTyp).toBeNull();
  });
});

describe("Die anderen Boxen bleiben unberührt", () => {
  // Die drei neuen Pfade sind bei Brust, Darm und Familie 2.0 null. Ein
  // versehentlich gefülltes Feld dort würde eine Falltypisierung auslösen,
  // die es in diesen Boxen nicht gibt.
  it("lässt die Falltypfelder bei den übrigen Profilen leer", async () => {
    const { BRUST_1_PROFILE } = await import("../oncobox/profiles/brust-1");
    const { DARM_1_PROFILE } = await import("../oncobox/profiles/darm-1");
    const { FAMILY_2_PROFILE } = await import("../oncobox/profiles/family-2");
    for (const profil of [BRUST_1_PROFILE, DARM_1_PROFILE, FAMILY_2_PROFILE]) {
      expect(profil.ausschluss.opTyp).toBeNull();
      expect(profil.ausschluss.zufallsbefund).toBeNull();
      expect(profil.ausschluss.therapieTyp).toBeNull();
    }
  });
});
