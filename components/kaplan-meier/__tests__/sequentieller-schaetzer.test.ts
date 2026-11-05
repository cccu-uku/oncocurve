import { describe, expect, it } from "vitest";
import { sequentiellerSchaetzer } from "@/utils/kaplan-meier";

describe("Sequentieller Schätzer der OncoBox-Spezifikationen", () => {
  // Rechenbeispiel aus eb_brust-N1.1.1, Blatt Kaplan-Meier (DFS): 18 Fälle
  // unter Risiko, die ersten fünf Zeiten in Tagen mit ihren Indikatoren.
  // Die Sollwerte stehen dort in der Ergebnisspalte.
  it("reproduziert das Rechenbeispiel der Brust-Spezifikation", () => {
    const faelle = [
      { zeit: 16, ereignis: false },
      { zeit: 38, ereignis: false },
      { zeit: 40, ereignis: true },
      { zeit: 45, ereignis: true },
      { zeit: 57, ereignis: true },
      ...Array.from({ length: 13 }, (_, i) => ({ zeit: 400 + i, ereignis: false })),
    ];
    const punkte = sequentiellerSchaetzer(faelle);
    expect(punkte).toHaveLength(18);
    expect(punkte[0].wahrscheinlichkeit).toBeCloseTo(1, 10);
    expect(punkte[1].wahrscheinlichkeit).toBeCloseTo(1, 10);
    expect(punkte[2].wahrscheinlichkeit).toBeCloseTo(0.9375, 10);
    expect(punkte[3].wahrscheinlichkeit).toBeCloseTo(0.875, 10);
    expect(punkte[4].wahrscheinlichkeit).toBeCloseTo(0.8125, 10);
  });

  // Die Eigenheit der Spezifikation: die Risikomenge sinkt je Zeile um eins,
  // auch bei gleicher Zeit. Der übliche Schätzer fasst Bindungen zusammen und
  // käme hier auf 0,5 statt auf die Folge 0,75 und 0,5.
  it("behandelt gleiche Zeiten nacheinander, nicht gemeinsam", () => {
    const punkte = sequentiellerSchaetzer([
      { zeit: 10, ereignis: true },
      { zeit: 10, ereignis: true },
      { zeit: 30, ereignis: false },
      { zeit: 40, ereignis: false },
    ]);
    expect(punkte[0].unterRisiko).toBe(4);
    expect(punkte[0].wahrscheinlichkeit).toBeCloseTo(0.75, 10);
    expect(punkte[1].unterRisiko).toBe(3);
    expect(punkte[1].wahrscheinlichkeit).toBeCloseTo(0.5, 10);
  });

  it("sortiert unsortierte Eingaben nach Zeit", () => {
    const punkte = sequentiellerSchaetzer([
      { zeit: 50, ereignis: true },
      { zeit: 10, ereignis: false },
    ]);
    expect(punkte.map((p) => p.zeit)).toEqual([10, 50]);
  });

  it("liefert für eine leere Kohorte eine leere Kurve", () => {
    expect(sequentiellerSchaetzer([])).toEqual([]);
  });
});
