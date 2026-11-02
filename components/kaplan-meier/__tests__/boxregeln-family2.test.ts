import { describe, expect, it } from "vitest";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import { FAMILY_2_DFS, FAMILY_2_OAS } from "../endpunkte/boxregeln/family-2";
import type { OncoBoxCase, OncoBoxFollowUp } from "../oncobox/types";

function followUp(teile: Partial<OncoBoxFollowUp> = {}): OncoBoxFollowUp {
  return {
    date: "2020-01-10",
    vitalStatus: "alive",
    localStatus: "K",
    nodalStatus: "K",
    distantStatus: "K",
    overallStatus: "V",
    secondTumor: false,
    secondTumorRaw: "N",
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
    caseId: "1.1",
    isPrimary: true,
    isCenterCase: true,
    centerType: null,
    icd10: "C50.4",
    icdIsTopography: false,
    side: "L",
    diagnosisDate: "2019-01-10",
    ageAtDiagnosis: 62,
    gender: "W",
    deathDate: null,
    deathTumorRelated: null,
    staging: { cT: null, cN: null, cM: null, pT: null, pN: null, pM: null, grading: null },
    followUps: [followUp()],
    distantMets: [],
    ausschlussFelder: {
      residualstatusLokal: null,
      residualstatusGesamt: "R0",
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
    ...teile,
  };
}

describe("Familie 2.0, Einschluss", () => {
  it("schließt einen Fall mit R0 ein", () => {
    expect(FAMILY_2_DFS.ausschluss(fall())).toBeNull();
  });

  // Der zweite Zweig der EQ-Definition: kein R0, aber das erste Follow-up
  // weist Vollremission ohne Nachweis in allen drei Feldern aus.
  it("schließt einen Fall ohne R0 ein, wenn das erste Follow-up tumorfrei ist", () => {
    const f = fall({
      ausschlussFelder: { ...fall().ausschlussFelder, residualstatusGesamt: "R1" },
    });
    expect(FAMILY_2_DFS.ausschluss(f)).toBeNull();
  });

  it("schließt einen Fall aus, der weder R0 noch je tumorfrei war", () => {
    const f = fall({
      ausschlussFelder: { ...fall().ausschlussFelder, residualstatusGesamt: "R2" },
      followUps: [followUp({ overallStatus: "P", localStatus: "R" })],
    });
    expect(FAMILY_2_DFS.ausschluss(f)).toBe("postoperativNichtTumorfrei");
  });

  it("schließt einen Fall ohne Follow-up aus", () => {
    expect(FAMILY_2_DFS.ausschluss(fall({ followUps: [] }))).toBe("keinFollowUp");
  });
});

describe("Familie 2.0, Ereignis", () => {
  it("wertet ein lokales Rezidiv als Ereignis", () => {
    const f = fall({
      followUps: [
        followUp({ date: "2019-07-10" }),
        followUp({ date: "2020-01-10", localStatus: "R" }),
      ],
    });
    expect(FAMILY_2_DFS.bewerte(f)).toEqual({ zeitTage: 365, ereignis: true, datum: "2020-01-10" });
  });

  it("wertet eine Progression in der Gesamtbeurteilung als Ereignis", () => {
    const f = fall({ followUps: [followUp({ overallStatus: "P" })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  it("wertet einen Zweittumor als Ereignis", () => {
    const f = fall({ followUps: [followUp({ secondTumorRaw: "J", secondTumor: true })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  it("zensiert am letzten tumorfreien Follow-up", () => {
    const f = fall({
      followUps: [followUp({ date: "2019-07-10" }), followUp({ date: "2021-01-10" })],
    });
    expect(FAMILY_2_DFS.bewerte(f)).toEqual({ zeitTage: 731, ereignis: false, datum: "2021-01-10" });
  });

  it("wertet den Tod ohne Rezidiv als Ereignis am Sterbedatum", () => {
    const f = fall({ deathDate: "2021-03-01" });
    expect(FAMILY_2_DFS.bewerte(f)).toEqual({ zeitTage: 781, ereignis: true, datum: "2021-03-01" });
  });
});

describe("Familie 2.0, der Wert U", () => {
  // Unbekannt ist weder sauber noch ein Ereignis. Die Meldung wird
  // übersprungen, statt sie in eine der beiden Richtungen zu deuten.
  it("überspringt eine Meldung mit unbekanntem Status", () => {
    const f = fall({
      followUps: [
        followUp({ date: "2019-07-10" }),
        followUp({ date: "2020-01-10", distantStatus: "U" }),
        followUp({ date: "2021-01-10" }),
      ],
    });
    expect(FAMILY_2_DFS.bewerte(f)).toEqual({ zeitTage: 731, ereignis: false, datum: "2021-01-10" });
  });

  it("zensiert an der letzten aussagekräftigen Meldung", () => {
    const f = fall({
      followUps: [
        followUp({ date: "2019-07-10" }),
        followUp({ date: "2021-01-10", distantStatus: "U" }),
      ],
    });
    expect(FAMILY_2_DFS.bewerte(f)?.datum).toBe("2019-07-10");
  });

  // Ein R schlägt ein U: wo ein Rezidiv steht, ist die Meldung eindeutig,
  // auch wenn ein anderes Feld unbekannt ist.
  it("lässt ein Rezidiv trotz unbekanntem Nachbarfeld gelten", () => {
    const f = fall({ followUps: [followUp({ localStatus: "R", distantStatus: "U" })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });
});

describe("Familie 2.0, weitere Codes des Prüfschemas", () => {
  // Y benennt in der Gesamtbeurteilung ein Rezidiv und ist damit ein
  // eindeutiger Befund wie ein R in einem Statusfeld.
  it("wertet ein Rezidiv in der Gesamtbeurteilung als Ereignis", () => {
    const f = fall({ followUps: [followUp({ overallStatus: "Y" })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  // T (Teilremission) ist kein benannter Befund wie P oder Y, aber die
  // Meldung trägt eine Aussage und weicht von der Tumorfreiheit ab.
  it("wertet eine Teilremission in der Gesamtbeurteilung als Ereignis", () => {
    const f = fall({ followUps: [followUp({ overallStatus: "T" })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  // K bedeutet in der Gesamtbeurteilung "keine Änderung" (stable disease),
  // nicht "kein Nachweis" wie in den drei Statusfeldern. Beide Bedeutungen
  // stammen unverändert aus dem OBDS; hier zählt K wie jeder Code ausser V.
  it("wertet keine Änderung in der Gesamtbeurteilung als Ereignis", () => {
    const f = fall({ followUps: [followUp({ overallStatus: "K" })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  // D (divergentes Geschehen) weicht wie T von der Tumorfreiheit ab.
  it("wertet ein divergentes Geschehen in der Gesamtbeurteilung als Ereignis", () => {
    const f = fall({ followUps: [followUp({ overallStatus: "D" })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  // B (klinische Besserung, aber Teilremissionskriterien nicht erfüllt)
  // erfüllt die Teilremissionskriterien gerade nicht und ist damit ein
  // Ereignis wie T.
  it("wertet eine klinische Besserung ohne Teilremission als Ereignis", () => {
    const f = fall({ followUps: [followUp({ overallStatus: "B" })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  // R trägt "Vollremission" im Namen, schliesst residuale Auffälligkeiten
  // aber ausdrücklich ein und zählt deshalb nicht als tumorfrei.
  it("wertet eine Vollremission mit residualen Auffälligkeiten als Ereignis", () => {
    const f = fall({ followUps: [followUp({ overallStatus: "R" })] });
    expect(FAMILY_2_DFS.bewerte(f)?.ereignis).toBe(true);
  });

  // F (fraglicher Befund) ist wie U ohne Aussagekraft und wird übersprungen,
  // nicht als Ereignis gewertet.
  it("überspringt einen fraglichen Befund wie einen unbekannten Status", () => {
    const f = fall({
      followUps: [
        followUp({ date: "2019-07-10" }),
        followUp({ date: "2020-01-10", localStatus: "F" }),
        followUp({ date: "2021-01-10" }),
      ],
    });
    expect(FAMILY_2_DFS.bewerte(f)).toEqual({ zeitTage: 731, ereignis: false, datum: "2021-01-10" });
  });
});

describe("Familie 2.0, Gesamtüberleben", () => {
  it("wertet den Tod als Ereignis", () => {
    const f = fall({ deathDate: "2021-03-01" });
    expect(FAMILY_2_OAS.bewerte(f)?.ereignis).toBe(true);
  });

  it("lässt einen nie tumorfreien Fall drin", () => {
    const f = fall({
      ausschlussFelder: { ...fall().ausschlussFelder, residualstatusGesamt: "R2" },
      followUps: [followUp({ overallStatus: "P", localStatus: "R" })],
    });
    expect(FAMILY_2_OAS.ausschluss(f)).toBeNull();
  });
});

describe("Die Herkunft ist gekennzeichnet", () => {
  // Die 2.0-Boxen schreiben keine Kurve vor. Das darf die Oberfläche nicht
  // verschweigen, sonst sieht die Kurve aus wie eine Vorgabe des Zertifizierers.
  it("weist die Regel als abgeleitet aus", () => {
    expect(FAMILY_2_DFS.herkunft).toBe("abgeleitet");
    expect(FAMILY_2_OAS.herkunft).toBe("abgeleitet");
  });

  it("nennt das Blatt, aus dem die Ereignisdefinition stammt", () => {
    expect(FAMILY_2_DFS.quelle).toContain("EQ Kategorien");
  });
});

describe("Nachschlagetabelle kennt Familie 2.0", () => {
  it("findet beide Regeln", () => {
    expect(boxRegelFuer("family-2", "dfs")).toBe(FAMILY_2_DFS);
    expect(boxRegelFuer("family-2", "oas")).toBe(FAMILY_2_OAS);
  });
});
