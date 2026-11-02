import { describe, expect, it } from "vitest";
import { medianeZeitOhneEreignis, nachbeobachtung } from "../endpunkte/boxregeln/kennzahlen";

describe("Nachbeobachtungsdauer", () => {
  it("liefert Median, Minimum und Maximum", () => {
    const werte = nachbeobachtung([
      { zeit: 100, ereignis: false },
      { zeit: 300, ereignis: true },
      { zeit: 500, ereignis: false },
    ]);
    expect(werte).toEqual({ median: 300, min: 100, max: 500 });
  });

  it("mittelt den Median bei gerader Anzahl", () => {
    const werte = nachbeobachtung([
      { zeit: 100, ereignis: false },
      { zeit: 200, ereignis: false },
    ]);
    expect(werte?.median).toBe(150);
  });

  it("liefert null für eine leere Kohorte", () => {
    expect(nachbeobachtung([])).toBeNull();
  });
});

describe("Mediane Zeit ohne Ereignis", () => {
  // Vier Fälle, alle Ereignisse: die Kurve läuft 0,75, 0,5, 0,25, 0. Der
  // Median ist der erste Zeitpunkt mit 0,5 oder darunter, also 20. Ohne
  // Bindungen liefern beide Schätzer dasselbe Ergebnis.
  it("nennt den ersten Zeitpunkt mit höchstens 0,5", () => {
    expect(
      medianeZeitOhneEreignis(
        [
          { zeit: 10, ereignis: true },
          { zeit: 20, ereignis: true },
          { zeit: 30, ereignis: true },
          { zeit: 40, ereignis: true },
        ],
        "sequentiell",
      ),
    ).toBe(20);
    expect(
      medianeZeitOhneEreignis(
        [
          { zeit: 10, ereignis: true },
          { zeit: 20, ereignis: true },
          { zeit: 30, ereignis: true },
          { zeit: 40, ereignis: true },
        ],
        "gruppiert",
      ),
    ).toBe(20);
  });

  // Erreicht die Kurve 0,5 nie, gibt es keinen Median. Eine Zahl an dieser
  // Stelle wäre eine Fortschreibung über die Daten hinaus.
  it("liefert null, wenn die Kurve über 0,5 bleibt", () => {
    expect(
      medianeZeitOhneEreignis(
        [
          { zeit: 10, ereignis: true },
          { zeit: 20, ereignis: false },
          { zeit: 30, ereignis: false },
          { zeit: 40, ereignis: false },
        ],
        "sequentiell",
      ),
    ).toBeNull();
  });

  it("liefert null für eine leere Kohorte", () => {
    expect(medianeZeitOhneEreignis([], "sequentiell")).toBeNull();
  });

  // Bindung mit gemischten Zensierungen und Ereignissen: drei Zensierte vor
  // zwei Ereignissen bei Zeit 10, ein Ereignis bei Zeit 20, N = 6.
  // Sequentiell senkt jede der drei Zensierungen die Risikomenge schon vor
  // den beiden Ereignissen, die Kurve fällt dadurch INNERHALB der Bindung
  // unter 0,5 (Median 10). Gruppiert wirkt die Bindung als eine Stufe mit
  // Risikomenge 6 vor allen fünf Zeilen, bleibt dort bei 0,6667 und fällt
  // erst bei der nächsten Zeile unter 0,5 (Median 20). Genau dieser
  // Unterschied ist der Grund für Anweisung 1.
  it("weicht bei Bindungen zwischen sequentiellem und gruppiertem Schätzer ab", () => {
    const faelle = [
      { zeit: 10, ereignis: false },
      { zeit: 10, ereignis: false },
      { zeit: 10, ereignis: false },
      { zeit: 10, ereignis: true },
      { zeit: 10, ereignis: true },
      { zeit: 20, ereignis: true },
    ];
    expect(medianeZeitOhneEreignis(faelle, "sequentiell")).toBe(10);
    expect(medianeZeitOhneEreignis(faelle, "gruppiert")).toBe(20);
  });
});
