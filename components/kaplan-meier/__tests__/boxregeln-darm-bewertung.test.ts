import { describe, expect, it } from "vitest";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import { DARM_1_DFS, DARM_1_OAS } from "../endpunkte/boxregeln/darm-1";
import type { OncoBoxCase, OncoBoxFollowUp } from "../oncobox/types";

function followUp(teile: Partial<OncoBoxFollowUp> = {}): OncoBoxFollowUp {
  return {
    date: "2020-02-01",
    vitalStatus: "alive",
    localStatus: "0",
    nodalStatus: "0",
    distantStatus: "0",
    overallStatus: null,
    secondTumor: false,
    secondTumorRaw: "0",
    quelleFollowUp: null,
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
    isPrimary: null,
    isCenterCase: true,
    centerType: "DZ",
    icd10: "C18.7",
    icdIsTopography: true,
    side: null,
    diagnosisDate: "2019-02-01",
    ageAtDiagnosis: 64,
    gender: "M",
    deathDate: null,
    deathTumorRelated: null,
    staging: { cT: null, cN: null, cM: null, pT: "pT3", pN: "pN1", pM: "M0", grading: "G2" },
    followUps: [followUp()],
    distantMets: [],
    ausschlussFelder: {
      residualstatusLokal: "R0",
      residualstatusGesamt: "R0",
      krebsvorerkrankung: "0",
      uiccStadium: "3",
      synchronerPrimaertumor: "0",
      opDatum: "2019-02-20",
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

describe("Darm 1.0, Kategorie A", () => {
  it("wertet das erste Follow-up mit einem Rezidivfeld gleich 1 als Ereignis", () => {
    const f = fall({
      followUps: [
        followUp({ date: "2019-08-01" }),
        followUp({ date: "2020-02-01", localStatus: "1" }),
      ],
    });
    expect(DARM_1_DFS.bewerte(f)).toEqual({ zeitTage: 365, ereignis: true, datum: "2020-02-01" });
  });

  it("wertet Fernmetastasen als Ereignis", () => {
    const f = fall({ followUps: [followUp({ distantStatus: "1" })] });
    expect(DARM_1_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  it("wertet einen Zweittumor als Ereignis", () => {
    const f = fall({ followUps: [followUp({ secondTumorRaw: "1", secondTumor: true })] });
    expect(DARM_1_DFS.bewerte(f)?.ereignis).toBe(true);
  });
});

describe("Darm 1.0, Kategorie B", () => {
  it("zensiert am letzten Follow-up ohne Befund", () => {
    const f = fall({
      followUps: [followUp({ date: "2019-08-01" }), followUp({ date: "2021-02-01" })],
    });
    expect(DARM_1_DFS.bewerte(f)).toEqual({ zeitTage: 731, ereignis: false, datum: "2021-02-01" });
  });
});

describe("Darm 1.0, Kategorie C", () => {
  // Das Blatt DFS II nennt den Tod ausdrücklich unter den Ereignissen. Darm
  // rechnet dabei bis zum Follow-up-Datum, weil der Tod in Q6 gemeldet wird
  // und die Box kein eigenes Sterbedatum führt.
  it("wertet den Tod ohne Rezidiv als Ereignis am Follow-up-Datum", () => {
    const f = fall({ followUps: [followUp({ date: "2021-02-01", vitalStatus: "dead" })] });
    expect(DARM_1_DFS.bewerte(f)).toEqual({ zeitTage: 731, ereignis: true, datum: "2021-02-01" });
  });
});

describe("Darm 1.0, der Wert 2", () => {
  // Kategorie A verlangt 1, B verlangt 0, C verlangt weder 1 noch 2. Ein Fall
  // mit einer 2 trifft keine der drei. Er fällt heraus, statt einer Kategorie
  // zugeschlagen zu werden, die die Spezifikation nicht hergibt.
  it("liefert null für einen Fall, den keine Kategorie trifft", () => {
    const f = fall({ followUps: [followUp({ localStatus: "2" })] });
    expect(DARM_1_DFS.bewerte(f)).toBeNull();
  });

  it("lässt eine 2 hinter einem Ereignis unbeachtet", () => {
    const f = fall({
      followUps: [
        followUp({ date: "2019-08-01", localStatus: "1" }),
        followUp({ date: "2020-02-01", localStatus: "2" }),
      ],
    });
    expect(DARM_1_DFS.bewerte(f)?.datum).toBe("2019-08-01");
  });
});

describe("Darm 1.0, Gesamtüberleben", () => {
  it("wertet den Tod als Ereignis am Follow-up-Datum", () => {
    const f = fall({ followUps: [followUp({ date: "2021-02-01", vitalStatus: "dead" })] });
    expect(DARM_1_OAS.bewerte(f)).toEqual({ zeitTage: 731, ereignis: true, datum: "2021-02-01" });
  });

  it("zensiert Lebende am letzten Follow-up", () => {
    const f = fall({ followUps: [followUp({ date: "2021-02-01" })] });
    expect(DARM_1_OAS.bewerte(f)?.ereignis).toBe(false);
  });

  it("ignoriert ein Rezidiv", () => {
    const f = fall({ followUps: [followUp({ date: "2021-02-01", localStatus: "1" })] });
    expect(DARM_1_OAS.bewerte(f)?.ereignis).toBe(false);
  });
});

describe("Nachschlagetabelle kennt Darm 1.0", () => {
  it("findet beide Regeln", () => {
    expect(boxRegelFuer("darm-1", "dfs")).toBe(DARM_1_DFS);
    expect(boxRegelFuer("darm-1", "oas")).toBe(DARM_1_OAS);
  });
});
