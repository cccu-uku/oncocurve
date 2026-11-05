import { describe, expect, it } from "vitest";
import type { Patient } from "../obds-parser-new";
import { endpunktById } from "../endpunkte/registry";
import type { EndpunktDefinition } from "../endpunkte/typen";
import {
  TTFT_DATENSATZ,
  normalisiereDfsEligible,
  pruefeVerfuegbarkeit,
} from "../endpunkte/verfuegbarkeit";

function definition(id: "oas" | "ttft" | "dfs" | "pfs" | "pps"): EndpunktDefinition {
  const gefunden = endpunktById(id);
  if (!gefunden) throw new Error(`Endpunkt ${id} fehlt in der Registry`);
  return gefunden;
}

// Inzwischen trägt jeder Endpunkt der Registry eine Regel; den Sperrgrund
// "regelFehlt" gibt es dort nicht mehr zu beobachten. Die Prüfung selbst
// bleibt trotzdem die zweite Sicherung, siehe pruefeVerfuegbarkeit, deshalb
// hier mit einer künstlich gesperrten Definition getestet.
function ohneRegel(id: "oas" | "ttft" | "dfs" | "pfs" | "pps"): EndpunktDefinition {
  return { ...definition(id), regel: null };
}

const BASIS = { id: "1", survivalTime: 12, event: false } as unknown as Patient;

describe("Verfügbarkeit eines Endpunkts", () => {
  // Gesamtüberleben braucht nur Zeit und Ereignis; das hat jede Kohorte.
  it("gibt Gesamtüberleben immer frei", () => {
    expect(pruefeVerfuegbarkeit(definition("oas"), [BASIS])).toEqual({
      verfuegbar: true,
      grund: null,
      fehlendesFeld: null,
    });
  });

  // Der erste Sperrgrund: wir kennen die Rechenvorschrift noch nicht.
  it("sperrt einen Endpunkt ohne Regel und nennt den Grund", () => {
    const ergebnis = pruefeVerfuegbarkeit(ohneRegel("pfs"), [BASIS]);

    expect(ergebnis.verfuegbar).toBe(false);
    expect(ergebnis.grund).toBe("regelFehlt");
  });

  // Der zweite Sperrgrund: die Regel steht, aber diese Kohorte gibt sie nicht
  // her. Nur dieser Grund lässt sich durch einen anderen Upload beheben,
  // deshalb muss er das fehlende Feld nennen.
  it("sperrt bei fehlenden Daten und nennt das Feld", () => {
    const ergebnis = pruefeVerfuegbarkeit(definition("ttft"), [BASIS]);

    expect(ergebnis.verfuegbar).toBe(false);
    expect(ergebnis.grund).toBe("datenFehlen");
    expect(ergebnis.fehlendesFeld).toBe("firstTreatmentDate");
  });

  it("gibt frei, sobald ein einziger Fall das Feld trägt", () => {
    const mitDatum = { ...BASIS, firstTreatmentDate: "2020-03-01" } as Patient;

    expect(pruefeVerfuegbarkeit(definition("ttft"), [BASIS, mitDatum]).verfuegbar).toBe(true);
  });

  // Regressionsschutz: oBDS-Kohorten müssen DFS behalten.
  it("gibt DFS frei, wenn ein Rezidivdatum vorliegt", () => {
    const oBds = { ...BASIS, rezidivDatum: "2021-05-01" } as Patient;

    expect(pruefeVerfuegbarkeit(definition("dfs"), [oBds]).verfuegbar).toBe(true);
  });

  // OncoBox setzt dfsEligible auf false und keines der Datumsfelder.
  it("sperrt DFS für eine OncoBox-Kohorte", () => {
    const oncoBox = { ...BASIS, dfsEligible: false } as unknown as Patient;
    const ergebnis = pruefeVerfuegbarkeit(definition("dfs"), [oncoBox]);

    expect(ergebnis.verfuegbar).toBe(false);
    expect(ergebnis.grund).toBe("datenFehlen");
  });

  // Der Parser rechnet bei erkannter Behandlungsdatumsspalte survivalTime schon
  // als Zeit bis zur Ersttherapie; die Gesamtüberlebenszeit ist damit verloren.
  // Gesamtüberleben wäre hier dieselbe Kurve unter anderer Beschriftung.
  it("sperrt Gesamtüberleben für einen Datensatz der Zeit bis zur Ersttherapie", () => {
    const ttft = { ...BASIS, endpoint: "ttft" } as unknown as Patient;
    const ergebnis = pruefeVerfuegbarkeit(definition("oas"), [ttft]);

    expect(ergebnis.verfuegbar).toBe(false);
    expect(ergebnis.grund).toBe("datenFehlen");
    expect(ergebnis.fehlendesFeld).toBe(TTFT_DATENSATZ);
  });

  it("lässt Gesamtüberleben frei, solange kein Fall so markiert ist", () => {
    expect(pruefeVerfuegbarkeit(definition("oas"), [BASIS]).verfuegbar).toBe(true);
  });

  it("sperrt jeden Endpunkt bei leerer Kohorte", () => {
    expect(pruefeVerfuegbarkeit(definition("oas"), []).verfuegbar).toBe(false);
  });

  // Reihenfolge der Sperrgründe: ein Endpunkt ohne Regel nennt auch ohne Fälle
  // den nicht behebbaren Grund, nicht den behebbaren.
  it("nennt bei fehlender Regel auch ohne Fälle den Regelgrund", () => {
    const ergebnis = pruefeVerfuegbarkeit(ohneRegel("pfs"), []);

    expect(ergebnis.verfuegbar).toBe(false);
    expect(ergebnis.grund).toBe("regelFehlt");
  });
});

