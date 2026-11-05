import { describe, expect, it } from "vitest";
import { boxKurvenPunkte, gueltigeZeit } from "../boxkurve";
import { computeKaplanMeierCI, computeKMPercentile } from "@/utils/kaplan-meier";

describe("Kurvenpunkte der Boxschätzer", () => {
  // Der Unterschied, um den es geht: bei gleicher Zeit sinkt die Risikomenge
  // je Zeile um eins. Der übliche gruppierte Schätzer käme hier auf 0,5 in
  // einem einzigen Schritt.
  it("rechnet gleiche Zeiten nacheinander statt gemeinsam", () => {
    const punkte = boxKurvenPunkte(
      [
        { zeit: 10, ereignis: true, konkurrenz: false },
        { zeit: 10, ereignis: true, konkurrenz: false },
        { zeit: 30, ereignis: false, konkurrenz: false },
        { zeit: 40, ereignis: false, konkurrenz: false },
      ],
      "sequentiell",
    );
    expect(punkte.map((p) => p.atRisk)).toEqual([4, 3, 2, 1]);
    expect(punkte[0].probability).toBeCloseTo(0.75, 10);
    expect(punkte[1].probability).toBeCloseTo(0.5, 10);
    expect(punkte.map((p) => p.events)).toEqual([1, 1, 0, 0]);
    expect(punkte.map((p) => p.censored)).toEqual([0, 0, 1, 1]);
  });

  // Die Punkte laufen durch computeKaplanMeierCI, das die Wahrscheinlichkeit
  // aus events und atRisk neu bildet. Beide Wege müssen dasselbe ergeben,
  // sonst überschriebe die Konfidenzrechnung die Vorschrift der Box.
  it("liefert atRisk und events, aus denen sich dieselbe Kurve ergibt", () => {
    const punkte = boxKurvenPunkte(
      [
        { zeit: 16, ereignis: false, konkurrenz: false },
        { zeit: 40, ereignis: true, konkurrenz: false },
        { zeit: 45, ereignis: true, konkurrenz: false },
      ],
      "sequentiell",
    );
    let nachgerechnet = 1;
    for (const punkt of punkte) {
      nachgerechnet *= 1 - punkt.events / punkt.atRisk;
      expect(punkt.probability).toBeCloseTo(nachgerechnet, 10);
    }
  });

  it("markiert die kumulative Inzidenz und lässt sie von null steigen", () => {
    const punkte = boxKurvenPunkte(
      [
        { zeit: 10, ereignis: false, konkurrenz: true },
        { zeit: 20, ereignis: true, konkurrenz: false },
        { zeit: 30, ereignis: false, konkurrenz: false },
        { zeit: 40, ereignis: false, konkurrenz: false },
      ],
      "kumulativeInzidenz",
    );
    expect(punkte.every((p) => p.cumulativeIncidence)).toBe(true);
    expect(punkte[0].probability).toBeCloseTo(0, 10);
    expect(punkte[1].probability).toBeCloseTo(0.25, 10);
    expect(punkte[3].probability).toBeCloseTo(0.25, 10);
    // Der konkurrierende Fall ist weder Ereignis noch Zensierung.
    expect(punkte[0].events).toBe(0);
    expect(punkte[0].censored).toBe(0);
  });

  it("liefert für eine leere Kohorte eine leere Kurve", () => {
    expect(boxKurvenPunkte([], "sequentiell")).toEqual([]);
    expect(boxKurvenPunkte([], "kumulativeInzidenz")).toEqual([]);
  });
});

describe("Die kumulative Inzidenz übersteht die Verbraucher der Kurve", () => {
  const punkte = boxKurvenPunkte(
    [
      { zeit: 10, ereignis: false, konkurrenz: true },
      { zeit: 20, ereignis: true, konkurrenz: false },
      { zeit: 30, ereignis: false, konkurrenz: false },
      { zeit: 40, ereignis: false, konkurrenz: false },
    ],
    "kumulativeInzidenz",
  );

  // computeKaplanMeierCI bildet die Wahrscheinlichkeit sonst neu aus events und
  // atRisk. Ohne die Ausnahme überschriebe es die Rate mit einer fallenden
  // Überlebenskurve, und die Kurve im Diagramm zeigte wieder das Falsche.
  it("bleibt in computeKaplanMeierCI unverändert", () => {
    const mitCI = computeKaplanMeierCI(punkte);
    expect(mitCI.map((p) => p.probability)).toEqual(punkte.map((p) => p.probability));
    expect(mitCI[1].probability).toBeCloseTo(0.25, 10);
    expect(mitCI.every((p) => p.stdErr === 0)).toBe(true);
  });

  // Der erste Punkt einer steigenden Kurve liegt unter 0,5. Ohne die Ausnahme
  // meldete die Quantilsuche ihn als medianes Überleben.
  it("meldet kein medianes Überleben", () => {
    const median = computeKMPercentile(computeKaplanMeierCI(punkte), 0.5);
    expect(median.reached).toBe(false);
    expect(median.time).toBeNull();
  });
});

describe("Welche Zeit in die Kurve gehört", () => {
  // In Monaten ist eine Null ein Rundungsartefakt oder eine fehlende Angabe.
  it("verwirft die Null in einer Monatskohorte", () => {
    expect(gueltigeZeit(0, "monate")).toBe(false);
    expect(gueltigeZeit(0.5, "monate")).toBe(true);
  });

  // In Tagen ist eine Null ein Todesfall am Diagnosetag, also ein echtes
  // Ereignis. kohorteFuerEndpunkt lässt sie deshalb ausdrücklich stehen; der
  // Worker warf sie danach wieder weg.
  it("behält die Null in einer Tageskohorte", () => {
    expect(gueltigeZeit(0, "tage")).toBe(true);
  });

  it("verwirft negative Zeiten in beiden Einheiten", () => {
    expect(gueltigeZeit(-1, "tage")).toBe(false);
    expect(gueltigeZeit(-1, "monate")).toBe(false);
  });
});
