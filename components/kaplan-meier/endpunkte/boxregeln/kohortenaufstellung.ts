import type { OncoBoxCase } from "../../oncobox/types";
import type { AusschlussGrund, BoxRegel } from "./typen";

/** Eine Zeile der Aufstellung: ein Ausschlussgrund mit Anzahl und Anteil. */
export interface AusschlussZeile {
  grund: AusschlussGrund;
  anzahl: number;
  /** Anteil an den Primärfällen, 0 bis 1. */
  anteil: number;
}

/**
 * Die Aufstellung, die die Auswertungsblätter der 1.0-Boxen neben der Kurve
 * verlangen.
 *
 * Aufbau nach Abschnitt 1 und 2 jener Blätter: von den Primärfällen als
 * hundert Prozent über die Ausschlüsse je Grund zur Anzahl unter Risiko, dann
 * die Aufteilung dieser Risikomenge.
 *
 * Die Buchstaben A, B und C der Spezifikation stehen hier bewusst nicht. Sie
 * bedeuten je nach Box und Endpunkt Verschiedenes, und zwei von ihnen fallen
 * ohnehin zusammen: bei Brust 1.0 ist im krankheitsfreien Überleben sowohl
 * das Rezidiv (A) als auch der Tod ohne Rezidiv (C) ein Ereignis, beide
 * tragen delta = 1 und sind an der Kurve nicht zu unterscheiden. Eine
 * Zuordnung zu den Buchstaben müsste jede Regel zusätzlich führen; eine
 * falsche wäre schlimmer als keine. Hier stehen deshalb die Sachverhalte, die
 * der Schätzer wirklich unterscheidet.
 */
export interface Kohortenaufstellung {
  /** Alle übergebenen Fälle. Die hundert Prozent der Spezifikation. */
  primaerfaelle: number;
  /** Je Grund eine Zeile, nur Gründe mit mindestens einem Fall, absteigend. */
  ausschluesse: AusschlussZeile[];
  /** Fälle mit einem Ausschlussgrund. Summe der Zeilen. */
  ausgeschlossen: number;
  /** Anzahl unter Risiko zu Beginn der Kurve. */
  unterRisiko: number;
  /** Fälle der Risikomenge mit Ereignis, also delta = 1. */
  mitEreignis: number;
  /**
   * Konkurrierendes Ereignis statt des Ereignisses von Interesse. Nur die
   * Lokalrezidivrate kennt das: wer stirbt, bekommt kein Rezidiv mehr.
   */
  konkurrenzereignis: number;
  /** Zensiert und ohne Sterbedatum. */
  zensiertLebend: number;
  /**
   * Zensiert, aber mit Sterbedatum. Bleibt in mancher Box null, weil der Tod
   * dort als Ereignis zählt: bei Brust 1.0 ist der Tod ohne vorheriges
   * Rezidiv auch im krankheitsfreien Überleben ein Ereignis, das
   * Auswertungsblatt führt ihn als Kategorie C mit einer Ereigniszeit.
   */
  zensiertVerstorben: number;
  /**
   * In der Risikomenge, aber von der Regel keiner Kategorie zuzuordnen. Steht
   * eigens da, damit die Aufteilung aufgeht: ohne diese Zeile fehlten Fälle
   * zwischen "unter Risiko" und der Summe der Kategorien, ohne dass jemand
   * sähe, wo sie geblieben sind.
   */
  ohneBewertung: number;
}

/**
 * Zählt dieselben Regeln aus, nach denen kohorteFuerEndpunkt die Fälle
 * aussortiert. Reine Funktion, damit sie gegen die Beispieldatensätze der
 * Spezifikation geprüft werden kann.
 *
 * Die übergebenen Fälle sind die Grundgesamtheit der Aufstellung. Wer vorher
 * filtert, bekommt die Aufstellung der gefilterten Kohorte; die Spezifikation
 * meint die ungefilterte.
 */
export function kohortenaufstellung(faelle: OncoBoxCase[], regel: BoxRegel): Kohortenaufstellung {
  const zaehler = new Map<AusschlussGrund, number>();
  let unterRisiko = 0;
  let mitEreignis = 0;
  let konkurrenzereignis = 0;
  let zensiertLebend = 0;
  let zensiertVerstorben = 0;
  let ohneBewertung = 0;

  for (const fall of faelle) {
    const grund = regel.ausschluss(fall);
    if (grund) {
      zaehler.set(grund, (zaehler.get(grund) ?? 0) + 1);
      continue;
    }
    unterRisiko += 1;
    const bewertung = regel.bewerte(fall);
    if (!bewertung) {
      ohneBewertung += 1;
    } else if (bewertung.konkurrenz) {
      konkurrenzereignis += 1;
    } else if (bewertung.ereignis) {
      mitEreignis += 1;
    } else if (fall.deathDate) {
      zensiertVerstorben += 1;
    } else {
      zensiertLebend += 1;
    }
  }

  const primaerfaelle = faelle.length;
  const ausschluesse: AusschlussZeile[] = [...zaehler.entries()]
    .map(([grund, anzahl]) => ({
      grund,
      anzahl,
      anteil: primaerfaelle > 0 ? anzahl / primaerfaelle : 0,
    }))
    .sort((a, b) => b.anzahl - a.anzahl || a.grund.localeCompare(b.grund));

  return {
    primaerfaelle,
    ausschluesse,
    ausgeschlossen: primaerfaelle - unterRisiko,
    unterRisiko,
    mitEreignis,
    konkurrenzereignis,
    zensiertLebend,
    zensiertVerstorben,
    ohneBewertung,
  };
}
