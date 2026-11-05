import { gueltigeZeit, type KurvenSchaetzer } from "../../boxkurve";
import type { ZeitEinheit } from "../anwenden";
import { medianeZeitOhneEreignis, nachbeobachtung, type Nachbeobachtung } from "./kennzahlen";
import type { SchaetzerFall } from "@/utils/kaplan-meier";

/** Die Felder, die kennzahlenFuerKurve aus einem Fall braucht. */
export interface KennzahlenPatient {
  survivalTime: number | null | undefined;
  event?: boolean;
}

export interface KennzahlenErgebnis {
  nachbeobachtung: Nachbeobachtung | null;
  medianOhneEreignis: number | null;
}

/**
 * Nachbeobachtung und mediane ereignisfreie Zeit für dieselbe Kohorte, aus
 * der auch die daneben gezeichnete Kurve entsteht.
 *
 * Die Auswahl folgt gueltigeZeit, derselben Regel wie im Worker: eine Null
 * fällt in Monaten als Rundungsartefakt heraus, zählt in Tagen aber als
 * echtes Ereignis am Diagnosetag. Ohne diesen Gleichlauf beschriebe die Zeile
 * eine andere Kohorte als die Kurve, die sie begleitet.
 *
 * `schaetzer` ist dasselbe Verfahren, mit dem der Worker die Kurve zeichnet
 * (siehe kurvenSchaetzer in app/[locale]/(app)/results/page.tsx). Es kommt
 * von aussen, denn dieses Modul kennt die Kohorte nicht danach, in welcher
 * Zeiteinheit sie gerechnet wird: beides entscheidet sich zwar meist
 * gemeinsam an derselben Boxregel, ist aber nicht dasselbe Signal.
 */
export function kennzahlenFuerKurve(
  patienten: KennzahlenPatient[],
  zeitEinheit: ZeitEinheit,
  schaetzer: KurvenSchaetzer,
): KennzahlenErgebnis {
  const faelle: SchaetzerFall[] = patienten
    .filter(
      (p): p is KennzahlenPatient & { survivalTime: number } =>
        typeof p.survivalTime === "number" &&
        !Number.isNaN(p.survivalTime) &&
        gueltigeZeit(p.survivalTime, zeitEinheit),
    )
    .map((p) => ({ zeit: p.survivalTime, ereignis: Boolean(p.event) }));
  return {
    nachbeobachtung: nachbeobachtung(faelle),
    medianOhneEreignis: medianeZeitOhneEreignis(faelle, schaetzer),
  };
}

/** Übersetzte Bausteine der Zeile, damit die Formatierung ohne next-intl testbar bleibt. */
export interface KennzahlenTexte {
  dauer: string;
  median: string;
  min: string;
  max: string;
  ereignisfrei: string;
  nichtErreicht: string;
}

/**
 * Eine ruhige, einzeilige Zusammenfassung für die Anzeige unter Kurve und
 * Risikotabelle. Ohne Kohorte gibt es nichts zu zeigen; erreicht die Kurve
 * ihren Median nie, steht dort derselbe Hinweistext wie sonst in der
 * Anwendung, keine erfundene Zahl.
 */
export function formatiereKennzahlenZeile(
  ergebnis: KennzahlenErgebnis,
  einheit: string,
  texte: KennzahlenTexte,
): string | null {
  if (!ergebnis.nachbeobachtung) return null;
  const { median, min, max } = ergebnis.nachbeobachtung;
  const ereignisfreiWert =
    ergebnis.medianOhneEreignis !== null
      ? `${ergebnis.medianOhneEreignis.toFixed(1)} ${einheit}`
      : texte.nichtErreicht;
  return (
    `${texte.dauer}: ${texte.median} ${median.toFixed(1)} ${einheit} ` +
    `(${texte.min} ${min.toFixed(1)}, ${texte.max} ${max.toFixed(1)}) ` +
    `· ${texte.ereignisfrei}: ${ereignisfreiWert}`
  );
}
