import { describe, expect, it } from "vitest";
import { toPatients } from "../oncobox/to-patients";
import type { OncoBoxCase, OncoBoxMeta } from "../oncobox/types";

const META: OncoBoxMeta = {
  boxType: "brust",
  profileId: "family-2",
  schemaVersion: "2.0",
  patientCount: 1,
  caseCount: 1,
  followUpCount: 0,
};

function buildCase(overrides: Partial<OncoBoxCase> = {}): OncoBoxCase {
  return {
    patientId: "1",
    caseId: "1.1",
    isPrimary: true,
    isCenterCase: true,
    centerType: null,
    icd10: "C50.4",
    icdIsTopography: false,
    side: "L",
    diagnosisDate: "2018-01-01",
    ageAtDiagnosis: 62,
    gender: "W",
    deathDate: null,
    deathTumorRelated: null,
    staging: { cT: "T2", cN: "N0", cM: "M0", pT: null, pN: null, pM: null, grading: "2" },
    followUps: [],
    distantMets: [],
    ausschlussFelder: {
      residualstatusLokal: null,
      residualstatusGesamt: null,
      krebsvorerkrankung: null,
      uiccStadium: null,
      synchronerPrimaertumor: null,
      opDatum: null,
      opTyp: null,
      bestrahlungsTyp: null,
      bestrahlungsZeitpunkt: null,
      bestrahlungsIntention: null,
      therapieTyp: null,
      zufallsbefund: null,
    },
    ...overrides,
  };
}

