import { describe, expect, it } from "vitest";
import { kohorteFuerEndpunkt, schaetzerFuer } from "../endpunkte/anwenden";
import { ENDPUNKTE, endpunktById } from "../endpunkte/registry";
import { pruefeVerfuegbarkeit } from "../endpunkte/verfuegbarkeit";
import type { Patient } from "../obds-parser-new";

function patient(teile: Record<string, unknown> = {}): Patient {
  return {
    id: "1",
    survivalTime: 24,
    event: false,
    diagnosisDate: "2019-01-10",
    ...teile,
  } as unknown as Patient;
}

describe("Jeder Endpunkt hat eine Regel", () => {
  // Vor diesem Task waren fünf der acht Endpunkte gesperrt, weil die Regel
  // fehlte. Jetzt fehlen höchstens Daten, und das ist eine andere Aussage.
  it.each(ENDPUNKTE.map((e) => e.id))("%s trägt eine Rechenvorschrift", (id) => {
    expect(endpunktById(id)?.regel).not.toBeNull();
  });

  it("weist die Herkunft jeder Regel aus", () => {
    expect(endpunktById("oas")?.regel?.herkunft).toBe("bestehend");
    expect(endpunktById("lrr")?.regel?.herkunft).toBe("literatur");
    expect(endpunktById("lrfs")?.regel?.herkunft).toBe("literatur");
  });
});

describe("Die Lokalrezidivrate nutzt einen anderen Schätzer", () => {
  // Der einzige Endpunkt, bei dem der Tod konkurriert statt zu zählen.
  it("wählt für LRR die kumulative Inzidenz", () => {
    expect(schaetzerFuer(endpunktById("lrr")!)).toBe("kumulativeInzidenz");
  });

  it("bleibt bei allen übrigen Endpunkten bei Kaplan-Meier", () => {
    for (const id of ["oas", "dfs", "lrfs", "mfs", "pfs", "pps", "ttft"] as const) {
      expect(schaetzerFuer(endpunktById(id)!)).toBe("kaplanMeier");
    }
  });
});

describe("Allgemeine Regeln auf einer Kohorte ohne Box", () => {
  it("rechnet LRFS bis zum Rezidiv", () => {
    const p = patient({ rezidivDatum: "2020-01-10", todDatum: null });
    const kohorte = kohorteFuerEndpunkt(endpunktById("lrfs")!, [p]);
    expect(kohorte[0].event).toBe(true);
  });

  // Für LRFS zählt der Tod als Ereignis, für LRR nicht.
  it("wertet den Tod bei LRFS als Ereignis, bei LRR nicht", () => {
    const p = patient({ todDatum: "2020-06-01" });
    expect(kohorteFuerEndpunkt(endpunktById("lrfs")!, [p])[0].event).toBe(true);
    expect(kohorteFuerEndpunkt(endpunktById("lrr")!, [p])[0].event).toBe(false);
  });

  it("rechnet MFS bis zur Metastase", () => {
    const p = patient({ metastasenDatum: "2020-03-01" });
    expect(kohorteFuerEndpunkt(endpunktById("mfs")!, [p])[0].event).toBe(true);
  });

  // Ein Lokalrezidiv ist für MFS kein Ereignis.
  it("ignoriert bei MFS ein reines Lokalrezidiv", () => {
    const p = patient({ rezidivDatum: "2020-03-01" });
    expect(kohorteFuerEndpunkt(endpunktById("mfs")!, [p])[0].event).toBe(false);
  });
});

describe("Konkurrierende Ereignisse der Lokalrezidivrate", () => {
  // Der Tod steht in konkurrenzfelder, nicht in datumsfelder. Ohne dass die
  // allgemeine Regel dieses Feld liest, käme ein Todesfall als Zensierung an
  // der Kurve an, also als "könnte noch ein Rezidiv bekommen".
  it("meldet den Tod als konkurrierendes Ereignis, nicht als Zensierung", () => {
    const p = patient({ todDatum: "2020-06-01" });
    const [fall] = kohorteFuerEndpunkt(endpunktById("lrr")!, [p]);
    expect(fall.event).toBe(false);
    expect(fall.konkurrenz).toBe(true);
    // Die Zeit läuft bis zum Tod, nicht bis zum letzten Follow-up.
    expect(fall.survivalTime).toBeCloseTo(16.7, 0);
  });

  it("zählt auch die Fernmetastase als konkurrierendes Ereignis", () => {
    const p = patient({ metastasenDatum: "2020-06-01" });
    expect(kohorteFuerEndpunkt(endpunktById("lrr")!, [p])[0].konkurrenz).toBe(true);
  });

  // Kommt das Rezidiv zuerst, ist es das Ereignis von Interesse; der spätere
  // Tod ändert daran nichts.
  it("lässt das frühere Rezidiv vor dem späteren Tod gelten", () => {
    const p = patient({ rezidivDatum: "2020-01-10", todDatum: "2020-06-01" });
    const [fall] = kohorteFuerEndpunkt(endpunktById("lrr")!, [p]);
    expect(fall.event).toBe(true);
    expect(fall.konkurrenz).toBe(false);
  });

  it("lässt einen Fall ohne Ereignis zensiert", () => {
    const p = patient({ followupDate: "2021-01-10" });
    const [fall] = kohorteFuerEndpunkt(endpunktById("lrr")!, [p]);
    expect(fall.event).toBe(false);
    expect(fall.konkurrenz).toBe(false);
  });

  // LRFS wertet den Tod als Ereignis und kennt keine Konkurrenz.
  it("markiert bei LRFS nichts als konkurrierend", () => {
    const p = patient({ todDatum: "2020-06-01" });
    expect(kohorteFuerEndpunkt(endpunktById("lrfs")!, [p])[0].konkurrenz).toBe(false);
  });
});

