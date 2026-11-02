import { describe, expect, it } from "vitest";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import { PROSTATA_1_DFS, PROSTATA_1_OAS } from "../endpunkte/boxregeln/prostata-1";
import type { OncoBoxCase, OncoBoxFollowUp } from "../oncobox/types";

function followUp(teile: Partial<OncoBoxFollowUp> = {}): OncoBoxFollowUp {
  return {
    date: "2020-01-10",
    vitalStatus: "alive",
    localStatus: "N",
    nodalStatus: null,
    distantStatus: "N",
    overallStatus: "CR",
    secondTumor: false,
    secondTumorRaw: "N",
    quelleFollowUp: null,
    localRecurrenceDate: null,
    biochemicalRecurrence: "N",
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
    centerType: null,
    icd10: "C61",
    icdIsTopography: false,
    side: null,
    diagnosisDate: "2019-01-10",
    ageAtDiagnosis: 64,
    gender: "M",
    deathDate: null,
    deathTumorRelated: null,
    staging: { cT: "T2a", cN: "N0", cM: "M0", pT: "T2c", pN: "N0", pM: "M0", grading: null },
    followUps: [followUp()],
    distantMets: [],
    ausschlussFelder: {
      residualstatusLokal: "R0",
      residualstatusGesamt: null,
      krebsvorerkrankung: "0",
      uiccStadium: null,
      synchronerPrimaertumor: null,
      opDatum: "2019-02-01",
      opTyp: "RPE",
      bestrahlungsTyp: null,
      bestrahlungsZeitpunkt: null,
      bestrahlungsIntention: null,
      therapieTyp: null,
      zufallsbefund: "N",
    },
    ...teile,
  };
}

describe("Prostata 1.0, Kategorie A", () => {
  // Der Unterschied zu Brust und Darm: die Zeit läuft bis zum eigenen
  // Ereignisdatum, nicht bis zum Untersuchungsdatum.
  it("nimmt das eigene Rezidivdatum statt des Follow-up-Datums", () => {
    const f = fall({
      followUps: [followUp({ localStatus: "R", localRecurrenceDate: "2019-11-20" })],
    });
    expect(PROSTATA_1_DFS.bewerte(f)).toEqual({
      zeitTage: 314,
      ereignis: true,
      datum: "2019-11-20",
    });
  });

  // Das biochemische Rezidiv kennt keine andere Box. Es tritt meist deutlich
  // vor einem sichtbaren Rezidiv auf und muss deshalb mitzählen.
  it("wertet das biochemische Rezidiv als Ereignis", () => {
    const f = fall({
      followUps: [
        followUp({ biochemicalRecurrence: "Y", biochemicalRecurrenceDate: "2019-09-15" }),
      ],
    });
    expect(PROSTATA_1_DFS.bewerte(f)).toEqual({
      zeitTage: 248,
      ereignis: true,
      datum: "2019-09-15",
    });
  });

  it("nimmt das früheste der eigenen Ereignisdaten", () => {
    const f = fall({
      followUps: [
        followUp({
          localStatus: "R",
          localRecurrenceDate: "2019-11-20",
          biochemicalRecurrence: "Y",
          biochemicalRecurrenceDate: "2019-09-15",
        }),
      ],
    });
    expect(PROSTATA_1_DFS.bewerte(f)?.datum).toBe("2019-09-15");
  });

  it("fällt ohne eigenes Datum auf das Follow-up-Datum zurück", () => {
    const f = fall({ followUps: [followUp({ localStatus: "R" })] });
    expect(PROSTATA_1_DFS.bewerte(f)?.datum).toBe("2020-01-10");
  });

  it("wertet eine Metastase als Ereignis", () => {
    const f = fall({
      followUps: [followUp({ distantStatus: "R", distantMetastasisDate: "2019-12-01" })],
    });
    expect(PROSTATA_1_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  it("wertet einen Zweittumor als Ereignis", () => {
    const f = fall({ followUps: [followUp({ secondTumorRaw: "Y", secondTumor: true })] });
    expect(PROSTATA_1_DFS.bewerte(f)?.ereignis).toBe(true);
  });
});

describe("Prostata 1.0, Kategorien B und C", () => {
  it("zensiert am letzten gültigen Follow-up", () => {
    const f = fall({
      followUps: [followUp({ date: "2019-07-10" }), followUp({ date: "2021-01-10" })],
    });
    expect(PROSTATA_1_DFS.bewerte(f)).toEqual({
      zeitTage: 731,
      ereignis: false,
      datum: "2021-01-10",
    });
  });

  it("wertet den Tod ohne Rezidiv als Ereignis am Sterbedatum", () => {
    const f = fall({
      deathDate: "2021-03-01",
      followUps: [followUp({ date: "2020-12-01", vitalStatus: "dead" })],
    });
    expect(PROSTATA_1_DFS.bewerte(f)).toEqual({
      zeitTage: 781,
      ereignis: true,
      datum: "2021-03-01",
    });
  });
});

describe("Prostata 1.0, Gesamtüberleben", () => {
  it("wertet den Tod als Ereignis am Sterbedatum", () => {
    const f = fall({ deathDate: "2021-03-01" });
    expect(PROSTATA_1_OAS.bewerte(f)?.ereignis).toBe(true);
  });

  it("ignoriert ein biochemisches Rezidiv", () => {
    const f = fall({ followUps: [followUp({ date: "2021-01-10", biochemicalRecurrence: "Y" })] });
    expect(PROSTATA_1_OAS.bewerte(f)?.ereignis).toBe(false);
  });
});

describe("Nachschlagetabelle kennt Prostata 1.0", () => {
  it("findet beide Regeln", () => {
    expect(boxRegelFuer("prostata-1", "dfs")).toBe(PROSTATA_1_DFS);
    expect(boxRegelFuer("prostata-1", "oas")).toBe(PROSTATA_1_OAS);
  });
});