describe("toPatients", () => {
  // Regression: der alte Importer nahm das erste Follow-up und verkürzte die
  // Beobachtungszeit um die gesamte spätere Nachsorge.
  it("zensiert am spätesten Follow-up", () => {
    const [patient] = toPatients(
      [
        buildCase({
          followUps: [
            { date: "2020-01-01", vitalStatus: "alive", localStatus: "K", nodalStatus: null, distantStatus: null, overallStatus: null, secondTumor: null, secondTumorRaw: null, quelleFollowUp: null, localRecurrenceDate: null, biochemicalRecurrence: null, biochemicalRecurrenceDate: null, distantMetastasisDate: null },
            { date: "2024-01-01", vitalStatus: "alive", localStatus: "K", nodalStatus: null, distantStatus: null, overallStatus: null, secondTumor: null, secondTumorRaw: null, quelleFollowUp: null, localRecurrenceDate: null, biochemicalRecurrence: null, biochemicalRecurrenceDate: null, distantMetastasisDate: null },
          ],
        }),
      ],
      META,
    );

    expect(patient.followupDateString).toBe("2024-01-01");
    expect(patient.survivalTime).toBe(72);
    expect(patient.event).toBe(false);
  });

  // Regression: toBoolean("lebend") lieferte true und machte aus lebenden
  // Patientinnen Ereignisse.
  it("macht aus einer lebenden Patientin kein Ereignis", () => {
    const [patient] = toPatients(
      [
        buildCase({
          followUps: [
            { date: "2024-01-01", vitalStatus: "alive", localStatus: null, nodalStatus: null, distantStatus: null, overallStatus: null, secondTumor: null, secondTumorRaw: null, quelleFollowUp: null, localRecurrenceDate: null, biochemicalRecurrence: null, biochemicalRecurrenceDate: null, distantMetastasisDate: null },
          ],
        }),
      ],
      META,
    );

    expect(patient.event).toBe(false);
    expect(patient.vitalStatus).toBe(true);
  });

  it("wertet ein Sterbedatum als Ereignis und als Enddatum", () => {
    const [patient] = toPatients([buildCase({ deathDate: "2021-01-01" })], META);

    expect(patient.event).toBe(true);
    expect(patient.followupDateString).toBe("2021-01-01");
    expect(patient.survivalTime).toBe(36);
  });

  it("wertet einen Follow-up mit Vitalstatus verstorben als Ereignis", () => {
    const [patient] = toPatients(
      [
        buildCase({
          followUps: [
            { date: "2020-07-01", vitalStatus: "dead", localStatus: null, nodalStatus: null, distantStatus: null, overallStatus: null, secondTumor: null, secondTumorRaw: null, quelleFollowUp: null, localRecurrenceDate: null, biochemicalRecurrence: null, biochemicalRecurrenceDate: null, distantMetastasisDate: null },
          ],
        }),
      ],
      META,
    );

    expect(patient.event).toBe(true);
  });

  // Regression: das Alter wurde gegen das heutige Jahr gerechnet.
  it("übernimmt das Alter bei Diagnose", () => {
    const [patient] = toPatients([buildCase({ ageAtDiagnosis: 62 })], META);

    expect(patient.age).toBe(62);
  });

  // Die 2.0-Boxen tragen im ICD-Feld auch den Platzhalter "N" fuer
  // "Kein Primaertumor, Lokalrezidiv". In brust-2.xml steht er dreimal.
  it("macht aus dem Platzhalter N keine Tumorentität", () => {
    const [patient] = toPatients([buildCase({ icd10: "N" })], META);

    expect(patient.tumorType).toBe("Unbekannt");
    expect(patient.oncoBox?.icd10).toBe("N");
  });

  it("behält In-situ-Diagnosen als Entität", () => {
    const [patient] = toPatients([buildCase({ icd10: "D05.1" })], META);

    expect(patient.tumorType).toBe("D05.1");
  });

  it("lässt nicht primäre Fälle weg", () => {
    const patients = toPatients([buildCase({ isPrimary: false }), buildCase()], META);

    expect(patients).toHaveLength(1);
  });

  // Darm 1.0 kennt keinen Marker, dort entscheidet der Zentrumsfall.
  it("behält Zentrumsfälle ohne Primärmarker", () => {
    const patients = toPatients([buildCase({ isPrimary: null, isCenterCase: true })], META);

    expect(patients).toHaveLength(1);
  });

  it("erzeugt je Primärfall eine Zeile mit gleicher Patienten-ID", () => {
    const patients = toPatients([buildCase({ caseId: "1.1" }), buildCase({ caseId: "1.2" })], META);

    expect(patients.map((patient) => patient.id)).toEqual(["1.1", "1.2"]);
    expect(patients.every((patient) => patient.oncoBox?.patientId === "1")).toBe(true);
  });

  it("hängt die Follow-up-Serie unverändert an", () => {
    const followUps = [
      { date: "2020-01-01", vitalStatus: "alive" as const, localStatus: "K", nodalStatus: "K", distantStatus: "U", overallStatus: "V", secondTumor: false, secondTumorRaw: "0", quelleFollowUp: null, localRecurrenceDate: null, biochemicalRecurrence: null, biochemicalRecurrenceDate: null, distantMetastasisDate: null },
    ];
    const [patient] = toPatients([buildCase({ followUps })], META);

    expect(patient.oncoBox?.followUps).toEqual(followUps);
  });

  // Die Deutung von R als Rezidiv gehört in Teilprojekt B.
  it("lässt die einwertigen DFS-Felder unberührt", () => {
    const [patient] = toPatients(
      [
        buildCase({
          followUps: [
            { date: "2021-01-01", vitalStatus: "alive", localStatus: "R", nodalStatus: null, distantStatus: null, overallStatus: null, secondTumor: null, secondTumorRaw: null, quelleFollowUp: null, localRecurrenceDate: null, biochemicalRecurrence: null, biochemicalRecurrenceDate: null, distantMetastasisDate: null },
          ],
        }),
      ],
      META,
    );

    expect(patient.rezidivDatum).toBeUndefined();
    expect(patient.metastasenDatum).toBeUndefined();
  });

  it("setzt die Überlebenszeit bei fehlendem Diagnosedatum auf null Monate", () => {
    const [patient] = toPatients([buildCase({ diagnosisDate: null })], META);

    expect(patient.survivalTime).toBe(0);
  });
});

