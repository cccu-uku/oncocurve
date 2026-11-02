import { describe, expect, it } from "vitest";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import type { EndpunktId } from "../endpunkte/typen";
import type { OncoBoxCase, OncoBoxFollowUp } from "../oncobox/types";

const MIT_PROGRESSION = ["prostata-1", "family-2"];
const OHNE_PROGRESSION = ["brust-1", "darm-1"];
const ALLE = [...OHNE_PROGRESSION, ...MIT_PROGRESSION];

// Generischer Fall, der keine boxspezifischen Ausschlussfelder braucht: die
// fünf übrigen Endpunkte prüfen nur Diagnosedatum, Follow-ups und ihre
// eigenen Verlaufscodes, anders als DFS und OAS.
function followUp(teile: Partial<OncoBoxFollowUp> = {}): OncoBoxFollowUp {
  return {
    date: "2020-01-10",
    vitalStatus: "alive",
    localStatus: null,
    nodalStatus: null,
    distantStatus: null,
    overallStatus: null,
    secondTumor: null,
    secondTumorRaw: null,
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
    isPrimary: true,
    isCenterCase: true,
    centerType: null,
    icd10: null,
    icdIsTopography: false,
    side: null,
    diagnosisDate: "2019-01-10",
    ageAtDiagnosis: null,
    gender: "W",
    deathDate: null,
    deathTumorRelated: null,
    staging: { cT: null, cN: null, cM: null, pT: null, pN: null, pM: null, grading: null },
    followUps: [followUp()],
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
    ...teile,
  };
}

describe("Jede Box rechnet die drei rezidivbezogenen Endpunkte", () => {
  it.each(ALLE)("%s trägt LRR, LRFS und MFS", (box) => {
    for (const id of ["lrr", "lrfs", "mfs"] as EndpunktId[]) {
      const regel = boxRegelFuer(box, id);
      expect(regel, `${box}/${id}`).not.toBeNull();
      expect(regel!.id).toBe(`${box}/${id}`);
    }
  });

  // Die Lokalrezidivrate ist der einzige Endpunkt mit dem anderen Schätzer.
  it.each(ALLE)("%s rechnet LRR als kumulative Inzidenz", (box) => {
    expect(boxRegelFuer(box, "lrr")!.schaetzer).toBe("kumulativeInzidenz");
    expect(boxRegelFuer(box, "lrfs")!.schaetzer).toBe("kaplanMeier");
  });

  it.each(ALLE)("%s weist die fünf Endpunkte als aus der Literatur aus", (box) => {
    expect(boxRegelFuer(box, "lrr")!.herkunft).toBe("literatur");
  });
});

describe("Progression nur, wo die Box sie führt", () => {
  // Lücke der Box, keine Umsetzungslücke: Brust 1.0 führt in der
  // Gesamtbeurteilung zwar den Wert P, seine Kategorien nutzen ihn aber nicht,
  // und Darm 1.0 hat das Feld gar nicht.
  it.each(OHNE_PROGRESSION)("%s bietet weder PFS noch PPS an", (box) => {
    expect(boxRegelFuer(box, "pfs")).toBeNull();
    expect(boxRegelFuer(box, "pps")).toBeNull();
  });

  it.each(MIT_PROGRESSION)("%s bietet PFS und PPS an", (box) => {
    expect(boxRegelFuer(box, "pfs")).not.toBeNull();
    expect(boxRegelFuer(box, "pps")).not.toBeNull();
  });
});

describe("Die Codes je Box werden richtig gelesen", () => {
  // Brust codiert den Nachweis mit R, Darm mit 1. Dieselbe Frage, zwei
  // Schreibweisen; genau deshalb gibt es die Codetabelle.
  it("liest bei Brust den Buchstaben, bei Darm die Ziffer", async () => {
    const { BRUST_1_LRR, BRUST_1_LRFS } = await import("../endpunkte/boxregeln/brust-1");
    const { DARM_1_LRR, DARM_1_LRFS } = await import("../endpunkte/boxregeln/darm-1");
    expect(BRUST_1_LRFS.id).toBe("brust-1/lrfs");
    expect(DARM_1_LRFS.id).toBe("darm-1/lrfs");

    expect(BRUST_1_LRR.bewerte(fall({ followUps: [followUp({ localStatus: "R" })] }))?.ereignis).toBe(true);
    expect(DARM_1_LRR.bewerte(fall({ followUps: [followUp({ localStatus: "1" })] }))?.ereignis).toBe(true);
    // Der Code der jeweils anderen Box löst nichts aus: Ziffer bei Brust,
    // Buchstabe bei Darm sind kein Treffer.
    expect(BRUST_1_LRR.bewerte(fall({ followUps: [followUp({ localStatus: "1" })] }))?.ereignis).toBe(false);
    expect(DARM_1_LRR.bewerte(fall({ followUps: [followUp({ localStatus: "R" })] }))?.ereignis).toBe(false);
  });

  it("wertet bei Prostata das biochemische Rezidiv zusätzlich als Ereignis", async () => {
    const { PROSTATA_1_LRR } = await import("../endpunkte/boxregeln/prostata-1");
    const f = fall({ followUps: [followUp({ biochemicalRecurrence: "Y" })] });
    expect(PROSTATA_1_LRR.bewerte(f)?.ereignis).toBe(true);
  });

  it("liest PFS den Progressionscode P aus der Gesamtbeurteilung, bei Prostata wie bei Familie 2.0", async () => {
    const { PROSTATA_1_PFS } = await import("../endpunkte/boxregeln/prostata-1");
    const { FAMILY_2_PFS } = await import("../endpunkte/boxregeln/family-2");
    const f = fall({ followUps: [followUp({ overallStatus: "P" })] });
    expect(PROSTATA_1_PFS.bewerte(f)?.ereignis).toBe(true);
    expect(FAMILY_2_PFS.bewerte(f)?.ereignis).toBe(true);
  });
});

