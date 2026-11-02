import { describe, expect, it } from "vitest";
import { kumulativeInzidenz } from "@/utils/kumulative-inzidenz";
import { sequentiellerSchaetzer } from "@/utils/kaplan-meier";

describe("Kumulative Inzidenz mit konkurrierenden Ereignissen", () => {
  // Vier Fälle, ein Rezidiv bei 10. S vor der Zeile ist 1, r ist 4.
  // CIF = 1 * 1/4 = 0,25 und bleibt danach stehen.
  it("summiert das erste Ereignis mit voller Gewichtung", () => {
    const punkte = kumulativeInzidenz([
      { zeit: 10, art: "interesse" },
      { zeit: 20, art: "zensiert" },
      { zeit: 30, art: "zensiert" },
      { zeit: 40, art: "zensiert" },
    ]);
    expect(punkte[0].inzidenz).toBeCloseTo(0.25, 10);
    expect(punkte[3].inzidenz).toBeCloseTo(0.25, 10);
  });

  // Der Kern der Sache: ein Todesfall vor dem Rezidiv senkt die spätere
  // Gewichtung. Zeile 1 Tod bei 10, S danach 3/4. Zeile 2 Rezidiv bei 20,
  // r ist 3, Beitrag 0,75 * 1/3 = 0,25.
  it("gewichtet ein Ereignis nach dem konkurrierenden Ereignis herunter", () => {
    const punkte = kumulativeInzidenz([
      { zeit: 10, art: "konkurrenz" },
      { zeit: 20, art: "interesse" },
      { zeit: 30, art: "zensiert" },
      { zeit: 40, art: "zensiert" },
    ]);
    expect(punkte[0].inzidenz).toBeCloseTo(0, 10);
    expect(punkte[1].inzidenz).toBeCloseTo(0.25, 10);
  });

  // Der Vergleich, der die Wahl des Verfahrens begründet. Dieselben Daten:
  // Kaplan-Meier zählt den Tod als Zensierung und kommt auf eine höhere
  // Rezidivwahrscheinlichkeit als die kumulative Inzidenz.
  it("liegt unter der Kaplan-Meier-Schätzung, wenn der Tod konkurriert", () => {
    const faelle = [
      { zeit: 10, art: "konkurrenz" as const },
      { zeit: 20, art: "konkurrenz" as const },
      { zeit: 30, art: "interesse" as const },
      { zeit: 40, art: "zensiert" as const },
    ];
    const cif = kumulativeInzidenz(faelle)[2].inzidenz;
    // Kaplan-Meier auf denselben Daten: der Tod ist dort Zensierung, das
    // Rezidiv das einzige Ereignis.
    const km = sequentiellerSchaetzer(
      faelle.map((f) => ({ zeit: f.zeit, ereignis: f.art === "interesse" })),
    );
    const kmRate = 1 - km[2].wahrscheinlichkeit;
    expect(cif).toBeLessThan(kmRate);
    expect(cif).toBeCloseTo(0.25, 10);
    expect(kmRate).toBeCloseTo(0.5, 10);
  });

  it("sortiert unsortierte Eingaben nach Zeit", () => {
    const punkte = kumulativeInzidenz([
      { zeit: 50, art: "interesse" },
      { zeit: 10, art: "zensiert" },
    ]);
    expect(punkte.map((p) => p.zeit)).toEqual([10, 50]);
  });

  it("bleibt bei null, wenn kein Ereignis von Interesse eintritt", () => {
    const punkte = kumulativeInzidenz([
      { zeit: 10, art: "konkurrenz" },
      { zeit: 20, art: "zensiert" },
    ]);
    expect(punkte.every((p) => p.inzidenz === 0)).toBe(true);
  });

  it("liefert für eine leere Kohorte eine leere Kurve", () => {
    expect(kumulativeInzidenz([])).toEqual([]);
  });
});
