import { describe, expect, it } from "vitest";
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

describe("Brust 1.0, Ausschluss beim krankheitsfreien Überleben", () => {
  it("schließt einen unauffälligen Fall ein", () => {
    expect(BRUST_1_DFS.ausschluss(fall())).toBeNull();
  });

  it("schließt Fernmetastasen postoperativ aus", () => {
    const f = fall({ staging: { ...fall().staging, pM: "M1" } });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("postoperativNichtTumorfrei");
  });

  it("schließt einen positiven Randstatus aus", () => {
    const f = fall({ ausschlussFelder: { ...fall().ausschlussFelder, residualstatusLokal: "R1" } });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("postoperativNichtTumorfrei");
  });

  // RX heißt "nicht beurteilbar", nicht "positiv". Es schließt nicht aus.
  it("schließt einen unbeurteilbaren Randstatus nicht aus", () => {
    const f = fall({ ausschlussFelder: { ...fall().ausschlussFelder, residualstatusLokal: "RX" } });
    expect(BRUST_1_DFS.ausschluss(f)).toBeNull();
  });

  it("schließt eine relevante Krebsvorerkrankung aus", () => {
    const f = fall({ ausschlussFelder: { ...fall().ausschlussFelder, krebsvorerkrankung: "J" } });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("krebsvorerkrankung");
  });

  it("schließt einen Fall ohne datiertes Follow-up aus", () => {
    expect(BRUST_1_DFS.ausschluss(fall({ followUps: [] }))).toBe("keinFollowUp");
    expect(BRUST_1_DFS.ausschluss(fall({ followUps: [followUp({ date: null })] }))).toBe("keinFollowUp");
  });

  it("schließt einen Fall ohne Diagnosedatum aus", () => {
    expect(BRUST_1_DFS.ausschluss(fall({ diagnosisDate: null }))).toBe("keinDiagnosedatum");
  });
});

describe("Brust 1.0, Ausschluss beim Gesamtüberleben", () => {
  // Das OAS-Blatt zieht nur Fälle ohne gültiges Follow-up ab. Wer postoperativ
  // nicht tumorfrei war, bleibt hier drin: für das Gesamtüberleben ist das
  // keine Bedingung, sondern ein Merkmal.
  it("lässt einen postoperativ nicht tumorfreien Fall drin", () => {
    const f = fall({ staging: { ...fall().staging, pM: "M1" } });
    expect(BRUST_1_OAS.ausschluss(f)).toBeNull();
  });

  it("lässt eine relevante Krebsvorerkrankung drin", () => {
    const f = fall({ ausschlussFelder: { ...fall().ausschlussFelder, krebsvorerkrankung: "J" } });
    expect(BRUST_1_OAS.ausschluss(f)).toBeNull();
  });

  it("schließt einen Fall ohne datiertes Follow-up aus", () => {
    expect(BRUST_1_OAS.ausschluss(fall({ followUps: [] }))).toBe("keinFollowUp");
  });
});

describe("Brust 1.0, gültige Follow-up-Meldung", () => {
  // Das Auswertungsblatt führt über achtzehn Zeilen auf, was eine Meldung
  // gültig macht, und zieht Fälle ohne eine solche von der Risikomenge ab.
  // Ohne diese Prüfung stünden in der Kurve mehr Fälle, als das Zentrum meldet.
  it("nimmt eine vollständige Meldung eines Lebenden an", () => {
    expect(BRUST_1_DFS.ausschluss(fall())).toBeNull();
    expect(BRUST_1_OAS.ausschluss(fall())).toBeNull();
  });

  it("nimmt die zulässigen Statuswerte eines Lebenden an", () => {
    const f = fall({
      followUps: [
        followUp({ localStatus: "R", nodalStatus: "R", distantStatus: "M", overallStatus: "P", secondTumorRaw: "J" }),
      ],
    });
    expect(BRUST_1_DFS.ausschluss(f)).toBeNull();
  });

  // Die eine Seite der Asymmetrie: bei einem Lebenden ist "unbekannt"
  // unzulässig, die Box verlangt für wen sie noch beobachtet volle Angaben.
  it("weist bei einem Lebenden ein unbekanntes Statusfeld zurück", () => {
    const f = fall({ followUps: [followUp({ localStatus: "X" })] });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });

  it("weist bei einem Lebenden einen Wert außerhalb der Liste zurück", () => {
    const f = fall({ followUps: [followUp({ overallStatus: "CR" })] });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });

  // Die andere Seite: bei einem Verstorbenen sind Lücken erlaubt, dafür muss
  // ein Sterbedatum vorliegen.
  it("nimmt bei einem Verstorbenen unbekannte Statusfelder an", () => {
    const f = fall({
      deathDate: "2020-06-01",
      followUps: [
        followUp({ vitalStatus: "dead", localStatus: "X", nodalStatus: "X", distantStatus: "X", overallStatus: "X", secondTumorRaw: "X" }),
      ],
    });
    expect(BRUST_1_DFS.ausschluss(f)).toBeNull();
  });

  it("weist einen Verstorbenen ohne Sterbedatum zurück", () => {
    const f = fall({ deathDate: null, followUps: [followUp({ vitalStatus: "dead" })] });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });

  it("weist einen Lebenden mit Sterbedatum zurück", () => {
    const f = fall({ deathDate: "2020-06-01", followUps: [followUp({ vitalStatus: "alive" })] });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });

  // Ein Code, den das Prüfschema nicht kennt, kommt als null an. Er ist keine
  // Angabe und macht die Meldung ungültig, nicht "lebend".
  it("weist einen unbekannten Vitalstatus zurück", () => {
    const f = fall({ followUps: [followUp({ vitalStatus: null })] });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });

  // Eine gültige Meldung genügt, auch neben ungültigen.
  it("lässt einen Fall mit einer gültigen und einer ungültigen Meldung drin", () => {
    const f = fall({
      followUps: [followUp({ date: "2019-06-01", localStatus: "X" }), followUp({ date: "2020-01-10" })],
    });
    expect(BRUST_1_DFS.ausschluss(f)).toBeNull();
  });

  // Das OAS-Blatt verweist für die Gültigkeit auf die DFS-Definition.
  it("gilt beim Gesamtüberleben genauso", () => {
    const f = fall({ followUps: [followUp({ localStatus: "X" })] });
    expect(BRUST_1_OAS.ausschluss(f)).toBe("keinFollowUp");
  });

  // Das Blatt lässt für die Herkunft der Meldung K, Z und X zu, unabhängig
  // vom Vitalstatus: anders als bei den übrigen Feldern ist X hier keine
  // Ausnahme für Verstorbene, sondern von vornherein einer der drei Werte.
  it("nimmt jeden der drei zulässigen Herkunftscodes an", () => {
    for (const quelle of ["K", "Z", "X"]) {
      const f = fall({ followUps: [followUp({ quelleFollowUp: quelle })] });
      expect(BRUST_1_DFS.ausschluss(f)).toBeNull();
    }
  });

  it("weist eine Herkunft außerhalb der Liste zurück", () => {
    const f = fall({ followUps: [followUp({ quelleFollowUp: "Y" })] });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });

  // Fehlt die Herkunft, ist das keine der drei zulässigen Angaben. Die
  // Prüfung folgt hier der wörtlichen Lesart des Blatts, so wie sie auch die
  // übrigen vier Statusfelder für einen fehlenden Wert anwendet.
  it("weist eine fehlende Herkunft zurück", () => {
    const f = fall({ followUps: [followUp({ quelleFollowUp: null })] });
    expect(BRUST_1_DFS.ausschluss(f)).toBe("keinFollowUp");
  });
});
