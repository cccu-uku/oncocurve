import { sequentiellerSchaetzer } from "../../utils/kaplan-meier";
import { kumulativeInzidenz, type Ereignisart } from "../../utils/kumulative-inzidenz";
import type { ZeitEinheit } from "./endpunkte/anwenden";

/**
 * Verfahren, mit dem der Worker eine Kurve rechnet.
 *
 * gruppiert:          die übliche Konvention, gleiche Zeiten gemeinsam. Gilt
 *                     für oBDS, CSV, TXT und Excel und bleibt die Vorgabe.
 * sequentiell:        die Vorschrift der OncoBox-Auswertungsblätter. Die
 *                     Risikomenge sinkt je Zeile um eins, auch bei gleicher
 *                     Zeit, siehe sequentiellerSchaetzer in utils/kaplan-meier.
 * kumulativeInzidenz: Rate mit konkurrierenden Ereignissen. Steigt von null,
 *                     statt von eins zu fallen.
 */
export type KurvenSchaetzer = "gruppiert" | "sequentiell" | "kumulativeInzidenz";

/** Eine Zeile der Auswertung, so wie die Boxspezifikationen sie führen. */
export interface BoxKurvenFall {
  zeit: number;
  ereignis: boolean;
  /** Der Fall endete durch ein konkurrierendes Ereignis, etwa den Tod. */
  konkurrenz: boolean;
}

export interface BoxKurvenPunkt {
  time: number;
  /**
   * Bei kumulativer Inzidenz die Rate, sonst die
   * Überlebenswahrscheinlichkeit.
   */
  probability: number;
  atRisk: number;
  events: number;
  censored: number;
  /** Nur bei der kumulativen Inzidenz gesetzt, siehe SurvivalDataPoint. */
  cumulativeIncidence?: boolean;
}

function ereignisart(fall: BoxKurvenFall): Ereignisart {
  if (fall.ereignis) return "interesse";
  return fall.konkurrenz ? "konkurrenz" : "zensiert";
}

/**
 * Kurvenpunkte nach der Vorschrift einer OncoBox, eine Zeile je Fall.
 *
 * Die Punkte tragen atRisk und events so, dass computeKaplanMeierCI daraus
 * dieselbe Kurve wieder herstellt: dort wird die Wahrscheinlichkeit neu aus
 * beiden Feldern gebildet, und eine abweichende Zählung überschriebe die
 * Vorschrift der Box. Bei der kumulativen Inzidenz geht das nicht, deshalb
 * trägt jeder Punkt dort das Merkmal cumulativeIncidence und bleibt
 * unverändert.
 *
 * Die Reihenfolge der Rückgabe ist die nach Zeit sortierte Eingabe.
 */
export function boxKurvenPunkte(
  faelle: BoxKurvenFall[],
  schaetzer: "sequentiell" | "kumulativeInzidenz",
): BoxKurvenPunkt[] {
  if (schaetzer === "kumulativeInzidenz") {
    return kumulativeInzidenz(
      faelle.map((fall) => ({ zeit: fall.zeit, art: ereignisart(fall) })),
    ).map((punkt) => ({
      time: punkt.zeit,
      probability: punkt.inzidenz,
      atRisk: punkt.unterRisiko,
      events: punkt.art === "interesse" ? 1 : 0,
      // Ein konkurrierendes Ereignis ist keine Zensierung. Als solche gezählt
      // stünde es im Diagramm als Kreuz und in der Tabelle als "noch unter
      // Beobachtung", und genau das ist es nicht.
      censored: punkt.art === "zensiert" ? 1 : 0,
      cumulativeIncidence: true,
    }));
  }
  return sequentiellerSchaetzer(
    faelle.map((fall) => ({ zeit: fall.zeit, ereignis: fall.ereignis })),
  ).map((punkt) => ({
    time: punkt.zeit,
    probability: punkt.wahrscheinlichkeit,
    atRisk: punkt.unterRisiko,
    events: punkt.ereignis ? 1 : 0,
    censored: punkt.ereignis ? 0 : 1,
  }));
}

/**
 * Gehört diese Zeit in die Kurve?
 *
 * In Monaten ist eine Null ein Rundungsartefakt oder eine fehlende Angabe und
 * fällt heraus. In Tagen ist sie ein Ereignis am Tag der Diagnose, also eine
 * echte Beobachtung; kohorteFuerEndpunkt lässt sie ausdrücklich stehen, und
 * der Schätzer darf sie nicht wieder wegwerfen. Negative Zeiten sind in beiden
 * Einheiten ein Datenfehler.
 */
export function gueltigeZeit(zeit: number, zeitEinheit: ZeitEinheit): boolean {
  return zeitEinheit === "tage" ? zeit >= 0 : zeit > 0;
}