describe("toPatients: Kennung und Diagnosecode", () => {
  // Der Kaplan-Meier-Worker liest icd10 fuer den Tooltip und faellt sonst der
  // Reihe nach auf tumorLocation, lokalisation und tumorType zurueck. Die Seite
  // gehoert deshalb nur in lokalisation: stand sie auch in tumorLocation, zeigte
  // der Tooltip "R" statt eines Diagnosecodes.
  it("setzt den Diagnosecode als eigenes Feld und die Seite nur in lokalisation", () => {
    const [patient] = toPatients([buildCase({ icd10: "C50.4", side: "R" })], META);

    expect(patient.icd10).toBe("C50.4");
    expect(patient.tumorLocation).toBe("C50.4");
    expect(patient.lokalisation).toBe("R");
  });

  // "N" steht in den 2.0-Boxen fuer "Kein Primaertumor, Lokalrezidiv". Als
  // Diagnosecode durchgereicht stuende der Platzhalter im Tooltip, als waere er
  // eine Entitaet. Die Rueckfallebene darf dann aber nicht die Seite zeigen.
  it("laesst den Platzhalter N nicht als Diagnosecode durch", () => {
    const [patient] = toPatients([buildCase({ icd10: "N", side: "R" })], META);

    expect(patient.icd10).toBeNull();
    expect(patient.tumorType).toBe("Unbekannt");
    expect(patient.tumorLocation).toBe("Unbekannt");
  });

  // Die Fallkennung der 2.0-Boxen traegt die Patientennummer schon in sich.
  it("verdoppelt die Patientennummer nicht in der Kennung", () => {
    const patients = toPatients([buildCase({ patientId: "1", caseId: "1.2" })], META);

    expect(patients[0].id).toBe("1.2");
  });

  // Brust 1.0 nummeriert Faelle unabhaengig, dort muss zusammengesetzt werden.
  it("setzt zusammen, wo die Fallkennung die Patientennummer nicht enthaelt", () => {
    const patients = toPatients([buildCase({ patientId: "001", caseId: "0011" })], META);

    expect(patients[0].id).toBe("001-0011");
  });
});

/**
 * Die Ergebnisseite liest mehrere Groessen unter anderen Namen, als der Import
 * sie natuerlicherweise schreiben wuerde. Diese Tests pinnen genau die Namen,
 * auf die Tabelle, Filter, PDF-Export und Stratifizierung zugreifen. Ohne sie
 * widersprach sich die Ergebnisseite: die Kachel zaehlte Primaerfaelle,
 * waehrend die Tabelle darunter fuer jede Zeile "Primaerfall: Nein" zeigte.
 */
describe("toPatients: Feldnamen, die die Ergebnisseite liest", () => {
  it("setzt primaerfall als Zeichenkette 1", () => {
    const [patient] = toPatients([buildCase()], META);

    expect(patient.primaerfall).toBe("1");
  });

  it("setzt lokalisation fuer das gleichnamige Stratifizierungskriterium", () => {
    const [patient] = toPatients([buildCase({ side: "R" })], META);

    expect(patient.lokalisation).toBe("R");
  });

  it("setzt cT und pT auch flach, nicht nur unter staging.tnm", () => {
    const staging = { cT: "T2", cN: "N0", cM: "M0", pT: "T1b", pN: "N1a", pM: null, grading: "2" };
    const [patient] = toPatients([buildCase({ staging })], META);

    expect(patient.cT).toBe("T2");
    expect(patient.pT).toBe("T1b");
    expect(patient.staging?.tnm?.cT).toBe("T2");
  });

  it("leitet die flachen Staging-Felder ab, die Spalte und Filter lesen", () => {
    const staging = { cT: "T2", cN: "N0", cM: "M0", pT: "T1b", pN: "N1a", pM: "M0", grading: "2" };
    const [patient] = toPatients([buildCase({ staging })], META);

    expect(patient.staging?.tCategory).toBeTruthy();
    expect(patient.staging?.tPathological).toBe("T1b");
    expect(patient.staging?.tClinical).toBe("T2");
    expect(patient.staging?.nCategory).toBe("N1a");
    expect(patient.staging?.mCategory).toBe("M0");
    expect(patient.staging?.tOneDigit).toBeTruthy();
  });

  // Ein UICC-Stadium fuehren die Boxen nicht durchgaengig, es wird nicht geraten.
  it("erfindet kein UICC-Stadium", () => {
    const [patient] = toPatients([buildCase()], META);

    expect(patient.staging?.uicc).toBeNull();
  });
});
