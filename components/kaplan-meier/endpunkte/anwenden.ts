import type { Patient } from "../obds-parser-new";
import type { OncoBoxCase } from "../oncobox/types";
import { calculateDFSFromOBDS } from "./dfs";
import { boxRegelFuer, type BoxRegel } from "./boxregeln";
import { KEIN_START, zeitAusDatumsfeldern } from "./allgemeine-regel";
import type { EndpunktDefinition, SchaetzerArt } from "./typen";

/**
 * Verfahren, mit dem dieser Endpunkt gerechnet wird. Sieben von acht nutzen
 * Kaplan-Meier; die Lokalrezidivrate nutzt die kumulative Inzidenz, weil der
 * Tod dort konkurriert statt zu zensieren.
 */
export function schaetzerFuer(definition: EndpunktDefinition): SchaetzerArt {
  return definition.regel?.schaetzer ?? "kaplanMeier";
}

export interface EndpunktZeit {
  survivalTime: number;
  event: boolean;
  /**
   * Datum, auf das sich survivalTime bezieht. Es überschreibt followupDate,
   * damit Tabelle und Export dasselbe Ereignis zeigen wie die daneben stehende
   * Zeit. Ohne das stünde die Zeit bis zum Rezidiv neben dem Datum des letzten
   * Follow-ups.
   */
  followupDate: Date | null;
  /**
   * Einheit von survivalTime. Die Boxspezifikationen rechnen in Tagen, der
   * übrige Code in Monaten. Ohne diese Angabe stünde eine Kurve mit 365 unter
   * einer Achse, die Monate behauptet.
   */
  zeitEinheit: ZeitEinheit;
  /**
   * Der Fall endete durch ein konkurrierendes Ereignis. Nur die
   * Lokalrezidivrate deklariert dafür Felder; alle übrigen Endpunkte liefern
   * hier false. Ohne dieses Durchreichen käme ein Todesfall beim Schätzer als
   * Zensierung an, also als "könnte noch ein Rezidiv bekommen".
   */
  konkurrenz: boolean;
}

/**
 * Zeit und Ereignis eines Falls für den gewählten Endpunkt.
 *
 * Ein Endpunkt ohne freigegebene Regel liefert Zeit null statt einer
 * erfundenen Kurve. Die Oberfläche sperrt ihn ohnehin; das hier ist die
 * zweite Sicherung, falls er doch bis hierher durchkommt.
 */
export function zeitUndEreignis(
  definition: EndpunktDefinition,
  patient: Patient,
): EndpunktZeit {
  if (!definition.regel) return KEIN_START;

  if (definition.id === "dfs") {
    const dfs = calculateDFSFromOBDS(patient, "diagnosisDate");
    return {
      survivalTime: dfs.dfsTimeMonths,
      event: dfs.dfsEvent === 1,
      followupDate: dfs.eventDate,
      zeitEinheit: "monate",
      konkurrenz: false,
    };
  }

  // Gesamtüberleben und Zeit bis zur Ersttherapie stehen bereits fertig am
  // Patienten: beide Parser rechnen sie beim Einlesen aus. Die allgemeine
  // Auswertung darunter greift nur für Endpunkte, deren Zeit hier noch nicht
  // am Fall steht.
  if (definition.id === "oas" || definition.id === "ttft") {
    return {
      survivalTime: patient.survivalTime ?? 0,
      event: Boolean(patient.event),
      followupDate: patient.followupDate ?? null,
      zeitEinheit: "monate",
      konkurrenz: false,
    };
  }

  // Die fünf allgemeinen Regeln: LRR, LRFS, MFS, PFS und PPS. Sie lesen ihre
  // Ereignisse aus Datumsfeldern, siehe allgemeine-regel.ts.
  return zeitAusDatumsfeldern(definition.regel, patient);
}

export type ZeitEinheit = "tage" | "monate";

/** Boxregel dieses Falls für diesen Endpunkt, oder null. */
function regelFuer(definition: EndpunktDefinition, patient: Patient): BoxRegel | null {
  return boxRegelFuer(patient.oncoBox?.profileId ?? null, definition.id);
}

function boxFall(patient: Patient): OncoBoxCase | null {
  return patient.oncoBox?.fall ?? null;
}

/**
 * Einheit, in der die Kohorte für diesen Endpunkt rechnet. Sobald ein Fall
 * über eine Boxregel läuft, gilt sie für die ganze Kurve: eine Achse mit zwei
 * Einheiten gäbe es sonst.
 */
export function zeitEinheitDerKohorte(
  definition: EndpunktDefinition | undefined,
  patients: Patient[],
): ZeitEinheit {
  if (!definition) return "monate";
  return patients.some((patient) => regelFuer(definition, patient)) ? "tage" : "monate";
}

