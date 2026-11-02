import { describe, expect, it } from "vitest";
import { kohorteFuerEndpunkt, zeitEinheitDerKohorte } from "../endpunkte/anwenden";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import { endpunktById } from "../endpunkte/registry";
import type { Patient } from "../obds-parser-new";
import { toPatients } from "../oncobox/to-patients";
import type { OncoBoxCase, OncoBoxFollowUp, OncoBoxMeta } from "../oncobox/types";

function followUp(teile: Partial<OncoBoxFollowUp> = {}): OncoBoxFollowUp {
  return {
    date: "2020-01-10",
    vitalStatus: "alive",
    localStatus: "K",
    nodalStatus: "K",
    distantStatus: "K",
    overallStatus: "VR",
    secondTumor: false,
    secondTumorRaw: "N",
    quelleFollowUp: "K",
    localRecurrenceDate: null,
    biochemicalRecurrence: null,
    biochemicalRecurrenceDate: null,
    distantMetastasisDate: null,
    ...teile,
  };
}

function brustFall(teile: Partial<OncoBoxCase> = {}): OncoBoxCase {
  return {
    patientId: "1",
    caseId: "1",
    isPrimary: true,
    isCenterCase: true,
    centerType: "BZ",
    icd10: "C50.4",
    icdIsTopography: false,
    side: "L",
    diagnosisDate: "2019-01-10",
    ageAtDiagnosis: 62,
    gender: "W",
    deathDate: null,
    deathTumorRelated: null,
    staging: { cT: null, cN: null, cM: null, pT: "pT1c", pN: "pN0", pM: "M0", grading: "G2" },
    followUps: [followUp()],
    distantMets: [],
    ausschlussFelder: {
      residualstatusLokal: "R0",
      residualstatusGesamt: null,
      krebsvorerkrankung: "N",
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
    ...teile,
  };
}

function patient(fall: OncoBoxCase, id: string, profileId = "brust-1"): Patient {
  return {
    id,
    survivalTime: 12,
    event: false,
    diagnosisDate: fall.diagnosisDate,
    dfsEligible: undefined,
    oncoBox: {
      boxType: "brust",
      profileId,
      schemaVersion: "1.0",
      patientId: fall.patientId,
      caseId: fall.caseId,
      isPrimary: fall.isPrimary,
      isCenterCase: fall.isCenterCase,
      centerType: fall.centerType,
      icd10: fall.icd10,
      icdIsTopography: fall.icdIsTopography,
      side: fall.side,
      deathDate: fall.deathDate,
      deathTumorRelated: fall.deathTumorRelated,
      followUps: fall.followUps,
      distantMets: fall.distantMets,
      fall,
    },
  } as unknown as Patient;
}

/**
 * Darm 1.0 ist die einzige Box mit Beobachtungsfenster (fünf Jahre). Bewusst
 * nicht aus brust angepasst: eigene Ausschlussfelder (uiccStadium,
 * residualstatusGesamt) und eigene Rezidivcodes ("0"/"1"/"2" statt "K"/"R").
 */
function darmFall(teile: Partial<OncoBoxCase> = {}): OncoBoxCase {
  return {
    patientId: "1",
    caseId: "1",
    isPrimary: null,
    isCenterCase: true,
    centerType: "DZ",
    icd10: "C18.7",
    icdIsTopography: true,
    side: null,
    diagnosisDate: "2015-01-01",
    ageAtDiagnosis: 64,
    gender: "M",
    deathDate: null,
    deathTumorRelated: null,
    staging: { cT: null, cN: null, cM: null, pT: "pT3", pN: "pN1", pM: "M0", grading: "G2" },
    followUps: [followUp({ date: "2015-06-01", localStatus: "0", nodalStatus: "0", distantStatus: "0", secondTumorRaw: "0" })],
    distantMets: [],
    ausschlussFelder: {
      residualstatusLokal: "R0",
      residualstatusGesamt: "R0",
      krebsvorerkrankung: "0",
      uiccStadium: "3",
      synchronerPrimaertumor: "0",
      opDatum: "2015-01-20",
      opTyp: null,
      bestrahlungsTyp: null,
      bestrahlungsZeitpunkt: null,
      bestrahlungsIntention: null,
      therapieTyp: null,
      zufallsbefund: null,
    },
    ...teile,
  };
}

function darmPatient(fall: OncoBoxCase, id: string): Patient {
  return {
    id,
    survivalTime: 12,
    event: false,
    diagnosisDate: fall.diagnosisDate,
    dfsEligible: undefined,
    oncoBox: {
      boxType: "darm",
      profileId: "darm-1",
      schemaVersion: "1.0",
      patientId: fall.patientId,
      caseId: fall.caseId,
      isPrimary: fall.isPrimary,
      isCenterCase: fall.isCenterCase,
      centerType: fall.centerType,
      icd10: fall.icd10,
      icdIsTopography: fall.icdIsTopography,
      side: fall.side,
      deathDate: fall.deathDate,
      deathTumorRelated: fall.deathTumorRelated,
      followUps: fall.followUps,
      distantMets: fall.distantMets,
      fall,
    },
  } as unknown as Patient;
}

const DFS = endpunktById("dfs")!;
const OAS = endpunktById("oas")!;

describe("Kohorte aus einer Boxregel", () => {
  it("rechnet die Zeit in Tagen statt in Monaten", () => {
    const kohorte = kohorteFuerEndpunkt(DFS, [patient(brustFall(), "a")]);
    expect(kohorte).toHaveLength(1);
    // 2019-01-10 bis 2020-01-10 sind 365 Tage, nicht 12 Monate.
    expect(kohorte[0].survivalTime).toBe(365);
    expect(kohorte[0].event).toBe(false);
  });

  it("meldet für eine Boxkohorte die Einheit Tage", () => {
    expect(zeitEinheitDerKohorte(DFS, [patient(brustFall(), "a")])).toBe("tage");
  });

  it("meldet für eine Kohorte ohne Box die Einheit Monate", () => {
    const ohneBox = { id: "a", survivalTime: 12, event: false } as unknown as Patient;
    expect(zeitEinheitDerKohorte(DFS, [ohneBox])).toBe("monate");
  });

  // Der Schlüssel ist die Profilkennung, nicht die Boxbezeichnung. Beide
  // Familien melden boxType "brust"; nur die Profilkennung trennt sie, und
  // nur sie führt zur richtigen Regel.
  it("wählt die Regel nach der Profilkennung, nicht nach der Boxbezeichnung", () => {
    const einsNull = patient(brustFall(), "a", "brust-1");
    const zweiNull = patient(brustFall(), "b", "family-2");
    const regelEins = boxRegelFuer("brust-1", "dfs");
    const regelZwei = boxRegelFuer("family-2", "dfs");
    expect(regelEins).not.toBe(regelZwei);
    // Beide rechnen in Tagen, aber nach verschiedenen Vorschriften.
    expect(zeitEinheitDerKohorte(DFS, [einsNull])).toBe("tage");
    expect(zeitEinheitDerKohorte(DFS, [zweiNull])).toBe("tage");
  });

  it("meldet für eine unbekannte Profilkennung die allgemeine Einheit", () => {
    const fremd = patient(brustFall(), "a", "lunge-3");
    expect(zeitEinheitDerKohorte(DFS, [fremd])).toBe("monate");
  });

  // Die Ausschlusskriterien der Box bestimmen die Risikomenge. Ein Fall mit
  // R1 gehört nicht hinein, und N sinkt entsprechend.
  it("wendet die Ausschlusskriterien der Box an", () => {
    const drin = patient(brustFall(), "a");
    const raus = patient(
      brustFall({
        ausschlussFelder: { ...brustFall().ausschlussFelder, residualstatusLokal: "R1" },
      }),
      "b",
    );
    const kohorte = kohorteFuerEndpunkt(DFS, [drin, raus]);
    expect(kohorte.map((p) => p.id)).toEqual(["a"]);
  });

  it("wertet ein Rezidiv als Ereignis", () => {
    const p = patient(brustFall({ followUps: [followUp({ localStatus: "R" })] }), "a");
    expect(kohorteFuerEndpunkt(DFS, [p])[0].event).toBe(true);
  });

  // Das Gesamtüberleben ging bisher unverändert durch. Für Boxen mit Regel
  // gilt jetzt auch dort die Boxvorschrift, sonst rechnete dieselbe Datei OAS
  // in Monaten und DFS in Tagen.
  it("wendet die Boxregel auch auf das Gesamtüberleben an", () => {
    // Sterbedatum und Vitalstatus müssen zusammenpassen, sonst ist die Meldung
    // nach dem Auswertungsblatt der Box ungültig und der Fall fällt heraus.
    const p = patient(
      brustFall({ deathDate: "2020-01-10", followUps: [followUp({ vitalStatus: "dead" })] }),
      "a",
    );
    const kohorte = kohorteFuerEndpunkt(OAS, [p]);
    expect(kohorte[0].survivalTime).toBe(365);
    expect(kohorte[0].event).toBe(true);
  });

  it("lässt eine Kohorte ohne Box unverändert durch das Gesamtüberleben", () => {
    const ohneBox = { id: "a", survivalTime: 12, event: true } as unknown as Patient;
    const kohorte = kohorteFuerEndpunkt(OAS, [ohneBox]);
    expect(kohorte[0].survivalTime).toBe(12);
  });

  // Nur Darm 1.0 begrenzt den Beobachtungszeitraum, auf fünf Jahre (1826
  // Tage). Ein Follow-up weit danach darf den Fall nicht aus der Kohorte
  // werfen, er zensiert am Rand: der Fall stand bis dahin in der Risikomenge.
  it("zensiert einen Fall jenseits des Beobachtungsfensters am Rand, statt ihn zu verwerfen", () => {
    const spaet = darmPatient(
      darmFall({
        followUps: [
          followUp({ date: "2022-01-01", localStatus: "0", nodalStatus: "0", distantStatus: "0", secondTumorRaw: "0" }),
        ],
      }),
      "a",
    );
    const kohorte = kohorteFuerEndpunkt(DFS, [spaet]);
    expect(kohorte).toHaveLength(1);
    expect(kohorte[0].survivalTime).toBe(1826);
    expect(kohorte[0].event).toBe(false);
  });

  // Für eine Profilkennung ohne Regel (etwa eine künftige, noch nicht
  // unterstützte Box) bleibt der alte, feste Riegel bestehen: ohne
  // Rezidiv- und Metastasendatum zensierte die allgemeine Regel jeden Fall.
  it("sperrt DFS weiterhin fest, wenn die Profilkennung keine Regel führt", () => {
    const meta: OncoBoxMeta = {
      boxType: "brust",
      profileId: "lunge-3",
      schemaVersion: "1.0",
      patientCount: 1,
      caseCount: 1,
      followUpCount: 1,
    };
    const [fremd] = toPatients([brustFall()], meta);
    expect(fremd.dfsEligible).toBe(false);
  });
});
