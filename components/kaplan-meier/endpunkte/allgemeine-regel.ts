import type { Patient } from "../obds-parser-new";
import type { EndpunktRegel } from "./typen";
import type { EndpunktZeit } from "./anwenden";

const TAGE_PRO_MONAT = 30.4375;
const MILLISEKUNDEN_PRO_TAG = 1000 * 60 * 60 * 24;

function datumWert(patient: Patient, feld: string): string | null {
  const wert = (patient as unknown as Record<string, unknown>)[feld];
  if (!wert) return null;
  const datum = wert instanceof Date ? wert : new Date(String(wert));
  return Number.isNaN(datum.getTime()) ? null : datum.toISOString().slice(0, 10);
}

function monateZwischen(vonIso: string, bisIso: string): number {
  const tage = (Date.parse(bisIso) - Date.parse(vonIso)) / MILLISEKUNDEN_PRO_TAG;
  if (Number.isNaN(tage) || tage < 0) return 0;
  return tage / TAGE_PRO_MONAT;
}

// -1, nicht 0: eine echte Zensierung ohne bekanntes Datum liefert unten
// ebenfalls die Zeit 0, gehört aber in die Kohorte, siehe kohorteFuerEndpunkt.
// Nur der negative Wert markiert eindeutig "kein gültiger Startzeitpunkt",
// zum Beispiel PPS ohne Progressionsdatum. Exportiert, weil zeitUndEreignis in
// anwenden.ts denselben Sentinelwert für eine fehlende Regel braucht.
export const KEIN_START: EndpunktZeit = {
  survivalTime: -1,
  event: false,
  followupDate: null,
  zeitEinheit: "monate",
  konkurrenz: false,
};

/** Frühestes vorhandenes Datum aus einer Feldliste, oder null. */
function fruehestes(patient: Patient, felder: readonly string[] | undefined): string | null {
  return (
    (felder ?? [])
      .map((feld) => datumWert(patient, feld))
      .filter((wert): wert is string => Boolean(wert))
      .sort()[0] ?? null
  );
}

/**
 * Zeit und Ereignis aus den Datumsfeldern einer allgemeinen Regel: LRR, LRFS,
 * MFS, PFS und PPS. Gesamtüberleben, TTFT und DFS haben ihre eigene
 * Berechnung, siehe zeitUndEreignis in anwenden.ts.
 */
export function zeitAusDatumsfeldern(regel: EndpunktRegel, patient: Patient): EndpunktZeit {
  // PPS beginnt bei der Progression. Ohne sie gehört der Fall nicht in die
  // Auswertung, deshalb Zeit null; der Filter in kohorteFuerEndpunkt wirft
  // ihn heraus.
  const start =
    regel.start === "progression"
      ? datumWert(patient, "progressionDatum")
      : (patient.diagnosisDate ?? null);
  if (!start) return KEIN_START;

  const ereignisDatum = fruehestes(patient, regel.datumsfelder);
  // Nur die Lokalrezidivrate führt konkurrenzfelder: Tod und Fernmetastase
  // schließen ein Lokalrezidiv aus, statt es offen zu lassen. Ohne diese Zeilen
  // liefe ein Todesfall als Zensierung in die Kurve, und die Rate wäre um genau
  // den Betrag zu hoch, wegen dessen der Endpunkt die kumulative Inzidenz nutzt.
  const konkurrenzDatum = fruehestes(patient, regel.konkurrenzfelder);

  if (ereignisDatum && (!konkurrenzDatum || ereignisDatum <= konkurrenzDatum)) {
    return {
      survivalTime: monateZwischen(start, ereignisDatum),
      event: true,
      followupDate: new Date(ereignisDatum),
      zeitEinheit: "monate",
      konkurrenz: false,
    };
  }

  if (konkurrenzDatum) {
    return {
      survivalTime: monateZwischen(start, konkurrenzDatum),
      event: false,
      followupDate: new Date(konkurrenzDatum),
      zeitEinheit: "monate",
      konkurrenz: true,
    };
  }

  const zensur = datumWert(patient, "nachsorgeDatum") ?? patient.followupDate ?? null;
  return {
    survivalTime: zensur ? monateZwischen(start, String(zensur)) : 0,
    event: false,
    followupDate: zensur ? new Date(String(zensur)) : null,
    zeitEinheit: "monate",
    konkurrenz: false,
  };
}
