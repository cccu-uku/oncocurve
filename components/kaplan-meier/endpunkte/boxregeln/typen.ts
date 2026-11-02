import type { OncoBoxCase } from "../../oncobox/types";
import type { Herkunft, SchaetzerArt } from "../typen";

// Weiterreichen, damit die Nachbardateien dieses Zweigs nur aus ./typen
// importieren müssen und nicht quer in den Endpunktnamensraum greifen.
export type { Herkunft, SchaetzerArt };

/**
 * Warum ein Fall nicht in der Risikomenge steht. Die Werte sind
 * Übersetzungsschlüssel im Namensraum OncoBox.exclusion, kein Anzeigetext.
 */
export type AusschlussGrund =
  | "postoperativNichtTumorfrei"
  | "krebsvorerkrankung"
  | "keinFollowUp"
  | "keinUiccStadium"
  | "uiccVier"
  | "postoperativVerstorben"
  | "synchronerPrimaertumor"
  | "keineVollremission"
  | "keinDiagnosedatum"
  | "unkategorisiert"
  | "keineProgression";

export interface BoxBewertung {
  /** Zeit in Tagen seit dem Diagnosedatum. */
  zeitTage: number;
  /** true entspricht δ = 1 der Spezifikation. */
  ereignis: boolean;
  /** Datum, auf das sich zeitTage bezieht, für Tabelle und Export. */
  datum: string;
  /**
   * Der Fall endete durch ein konkurrierendes Ereignis, nicht durch das
   * Ereignis von Interesse. Nur bei der Lokalrezidivrate gesetzt: wer stirbt,
   * bekommt kein Rezidiv mehr, und die kumulative Inzidenz muss das von einer
   * Zensierung unterscheiden können. Ohne dieses Feld käme ein Todesfall
   * dort als "noch unter Beobachtung" an, und die Rate wäre wieder zu hoch.
   */
  konkurrenz?: boolean;
}

/**
 * Rechenvorschrift einer Box für einen Endpunkt. Zwei reine Funktionen: die
 * erste bestimmt die Risikomenge, die zweite Zeit und Ereignis. Getrennt,
 * weil die Spezifikationen sie getrennt führen und weil die Zahl der
 * Ausgeschlossenen je Grund selbst eine geforderte Kennzahl ist.
 */
export interface BoxRegel {
  /** Kennung aus Box und Endpunkt, etwa "brust-1/dfs". */
  id: string;
  /** Datei und Blatt, aus dem die Regel stammt. Steht auf der Hilfeseite. */
  quelle: string;
  /** Worauf die Regel beruht. Erscheint neben der Kurve und im Export. */
  herkunft: Herkunft;
  /** Kaplan-Meier, oder kumulative Inzidenz bei der Lokalrezidivrate. */
  schaetzer: SchaetzerArt;
  /**
   * Kurve nach dieser Zeit abschneiden, in Tagen. null heißt kein Schnitt.
   * Nur Darm 1.0 begrenzt den Beobachtungszeitraum, auf 5 Jahre.
   */
  beobachtungsfensterTage: number | null;
  /** null heißt: der Fall steht in der Risikomenge. */
  ausschluss(fall: OncoBoxCase): AusschlussGrund | null;
  /** null heißt: keiner Kategorie zuzuordnen, der Fall fällt heraus. */
  bewerte(fall: OncoBoxCase): BoxBewertung | null;
}
