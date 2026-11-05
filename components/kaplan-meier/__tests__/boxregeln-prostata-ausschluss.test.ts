import { describe, expect, it } from "vitest";
import { PROSTATA_1_DFS, PROSTATA_1_OAS, falltyp } from "../endpunkte/boxregeln/prostata-1";
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

function mitFeldern(teile: Partial<OncoBoxCase["ausschlussFelder"]>): OncoBoxCase {
  return fall({ ausschlussFelder: { ...fall().ausschlussFelder, ...teile } });
}

describe("Prostata 1.0, Falltypen", () => {
  it("erkennt den interventionellen Fall", () => {
    expect(falltyp(fall())).toBe("IV");
  });

  // Der Zufallsbefund wird zuerst geprüft: er erfüllt auch die IV-Bedingung,
  // und wer ihn danach prüft, findet ihn nie.
  it("erkennt den Zufallsbefund vor dem interventionellen Fall", () => {
    expect(falltyp(mitFeldern({ opTyp: "RZE", zufallsbefund: "Y" }))).toBe("IF");
  });

  it("erkennt den nicht interventionellen Fall", () => {
    expect(falltyp(mitFeldern({ opTyp: null, therapieTyp: "AS", zufallsbefund: null }))).toBe("NI");
    expect(falltyp(mitFeldern({ opTyp: null, therapieTyp: "WS", zufallsbefund: null }))).toBe("NI");
  });

  it("liefert null, wenn keine Therapieangabe vorliegt", () => {
    expect(falltyp(mitFeldern({ opTyp: null, therapieTyp: null, zufallsbefund: null }))).toBeNull();
  });
});

describe("Prostata 1.0, postoperativ nicht tumorfrei", () => {
  it("schließt einen unauffälligen operierten Fall ein", () => {
    expect(PROSTATA_1_DFS.ausschluss(fall())).toBeNull();
  });

  it("schließt jeden nicht interventionellen Fall aus", () => {
    const f = mitFeldern({ opTyp: null, therapieTyp: "AS", zufallsbefund: null });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBe("postoperativNichtTumorfrei");
  });

  it("schließt einen operierten Fall mit positivem Randstatus aus", () => {
    expect(PROSTATA_1_DFS.ausschluss(mitFeldern({ residualstatusLokal: "R1" }))).toBe(
      "postoperativNichtTumorfrei",
    );
  });

  it("schließt einen operierten Fall mit Fernmetastasen aus", () => {
    const klinisch = fall({ staging: { ...fall().staging, cM: "M1b" } });
    expect(PROSTATA_1_DFS.ausschluss(klinisch)).toBe("postoperativNichtTumorfrei");
    const pathologisch = fall({ staging: { ...fall().staging, pM: "M1" } });
    expect(PROSTATA_1_DFS.ausschluss(pathologisch)).toBe("postoperativNichtTumorfrei");
  });

  it("schließt einen definitiv bestrahlten Fall mit Fernmetastasen aus", () => {
    const f = fall({
      staging: { ...fall().staging, cM: "M1a" },
      ausschlussFelder: {
        ...fall().ausschlussFelder,
        opTyp: null,
        bestrahlungsTyp: "P",
        bestrahlungsZeitpunkt: "D",
        bestrahlungsIntention: "C",
      },
    });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBe("postoperativNichtTumorfrei");
  });

  it("schließt einen palliativ bestrahlten Fall aus", () => {
    const f = mitFeldern({
      opTyp: null,
      bestrahlungsTyp: "LDR",
      bestrahlungsZeitpunkt: "D",
      bestrahlungsIntention: "P",
    });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBe("postoperativNichtTumorfrei");
  });

  it("schließt einen unbehandelten interventionellen Fall aus", () => {
    const f = mitFeldern({ opTyp: null, bestrahlungsTyp: null, therapieTyp: "CH" });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBe("postoperativNichtTumorfrei");
  });

  it("schließt einen Zufallsbefund mit Fernmetastasen aus", () => {
    const f = fall({
      staging: { ...fall().staging, pM: "M1c" },
      ausschlussFelder: { ...fall().ausschlussFelder, opTyp: "RZE", zufallsbefund: "Y" },
    });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBe("postoperativNichtTumorfrei");
  });

  it("lässt einen Zufallsbefund ohne Fernmetastasen drin", () => {
    const f = mitFeldern({ opTyp: "RZE", zufallsbefund: "Y" });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBeNull();
  });
});

describe("Prostata 1.0, die übrigen Kriterien", () => {
  it("schließt die relevante Krebsvorerkrankung aus", () => {
    expect(PROSTATA_1_DFS.ausschluss(mitFeldern({ krebsvorerkrankung: "10" }))).toBe(
      "krebsvorerkrankung",
    );
  });

  it("lässt andere Begleiterkrankungen drin", () => {
    expect(PROSTATA_1_DFS.ausschluss(mitFeldern({ krebsvorerkrankung: "12" }))).toBeNull();
  });

  it("schließt einen Fall ohne Follow-up aus", () => {
    expect(PROSTATA_1_DFS.ausschluss(fall({ followUps: [] }))).toBe("keinFollowUp");
  });

  // Bei Lebenden ist U unzulässig: die Box verlangt für wen sie noch
  // beobachtet vollständige Angaben.
  it("schließt einen Lebenden mit unbekanntem Status aus", () => {
    const f = fall({ followUps: [followUp({ localStatus: "U" })] });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });

  // Bei Verstorbenen ist U erlaubt, dafür muss ein Sterbedatum vorliegen.
  it("lässt einen Verstorbenen mit unbekanntem Status drin", () => {
    const f = fall({
      deathDate: "2021-03-01",
      followUps: [followUp({ vitalStatus: "dead", localStatus: "U", overallStatus: "U" })],
    });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBeNull();
  });

  it("schließt einen Verstorbenen ohne Sterbedatum aus", () => {
    const f = fall({ followUps: [followUp({ vitalStatus: "dead" })] });
    expect(PROSTATA_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });
});

describe("Prostata 1.0, Gesamtüberleben", () => {
  // Das OAS-Blatt zieht nur Fälle ohne gültige Meldung ab.
  it("lässt einen nicht tumorfreien Fall drin", () => {
    expect(PROSTATA_1_OAS.ausschluss(mitFeldern({ residualstatusLokal: "R2" }))).toBeNull();
  });

  it("schließt einen Fall ohne Follow-up aus", () => {
    expect(PROSTATA_1_OAS.ausschluss(fall({ followUps: [] }))).toBe("keinFollowUp");
  });
});