/**
 * Kohorte, auf die der gewählte Endpunkt angewendet ist.
 *
 * Eine einzige Ableitung für Kurve, Tabelle, Kacheln, Cox-Analyse und Export.
 * Läge sie in der Kurvenberechnung, zeigte jeder andere Verbraucher weiter die
 * Rohfelder, also das Gesamtüberleben, unter der Beschriftung des gewählten
 * Endpunkts.
 *
 * Das Gesamtüberleben steht bereits an jedem Fall: die Kohorte geht dann
 * unverändert durch, damit der Regelfall unangetastet bleibt.
 */
export function kohorteFuerEndpunkt(
  definition: EndpunktDefinition | undefined,
  patients: Patient[],
): Patient[] {
  if (!definition) return patients;

  // Erste Ebene: die Vorschrift der Box. Sie kennt Ausschlusskriterien und
  // Ereigniskategorien, die keine allgemeine Regel abbilden kann, und sie
  // unterscheidet sich zwischen den Boxen.
  const mitBoxregel = patients.filter((patient) => regelFuer(definition, patient));
  if (mitBoxregel.length > 0) {
    const ergebnis: Patient[] = [];
    for (const patient of mitBoxregel) {
      const regel = regelFuer(definition, patient);
      const fall = boxFall(patient);
      if (!regel || !fall) continue;
      if (regel.ausschluss(fall)) continue;
      const bewertung = regel.bewerte(fall);
      if (!bewertung) continue;
      const fenster = regel.beobachtungsfensterTage;
      if (fenster !== null && bewertung.zeitTage > fenster) {
        // Außerhalb des Beobachtungszeitraums der Box: zensiert am Rand,
        // nicht weggeworfen. Der Fall trug bis dorthin zur Risikomenge bei.
        ergebnis.push({
          ...patient,
          survivalTime: fenster,
          event: false,
          followupDate: null,
          konkurrenz: false,
        });
        continue;
      }
      ergebnis.push({
        ...patient,
        survivalTime: bewertung.zeitTage,
        event: bewertung.ereignis,
        followupDate: new Date(bewertung.datum),
        // Nur bei der Lokalrezidivrate gesetzt. Ohne dieses Durchreichen käme
        // ein Todesfall beim Schätzer als Zensierung an, also als "könnte
        // noch ein Rezidiv bekommen", und die Rate wäre wieder zu hoch.
        konkurrenz: bewertung.konkurrenz ?? false,
      });
    }
    // Tage, nicht Monate: eine Null ist hier kein Rundungsartefakt, sondern
    // ein echtes Ereignis am Diagnosetag. Nur echte Negativwerte fallen raus,
    // und die meldet bereits regel.bewerte als null, bevor der Fall hier
    // ankommt.
    return ergebnis.filter((patient) => (patient.survivalTime ?? 0) >= 0);
  }

  if (definition.id === "oas") return patients;

  // Der Einschluss "tumorfreiNachPrimaertherapie" gilt für jede Regel, die ihn
  // deklariert, nicht nur für DFS: LRR, LRFS und MFS setzen ihn ebenso voraus,
  // wer nach der Primärtherapie noch Tumor hatte, kann kein Lokalrezidiv im
  // Sinne dieser Endpunkte mehr bekommen. Der oBDS-Parser und der
  // OncoBox-Importer setzen dfsEligible unabhängig vom gewählten Endpunkt.
  // Quellen ohne Aussage lassen das Merkmal undefined; solche Fälle bleiben
  // drin, sonst verlöre jede CSV-Kohorte diese Endpunkte.
  const auswertbare =
    definition.regel?.einschluss === "tumorfreiNachPrimaertherapie"
      ? patients.filter((patient) => patient.dfsEligible !== false)
      : patients;

  const zeiten = auswertbare.map((patient) => ({
    ...patient,
    ...zeitUndEreignis(definition, patient),
  }));

  // DFS und TTFT behalten die bisherige Schwelle: Zeit null heißt dort
  // "keine Auswertung möglich" und fällt heraus. Gesamtüberleben erreicht
  // diese Zeile ohnehin nie, siehe die frühen Rückgaben oben. Bei den fünf
  // allgemeinen Regeln ist eine Null dagegen eine echte Zensierung ohne
  // bekanntes Datum, siehe zeitUndEreignis; ausgeschlossen wird dort nur der
  // negative Sentinelwert von KEIN_START.
  const schwelle = definition.id === "dfs" || definition.id === "ttft" ? 0 : -1;
  return zeiten.filter((patient) => patient.survivalTime > schwelle);
}