describe("PPS beginnt bei der Progression", () => {
  it("schließt einen Fall ohne Progression aus", async () => {
    const { PROSTATA_1_PPS } = await import("../endpunkte/boxregeln/prostata-1");
    expect(PROSTATA_1_PPS.ausschluss(fall())).toBe("keineProgression");
  });

  it("rechnet die Zeit ab dem Progressionsdatum, nicht ab der Diagnose", async () => {
    const { PROSTATA_1_PPS } = await import("../endpunkte/boxregeln/prostata-1");
    const f = fall({
      deathDate: "2019-12-01",
      followUps: [
        followUp({ date: "2019-06-01", overallStatus: "P" }),
        followUp({ date: "2019-08-01" }),
      ],
    });
    expect(PROSTATA_1_PPS.bewerte(f)).toEqual({ zeitTage: 183, ereignis: true, datum: "2019-12-01" });
  });
});

describe("Der Tod ist bei der Lokalrezidivrate ein konkurrierendes Ereignis", () => {
  it("markiert einen Tod ohne Rezidiv als Konkurrenz, nicht als Zensierung", async () => {
    const { BRUST_1_LRR, BRUST_1_LRFS } = await import("../endpunkte/boxregeln/brust-1");
    const f = fall({
      deathDate: "2019-07-01",
      followUps: [followUp({ date: "2019-06-01" })],
    });
    expect(BRUST_1_LRR.bewerte(f)).toEqual({
      zeitTage: 172,
      ereignis: false,
      datum: "2019-07-01",
      konkurrenz: true,
    });
    // Bei LRFS zählt derselbe Tod als Ereignis: dort ist der Schätzer
    // Kaplan-Meier, der keine konkurrierenden Ereignisse kennt.
    expect(BRUST_1_LRFS.bewerte(f)?.ereignis).toBe(true);
  });
});

describe("Darm 1.0 meldet den Tod im Verlauf, nicht am Fall", () => {
  // Das Prüfschema der Box führt weder am Patienten noch am Fall ein
  // Sterbedatum: der Tod steht als Vitalstatus im Follow-up. Solange die
  // Fabrik allein fall.deathDate las, war der Tod für Darm unsichtbar, und
  // drei Endpunkte fielen um die gesamte Sterblichkeit der Kohorte zu
  // günstig aus.
  const gestorben = () =>
    fall({
      deathDate: null,
      followUps: [
        followUp({ date: "2019-06-01" }),
        followUp({ date: "2019-12-01", vitalStatus: "dead" }),
      ],
    });

  it("wertet den Tod ohne Rezidiv bei LRFS als Ereignis", async () => {
    const { DARM_1_LRFS } = await import("../endpunkte/boxregeln/darm-1");
    expect(DARM_1_LRFS.bewerte(gestorben())).toEqual({
      zeitTage: 325,
      ereignis: true,
      datum: "2019-12-01",
    });
  });

  it("wertet denselben Tod bei MFS als Ereignis", async () => {
    const { DARM_1_MFS } = await import("../endpunkte/boxregeln/darm-1");
    expect(DARM_1_MFS.bewerte(gestorben())?.ereignis).toBe(true);
  });

  it("wertet denselben Tod bei LRR als konkurrierendes Ereignis", async () => {
    const { DARM_1_LRR } = await import("../endpunkte/boxregeln/darm-1");
    expect(DARM_1_LRR.bewerte(gestorben())).toEqual({
      zeitTage: 325,
      ereignis: false,
      datum: "2019-12-01",
      konkurrenz: true,
    });
  });

  // Ein Rezidiv vor dem Tod bleibt das Ereignis von Interesse.
  it("lässt das frühere Rezidiv vor dem späteren Tod gelten", async () => {
    const { DARM_1_LRR } = await import("../endpunkte/boxregeln/darm-1");
    const f = fall({
      deathDate: null,
      followUps: [
        followUp({ date: "2019-06-01", localStatus: "1" }),
        followUp({ date: "2019-12-01", vitalStatus: "dead" }),
      ],
    });
    expect(DARM_1_LRR.bewerte(f)?.ereignis).toBe(true);
  });

  // Brust führt ein Sterbedatum am Fall und darf den Vitalstatus im Verlauf
  // nicht ersatzweise heranziehen: dort steht er ohne Datum des Todes.
  it("gilt nicht für Brust, das ein Sterbedatum am Fall führt", async () => {
    const { BRUST_1_LRFS } = await import("../endpunkte/boxregeln/brust-1");
    expect(BRUST_1_LRFS.bewerte(gestorben())?.ereignis).toBe(false);
  });
});
