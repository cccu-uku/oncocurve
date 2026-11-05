import { gruppierterSchaetzer, sequentiellerSchaetzer, type SchaetzerFall } from "@/utils/kaplan-meier";
import type { KurvenSchaetzer } from "../../boxkurve";

export interface Nachbeobachtung {
  median: number;
  min: number;
  max: number;
}

/**
 * Nachbeobachtungsdauer über alle Fälle, Ereignisse eingeschlossen. Das Blatt
 * Kaplan-Meier DFS II der Darm-Spezifikation fordert die drei Werte neben der
 * Kurve; Brust und Prostata kennen die Vorgabe nicht.
 */
export function nachbeobachtung(faelle: SchaetzerFall[]): Nachbeobachtung | null {
  if (faelle.length === 0) return null;
  const zeiten = faelle.map((fall) => fall.zeit).sort((a, b) => a - b);
  const mitte = Math.floor(zeiten.length / 2);
  const median =
    zeiten.length % 2 === 1 ? zeiten[mitte] : (zeiten[mitte - 1] + zeiten[mitte]) / 2;
  return { median, min: zeiten[0], max: zeiten[zeiten.length - 1] };
}

/**
 * Erster Zeitpunkt, an dem die Kurve auf 0,5 oder darunter fällt. Bleibt sie
 * darüber, gibt es keinen Median: dann ist die Hälfte der Kohorte am Ende der
 * Beobachtung noch ohne Ereignis, und jede Zahl wäre eine Fortschreibung über
 * die Daten hinaus.
 *
 * Das Verfahren muss dasselbe sein, mit dem die daneben gezeichnete Kurve
 * entsteht, sonst widerspricht die Zahl dem Bild: bei Bindungen liefern der
 * sequentielle und der gruppierte Schätzer unterschiedliche Werte, siehe
 * gruppierterSchaetzer in utils/kaplan-meier.ts. Kumulative Inzidenz zählt
 * wie sequentiell, denn beide senken die Risikomenge zeilenweise, siehe
 * kumulativeInzidenz in utils/kumulative-inzidenz.ts.
 */
export function medianeZeitOhneEreignis(
  faelle: SchaetzerFall[],
  schaetzer: KurvenSchaetzer,
): number | null {
  const punkte = schaetzer === "gruppiert" ? gruppierterSchaetzer(faelle) : sequentiellerSchaetzer(faelle);
  const treffer = punkte.find((punkt) => punkt.wahrscheinlichkeit <= 0.5);
  return treffer ? treffer.zeit : null;
}