describe("PFS und PPS sperren mit Angabe des fehlenden Feldes", () => {
  // Der Unterschied, auf den es ankommt: nicht die Regel fehlt, sondern das
  // Datum. Der Anwender kann das durch einen anderen Upload beheben.
  it("meldet fehlende Daten statt einer fehlenden Regel", () => {
    const ergebnis = pruefeVerfuegbarkeit(endpunktById("pfs")!, [patient()]);
    expect(ergebnis.verfuegbar).toBe(false);
    expect(ergebnis.grund).toBe("datenFehlen");
    expect(ergebnis.fehlendesFeld).toBe("progressionDatum");
  });

  it("gibt PFS frei, sobald ein Progressionsdatum vorliegt", () => {
    const p = patient({ progressionDatum: "2020-05-01" });
    expect(pruefeVerfuegbarkeit(endpunktById("pfs")!, [p]).verfuegbar).toBe(true);
    expect(kohorteFuerEndpunkt(endpunktById("pfs")!, [p])[0].event).toBe(true);
  });

  // PPS startet erst bei der Progression, nicht bei der Diagnose.
  it("rechnet PPS ab dem Progressionsdatum", () => {
    const p = patient({ progressionDatum: "2020-01-10", todDatum: "2021-01-10" });
    const kohorte = kohorteFuerEndpunkt(endpunktById("pps")!, [p]);
    // 2020-01-10 bis 2021-01-10 sind 366 Tage, in Monaten rund 12.
    expect(kohorte[0].survivalTime).toBeCloseTo(12, 0);
    expect(kohorte[0].event).toBe(true);
  });

  // PPS braucht das Progressionsdatum nicht nur als Ereignisfeld, sondern als
  // Startzeitpunkt. Ein Todesdatum allein reicht nicht: ohne diese Prüfung
  // meldete die Verfügbarkeit "frei" und die Kohorte kam leer zurück, weil
  // kohorteFuerEndpunkt jeden Fall ohne Start herauswirft.
  it("meldet für PPS fehlende Daten, wenn nur der Tod dokumentiert ist", () => {
    const p = patient({ todDatum: "2020-06-01" });
    const ergebnis = pruefeVerfuegbarkeit(endpunktById("pps")!, [p]);
    expect(ergebnis.verfuegbar).toBe(false);
    expect(ergebnis.grund).toBe("datenFehlen");
    expect(ergebnis.fehlendesFeld).toBe("progressionDatum");
  });

  it("gibt PPS frei, sobald ein Progressionsdatum vorliegt", () => {
    const p = patient({ progressionDatum: "2020-01-10", todDatum: "2021-01-10" });
    expect(pruefeVerfuegbarkeit(endpunktById("pps")!, [p]).verfuegbar).toBe(true);
  });
});

describe("Der Tumorfrei-Einschluss gilt für jede Regel, die ihn deklariert", () => {
  // Wer nach der Primärtherapie noch Tumor hatte, kann kein Lokalrezidiv im
  // Sinne dieser Endpunkte mehr bekommen. Vor dieser Prüfung war das Merkmal
  // nur für DFS wirksam, obwohl LRR, LRFS und MFS es ebenso deklarieren.
  it("schließt einen nicht tumorfreien Fall von der Lokalrezidivrate aus", () => {
    const nichtTumorfrei = patient({ rezidivDatum: "2020-03-01", dfsEligible: false });
    expect(kohorteFuerEndpunkt(endpunktById("lrr")!, [nichtTumorfrei])).toHaveLength(0);
  });

  // Das Gesamtüberleben kennt diesen Einschluss nicht: derselbe Fall bleibt
  // dort enthalten.
  it("behält denselben Fall beim Gesamtüberleben", () => {
    const nichtTumorfrei = patient({ rezidivDatum: "2020-03-01", dfsEligible: false });
    expect(kohorteFuerEndpunkt(endpunktById("oas")!, [nichtTumorfrei])).toHaveLength(1);
  });
});
