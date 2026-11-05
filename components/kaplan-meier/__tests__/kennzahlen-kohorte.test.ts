import { describe, expect, it } from "vitest";
import { formatiereKennzahlenZeile, kennzahlenFuerKurve } from "../endpunkte/boxregeln/kennzahlen-kohorte";

describe("Kennzahlen für die gezeigte Kohorte", () => {
  it("rechnet nur mit den Fällen, die auch die Kurve zeigt", () => {
    const ergebnis = kennzahlenFuerKurve(
      [
        { survivalTime: 100, event: false },
        { survivalTime: 300, event: true },
        { survivalTime: 500, event: false },
      ],
      "monate",
      "gruppiert",
    );
    expect(ergebnis.nachbeobachtung).toEqual({ median: 300, min: 100, max: 500 });
  });

  // In Monaten ist eine Null ein Rundungsartefakt, siehe gueltigeZeit in
  // boxkurve.ts. Dieselbe Regel muss hier gelten, sonst zählte diese Anzeige
  // einen Fall mit, den die daneben gezeichnete Kurve bereits verworfen hat.
  it("verwirft eine Zeit von null in Monaten wie die Kurve auch", () => {
    const ergebnis = kennzahlenFuerKurve(
      [
        { survivalTime: 0, event: false },
        { survivalTime: 200, event: true },
      ],
      "monate",
      "gruppiert",
    );
    expect(ergebnis.nachbeobachtung).toEqual({ median: 200, min: 200, max: 200 });
  });

  // In Tagen ist eine Null ein echtes Ereignis am Diagnosetag, siehe
  // gueltigeZeit. Die Kurve behält diesen Fall, also auch diese Anzeige.
  it("behält eine Zeit von null in Tagen wie die Kurve auch", () => {
    const ergebnis = kennzahlenFuerKurve(
      [
        { survivalTime: 0, event: true },
        { survivalTime: 200, event: false },
      ],
      "tage",
      "sequentiell",
    );
    expect(ergebnis.nachbeobachtung).toEqual({ median: 100, min: 0, max: 200 });
  });

  it("liefert null ohne gültige Fälle", () => {
    const ergebnis = kennzahlenFuerKurve([{ survivalTime: null, event: false }], "monate", "gruppiert");
    expect(ergebnis.nachbeobachtung).toBeNull();
    expect(ergebnis.medianOhneEreignis).toBeNull();
  });

  it("übernimmt die mediane ereignisfreie Zeit unverändert", () => {
    const ergebnis = kennzahlenFuerKurve(
      [
        { survivalTime: 10, event: true },
        { survivalTime: 20, event: true },
        { survivalTime: 30, event: true },
        { survivalTime: 40, event: true },
      ],
      "tage",
      "sequentiell",
    );
    expect(ergebnis.medianOhneEreignis).toBe(20);
  });

  // Dasselbe Verfahren wie bei der Kurve reicht bis zu diesem Modul durch:
  // dieselbe Kohorte mit Bindung liefert je nach Schätzer einen anderen
  // Median, siehe boxregeln-kennzahlen.test.ts für die Herleitung der Werte.
  it("reicht den Kurvenschätzer bis zur medianen ereignisfreien Zeit durch", () => {
    const patienten = [
      { survivalTime: 10, event: false },
      { survivalTime: 10, event: false },
      { survivalTime: 10, event: false },
      { survivalTime: 10, event: true },
      { survivalTime: 10, event: true },
      { survivalTime: 20, event: true },
    ];
    expect(kennzahlenFuerKurve(patienten, "tage", "sequentiell").medianOhneEreignis).toBe(10);
    expect(kennzahlenFuerKurve(patienten, "tage", "gruppiert").medianOhneEreignis).toBe(20);
  });
});

describe("Formatierte Kennzahlenzeile", () => {
  const texte = {
    dauer: "Nachbeobachtung",
    median: "Median",
    min: "Min",
    max: "Max",
    ereignisfrei: "Mediane ereignisfreie Zeit",
    nichtErreicht: "nicht erreicht",
  };

  it("liefert null ohne Kohorte", () => {
    expect(formatiereKennzahlenZeile({ nachbeobachtung: null, medianOhneEreignis: null }, "Monate", texte)).toBeNull();
  });

  it("baut eine Zeile mit Einheit an jeder Zahl", () => {
    const zeile = formatiereKennzahlenZeile(
      { nachbeobachtung: { median: 24, min: 12, max: 48 }, medianOhneEreignis: 18 },
      "Monate",
      texte,
    );
    expect(zeile).toBe(
      "Nachbeobachtung: Median 24.0 Monate (Min 12.0, Max 48.0) · Mediane ereignisfreie Zeit: 18.0 Monate",
    );
  });

  // Die Kurve erreicht 0,5 nie: keine Zahl vortäuschen, sondern denselben
  // Hinweistext wie an anderer Stelle der Anwendung für einen nicht
  // erreichten Median.
  it("nennt den Hinweistext, wenn die ereignisfreie Zeit nicht erreicht ist", () => {
    const zeile = formatiereKennzahlenZeile(
      { nachbeobachtung: { median: 24, min: 12, max: 48 }, medianOhneEreignis: null },
      "Monate",
      texte,
    );
    expect(zeile).toContain("Mediane ereignisfreie Zeit: nicht erreicht");
  });
});
