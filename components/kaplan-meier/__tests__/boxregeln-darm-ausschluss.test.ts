import { describe, expect, it } from "vitest";
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

function mitFeldern(teile: Partial<OncoBoxCase["ausschlussFelder"]>): OncoBoxCase {
  return fall({ ausschlussFelder: { ...fall().ausschlussFelder, ...teile } });
}

describe("Darm 1.0, Ausschluss beim krankheitsfreien Überleben", () => {
  it("schließt einen unauffälligen Fall ein", () => {
    expect(DARM_1_DFS.ausschluss(fall())).toBeNull();
  });

  it("schließt einen Fall ohne UICC-Stadium aus", () => {
    expect(DARM_1_DFS.ausschluss(mitFeldern({ uiccStadium: "9" }))).toBe("keinUiccStadium");
    expect(DARM_1_DFS.ausschluss(mitFeldern({ uiccStadium: null }))).toBe("keinUiccStadium");
    expect(DARM_1_DFS.ausschluss(mitFeldern({ uiccStadium: "" }))).toBe("keinUiccStadium");
  });

  it("schließt UICC IV aus", () => {
    expect(DARM_1_DFS.ausschluss(mitFeldern({ uiccStadium: "4" }))).toBe("uiccVier");
  });

  it("schließt eine relevante Krebsvorerkrankung aus", () => {
    expect(DARM_1_DFS.ausschluss(mitFeldern({ krebsvorerkrankung: "1" }))).toBe("krebsvorerkrankung");
  });

  // 9 heißt unbekannt, nicht ja. Es schließt nicht aus.
  it("schließt eine unbekannte Vorerkrankung nicht aus", () => {
    expect(DARM_1_DFS.ausschluss(mitFeldern({ krebsvorerkrankung: "9" }))).toBeNull();
  });

  it("schließt einen synchron behandelten weiteren Primärtumor aus", () => {
    expect(DARM_1_DFS.ausschluss(mitFeldern({ synchronerPrimaertumor: "1" }))).toBe("synchronerPrimaertumor");
  });

  it("schließt eine fehlende Vollremission aus", () => {
    expect(DARM_1_DFS.ausschluss(mitFeldern({ residualstatusGesamt: "R1" }))).toBe("keineVollremission");
    expect(DARM_1_DFS.ausschluss(mitFeldern({ residualstatusGesamt: "R2" }))).toBe("keineVollremission");
  });

  it("schließt postoperative Fernmetastasen aus", () => {
    const f = fall({ staging: { ...fall().staging, pM: "M1a" } });
    expect(DARM_1_DFS.ausschluss(f)).toBe("keineVollremission");
  });

  // 30-Tage-Mortalität nach dem Blatt KB-19: verstorben innerhalb von 30 Tagen
  // nach der operativen Tumorentfernung.
  it("schließt einen postoperativ Verstorbenen aus", () => {
    const f = fall({ followUps: [followUp({ date: "2019-03-05", vitalStatus: "dead" })] });
    expect(DARM_1_DFS.ausschluss(f)).toBe("postoperativVerstorben");
  });

  it("schließt einen später Verstorbenen nicht aus", () => {
    const f = fall({ followUps: [followUp({ date: "2019-06-01", vitalStatus: "dead" })] });
    expect(DARM_1_DFS.ausschluss(f)).toBeNull();
  });

  it("schließt einen Fall ohne Follow-up-Meldung aus", () => {
    expect(DARM_1_DFS.ausschluss(fall({ followUps: [] }))).toBe("keinFollowUp");
  });

  // "Nur mit Life-Status" heißt: Vitalstatus da, aber kein einziges
  // Rezidivfeld gefüllt. Aus so einer Meldung lässt sich kein DFS ableiten.
  it("schließt eine Meldung nur mit Life-Status aus", () => {
    const f = fall({
      followUps: [
        followUp({ localStatus: null, nodalStatus: null, distantStatus: null, secondTumorRaw: null }),
      ],
    });
    expect(DARM_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });
});

describe("Darm 1.0, Ausschluss beim Gesamtüberleben", () => {
  it("lässt UICC IV drin", () => {
    expect(DARM_1_OAS.ausschluss(mitFeldern({ uiccStadium: "4" }))).toBeNull();
  });

  it("lässt eine fehlende Vollremission drin", () => {
    expect(DARM_1_OAS.ausschluss(mitFeldern({ residualstatusGesamt: "R2" }))).toBeNull();
  });

  it("schließt einen Fall ohne Follow-up-Meldung aus", () => {
    expect(DARM_1_OAS.ausschluss(fall({ followUps: [] }))).toBe("keinFollowUp");
  });
});
