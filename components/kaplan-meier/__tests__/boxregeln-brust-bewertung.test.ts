import { describe, expect, it } from "vitest";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import { BRUST_1_DFS, BRUST_1_OAS } from "../endpunkte/boxregeln/brust-1";
import type { OncoBoxCase, OncoBoxFollowUp } from "../oncobox/types";

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

function fall(teile: Partial<OncoBoxCase> = {}): OncoBoxCase {
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

describe("Brust 1.0, Kategorie A", () => {
  it("wertet das erste Follow-up mit lokalem Rezidiv als Ereignis", () => {
    const f = fall({
      followUps: [
        followUp({ date: "2019-07-10" }),
        followUp({ date: "2020-01-10", localStatus: "R" }),
        followUp({ date: "2020-07-10", localStatus: "R" }),
      ],
    });
    expect(BRUST_1_DFS.bewerte(f)).toEqual({ zeitTage: 365, ereignis: true, datum: "2020-01-10" });
  });

  it("wertet ein Lymphknotenrezidiv als Ereignis", () => {
    const f = fall({ followUps: [followUp({ nodalStatus: "R" })] });
    expect(BRUST_1_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  it("wertet Fernmetastasen als Ereignis", () => {
    const f = fall({ followUps: [followUp({ distantStatus: "R" })] });
    expect(BRUST_1_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  // Die Spezifikation nennt den Zweittumor ausdrücklich in Kategorie A. Das
  // weicht von der üblichen DFS-Definition ab, in der ein neuer Tumor kein
  // Rezidiv ist, und ist genau der Grund, warum hier nichts übernommen wird.
  it("wertet einen Zweittumor als Ereignis", () => {
    const f = fall({ followUps: [followUp({ secondTumor: true, secondTumorRaw: "J" })] });
    expect(BRUST_1_DFS.bewerte(f)?.ereignis).toBe(true);
  });
});

describe("Brust 1.0, Kategorie B", () => {
  it("zensiert am letzten datierten Follow-up", () => {
    const f = fall({
      followUps: [followUp({ date: "2019-07-10" }), followUp({ date: "2021-01-10" })],
    });
    expect(BRUST_1_DFS.bewerte(f)).toEqual({ zeitTage: 731, ereignis: false, datum: "2021-01-10" });
  });
});

describe("Brust 1.0, Kategorie C", () => {
  // Der Tod ohne vorheriges Rezidiv ist bei Brust ein Ereignis, gerechnet bis
  // zum Sterbedatum, nicht bis zum letzten Follow-up.
  it("wertet den Tod ohne Rezidiv als Ereignis am Sterbedatum", () => {
    const f = fall({
      deathDate: "2021-03-01",
      followUps: [followUp({ date: "2020-12-01", vitalStatus: "dead" })],
    });
    expect(BRUST_1_DFS.bewerte(f)).toEqual({ zeitTage: 781, ereignis: true, datum: "2021-03-01" });
  });

  it("lässt Kategorie A vor Kategorie C gehen", () => {
    const f = fall({
      deathDate: "2021-03-01",
      followUps: [followUp({ date: "2020-01-10", localStatus: "R" })],
    });
    expect(BRUST_1_DFS.bewerte(f)?.datum).toBe("2020-01-10");
  });
});

describe("Brust 1.0, Gesamtüberleben", () => {
  it("wertet den Tod als Ereignis am Sterbedatum", () => {
    const f = fall({ deathDate: "2021-03-01" });
    expect(BRUST_1_OAS.bewerte(f)).toEqual({ zeitTage: 781, ereignis: true, datum: "2021-03-01" });
  });

  it("zensiert Lebende am letzten datierten Follow-up", () => {
    const f = fall({ followUps: [followUp({ date: "2021-01-10" })] });
    expect(BRUST_1_OAS.bewerte(f)).toEqual({ zeitTage: 731, ereignis: false, datum: "2021-01-10" });
  });

  // Ein Rezidiv ist für das Gesamtüberleben kein Ereignis. Wer nach einem
  // Rezidiv lebt, wird zensiert wie jeder andere Lebende.
  it("ignoriert ein Rezidiv", () => {
    const f = fall({ followUps: [followUp({ date: "2021-01-10", localStatus: "R" })] });
    expect(BRUST_1_OAS.bewerte(f)?.ereignis).toBe(false);
  });
});

describe("Nachschlagetabelle kennt Brust 1.0", () => {
  it("findet beide Regeln", () => {
    expect(boxRegelFuer("brust-1", "dfs")).toBe(BRUST_1_DFS);
    expect(boxRegelFuer("brust-1", "oas")).toBe(BRUST_1_OAS);
  });
});
