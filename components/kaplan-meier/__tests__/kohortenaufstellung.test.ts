import { describe, expect, it } from "vitest";
import { kohortenaufstellung } from "../endpunkte/boxregeln/kohortenaufstellung";
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

describe("kohortenaufstellung", () => {
  it("zählt die Ausschlüsse je Grund und die Anzahl unter Risiko", () => {
    // Aufbau wie Abschnitt 1 des Blattes Kaplan-Meier (DFS): ein Fall je
    // Ausschlussgrund, dazu zwei, die in der Risikomenge bleiben.
    const faelle = [
      fall(),
      fall({ caseId: "2" }),
      fall({ caseId: "3", staging: { cT: null, cN: null, cM: null, pT: "pT1c", pN: "pN0", pM: "M1", grading: "G2" } }),
      fall({ caseId: "4", ausschlussFelder: { ...fall().ausschlussFelder, krebsvorerkrankung: "J" } }),
      fall({ caseId: "5", followUps: [] }),
    ];
    const a = kohortenaufstellung(faelle, BRUST_1_DFS);

    expect(a.primaerfaelle).toBe(5);
    expect(a.unterRisiko).toBe(2);
    expect(a.ausgeschlossen).toBe(3);
    expect(a.ausschluesse.map((z) => z.grund).sort()).toEqual(
      ["keinFollowUp", "krebsvorerkrankung", "postoperativNichtTumorfrei"],
    );
    // Die Anteile beziehen sich auf die Primärfälle, nicht auf die Ausschlüsse.
    expect(a.ausschluesse.every((z) => z.anteil === 1 / 5)).toBe(true);
  });

  it("die Aufteilung der Risikomenge geht ohne Rest auf", () => {
    const faelle = [fall(), fall({ caseId: "2", followUps: [] })];
    const a = kohortenaufstellung(faelle, BRUST_1_DFS);
    expect(a.mitEreignis + a.konkurrenzereignis + a.zensiertLebend
           + a.zensiertVerstorben + a.ohneBewertung).toBe(a.unterRisiko);
    expect(a.unterRisiko + a.ausgeschlossen).toBe(a.primaerfaelle);
  });

  it("zählt den Tod ohne Rezidiv als Ereignis, wie es das Blatt vorsieht", () => {
    // Kategorie C des Blattes Kaplan-Meier (DFS): kein Rezidivhinweis, aber
    // verstorben. Das Blatt gibt dafür eine Ereigniszeit an, keine
    // Zensierungszeit. An der Kurve ist dieser Fall von Kategorie A nicht zu
    // unterscheiden, beide tragen delta = 1.
    const faelle = [
      fall(),
      fall({ caseId: "2", deathDate: "2021-03-01",
             followUps: [followUp({ vitalStatus: "dead", date: "2021-03-01" })] }),
    ];
    const a = kohortenaufstellung(faelle, BRUST_1_DFS);
    expect(a.mitEreignis).toBe(1);
    expect(a.zensiertLebend).toBe(1);
    expect(a.zensiertVerstorben).toBe(0);
  });

  it("kennt beim Gesamtüberleben nur das Fehlen des Follow-ups als Grund", () => {
    // Abschnitt 1 des Blattes Kaplan-Meier (OAS) führt genau eine Zeile.
    const faelle = [
      fall(),
      fall({ caseId: "2", ausschlussFelder: { ...fall().ausschlussFelder, krebsvorerkrankung: "J" } }),
      fall({ caseId: "3", followUps: [] }),
    ];
    const a = kohortenaufstellung(faelle, BRUST_1_OAS);
    expect(a.unterRisiko).toBe(2);
    expect(a.ausschluesse.map((z) => z.grund)).toEqual(["keinFollowUp"]);
  });

  it("kommt mit einer leeren Kohorte aus, ohne durch null zu teilen", () => {
    const a = kohortenaufstellung([], BRUST_1_DFS);
    expect(a).toEqual({
      primaerfaelle: 0,
      ausschluesse: [],
      ausgeschlossen: 0,
      unterRisiko: 0,
      mitEreignis: 0,
      konkurrenzereignis: 0,
      zensiertLebend: 0,
      zensiertVerstorben: 0,
      ohneBewertung: 0,
    });
  });
});
