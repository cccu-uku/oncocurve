/** Was in einer Zeile passiert ist. */
export type Ereignisart = "interesse" | "konkurrenz" | "zensiert";

export interface InzidenzFall {
  zeit: number;
  art: Ereignisart;
}

export interface InzidenzPunkt {
  zeit: number;
  /** Kumulierte Wahrscheinlichkeit für das Ereignis von Interesse. */
  inzidenz: number;
  unterRisiko: number;
  art: Ereignisart;
}

/**
 * Kumulative Inzidenz mit konkurrierenden Ereignissen.
 *
 * Gebraucht für Raten, nicht für Überlebenszeiten. Wer stirbt, bevor ein
 * Lokalrezidiv auftreten kann, bekommt keines mehr. Kaplan-Meier behandelt ihn
 * trotzdem als zensiert, also so, als stünde das Ereignis noch aus, und
 * überschätzt die Rate dadurch systematisch. Bei Brustkrebs liegt die mediane
 * relative Abweichung bei rund 28 Prozent.
 *
 * Formel, je Zeile i nach Zeit sortiert:
 *
 *   rᵢ     = N − i + 1
 *   S(Tᵢ)  = Überleben über ALLE Ereignisse, Interesse und Konkurrenz
 *   CIF(t) = Summe von S(T_{i−1}) / rᵢ über alle Ereigniszeilen mit Tᵢ <= t
 *
 * Entscheidend ist S vor der Zeile: der Beitrag einer Zeile wird gewichtet
 * mit der Wahrscheinlichkeit, bis dorthin überhaupt ereignisfrei gekommen zu
 * sein.
 *
 * Die Risikomenge sinkt zeilenweise um eins, wie beim Schätzer der
 * Boxspezifikationen. Damit bleiben beide Kurven derselben Kohorte
 * vergleichbar.
 */
export function kumulativeInzidenz(faelle: InzidenzFall[]): InzidenzPunkt[] {
  if (faelle.length === 0) return [];
  const sortiert = faelle.slice().sort((a, b) => a.zeit - b.zeit);
  const punkte: InzidenzPunkt[] = [];
  let unterRisiko = sortiert.length;
  let ueberleben = 1;
  let inzidenz = 0;
  for (const fall of sortiert) {
    if (fall.art === "interesse") {
      inzidenz += ueberleben / unterRisiko;
    }
    if (fall.art !== "zensiert") {
      ueberleben *= (unterRisiko - 1) / unterRisiko;
    }
    punkte.push({ zeit: fall.zeit, inzidenz, unterRisiko, art: fall.art });
    unterRisiko -= 1;
  }
  return punkte;
}