describe("Hydratisierung des Einschlussmerkmals", () => {
  // Drei Werte, drei Aussagen: true und false kommen aus der Quelle, undefined
  // heißt "die Quelle sagt nichts dazu". Wer undefined zu false macht, sperrt
  // jede CSV-Kohorte vom krankheitsfreien Überleben aus.
  it("reicht true und false unverändert durch", () => {
    expect(normalisiereDfsEligible(true)).toBe(true);
    expect(normalisiereDfsEligible(false)).toBe(false);
  });

  it("lässt eine Quelle ohne Aussage undefined", () => {
    expect(normalisiereDfsEligible(undefined)).toBeUndefined();
    expect(normalisiereDfsEligible(null)).toBeUndefined();
  });

  // Regressionsschutz zu dem Fehler, den diese Regel behebt: eine CSV mit
  // Rezidivdatum kam hydratisiert mit dfsEligible false an und blieb gesperrt.
  it("hält DFS für eine hydratisierte CSV-Kohorte frei", () => {
    const csv = {
      ...BASIS,
      rezidivDatum: "2021-05-01",
      dfsEligible: normalisiereDfsEligible(undefined),
    } as unknown as Patient;

    expect(pruefeVerfuegbarkeit(definition("dfs"), [csv]).verfuegbar).toBe(true);
  });

  // Gegenprobe: die OncoBox sagt ausdrücklich nein, und das muss die
  // Hydratisierung überleben.
  it("hält DFS für eine hydratisierte OncoBox-Kohorte gesperrt", () => {
    const oncoBox = {
      ...BASIS,
      rezidivDatum: "2021-05-01",
      dfsEligible: normalisiereDfsEligible(false),
    } as unknown as Patient;

    expect(pruefeVerfuegbarkeit(definition("dfs"), [oncoBox]).verfuegbar).toBe(false);
  });
});

describe("Das Einschlusskriterium entscheidet, nicht die Datumsfelder", () => {
  // dfsEligible gehört zum Einschluss "tumorfrei nach Primärtherapie". PFS,
  // PPS und die Zeit bis zur Ersttherapie deklarieren etwas anderes und
  // dürfen davon nicht gesperrt werden, nur weil sie auch Datumsfelder führen.
  const nichtTumorfrei = (teile: Record<string, unknown>) =>
    ({ ...BASIS, dfsEligible: false, ...teile }) as unknown as Patient;

  it("gibt PFS frei, obwohl die Quelle jeden Fall als nicht tumorfrei meldet", () => {
    const p = nichtTumorfrei({ progressionDatum: "2021-05-01" });
    expect(pruefeVerfuegbarkeit(definition("pfs"), [p]).verfuegbar).toBe(true);
  });

  it("gibt PPS frei, obwohl die Quelle jeden Fall als nicht tumorfrei meldet", () => {
    const p = nichtTumorfrei({ progressionDatum: "2021-05-01", todDatum: "2022-01-01" });
    expect(pruefeVerfuegbarkeit(definition("pps"), [p]).verfuegbar).toBe(true);
  });

  it("gibt die Zeit bis zur Ersttherapie frei", () => {
    const p = nichtTumorfrei({ firstTreatmentDate: "2021-05-01" });
    expect(pruefeVerfuegbarkeit(definition("ttft"), [p]).verfuegbar).toBe(true);
  });

  // Gegenprobe: DFS deklariert den Einschluss und bleibt gesperrt.
  it("sperrt DFS weiter, weil es den Einschluss deklariert", () => {
    const p = nichtTumorfrei({ rezidivDatum: "2021-05-01" });
    expect(pruefeVerfuegbarkeit(definition("dfs"), [p]).verfuegbar).toBe(false);
  });
});
