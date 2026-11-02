/** Zentrumstypen nach OnkoZert, bestätigt durch das Zentrum am 21.08.2026. */
export type ZentrumsTyp =
  | "BZ"
  | "DZ"
  | "LZ"
  | "PZ"
  | "OZ"
  | "GZ"
  | "HZ"
  | "HAEZ"
  | "MB"
  | "MH"
  | "MN"
  | "MP"
  | "MPEN";

export const ZENTRUMS_TYPEN: ZentrumsTyp[] = [
  "BZ",
  "DZ",
  "LZ",
  "PZ",
  "OZ",
  "GZ",
  "HZ",
  "HAEZ",
  "MB",
  "MH",
  "MN",
  "MP",
  "MPEN",
];

export type EndpunktId =
  | "oas"
  | "ttft"
  | "lrr"
  | "lrfs"
  | "mfs"
  | "dfs"
  | "pfs"
  | "pps";

/** Datumsfelder am Patienten, aus denen ein Ereignis abgeleitet werden kann. */
export type EreignisDatumsfeld =
  | "firstTreatmentDate"
  | "rezidivDatum"
  | "metastasenDatum"
  | "todDatum"
  | "progressionDatum";

/** Wer überhaupt in die Auswertung eingeht. */
export type Einschluss = "alle" | "tumorfreiNachPrimaertherapie";

export interface EndpunktRegel {
  /** Woher der Startzeitpunkt kommt. */
  start: "diagnose" | "therapiebeginn" | "progression";
  /**
   * Ereignis aus Datumsfeldern am Patienten. Das früheste vorhandene Datum
   * zählt. DFS nutzt drei davon, TTFT eines.
   */
  datumsfelder?: EreignisDatumsfeld[];
  /** Tod als eigenes Ereignis, nicht nur als Zensierungsgrund. */
  todAlsEreignis: boolean;
  einschluss: Einschluss;
  /** Belegstelle, damit jede Festlegung rückverfolgbar bleibt. */
  quelle: string;
  herkunft: Herkunft;
  schaetzer: SchaetzerArt;
  /**
   * Nur bei kumulativer Inzidenz: Felder, deren Eintreten das Ereignis von
   * Interesse ausschließt, statt es zu zensieren. Bei der Lokalrezidivrate
   * ist das der Tod.
   */
  konkurrenzfelder?: EreignisDatumsfeld[];
}

export interface EndpunktDefinition {
  id: EndpunktId;
  kuerzel: string;
  /** Übersetzungsschlüssel im Namensraum Endpoint, kein fester Text. */
  labelKey: string;
  /**
   * Zentrumstypen, für die der Erhebungsbogen den Endpunkt verlangt. Leer bei
   * TTFT: der Endpunkt gehört zur freien Analyse und taucht im
   * Zertifizierungsmodus nicht auf.
   */
  pflichtFuer: ZentrumsTyp[];
  /** Zentrumstypen, für die der Endpunkt wahlweise statt eines anderen gilt. */
  alternativFuer: ZentrumsTyp[];
  /** null heißt: Rechenvorschrift nicht freigegeben, Endpunkt gesperrt. */
  regel: EndpunktRegel | null;
}

/**
 * Woher eine Rechenvorschrift stammt. Steht auf der Hilfeseite und in der
 * Exportdatei, damit niemand eine aus der Literatur abgeleitete Kurve für
 * eine Vorgabe des Zertifizierers hält.
 *
 * spezifikation: wörtlich aus dem Auswertungsblatt einer OncoBox.
 * abgeleitet:    aus der Ereignisdefinition derselben Box gefolgert, dort
 *                aber nicht als Kurve vorgeschrieben.
 * literatur:     aus den veröffentlichten Standards für Studienendpunkte.
 * bestehend:     war vor diesem Plan schon so implementiert.
 */
export type Herkunft = "spezifikation" | "abgeleitet" | "literatur" | "bestehend";

/** Welches Verfahren die Kurve rechnet. */
export type SchaetzerArt = "kaplanMeier" | "kumulativeInzidenz";
