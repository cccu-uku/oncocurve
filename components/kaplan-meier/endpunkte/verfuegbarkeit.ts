import type { Patient } from "../obds-parser-new";
import { boxRegelFuer } from "./boxregeln";
import type { EndpunktDefinition, EreignisDatumsfeld } from "./typen";

/**
 * Zwei getrennte Sperrgründe. "wir kennen die Regel noch nicht" und "diese
 * Kohorte gibt es nicht her" sind verschiedene Aussagen, und nur die zweite
 * kann der Anwender durch einen anderen Upload beheben.
 */
export type SperrGrund = "regelFehlt" | "datenFehlen";

export interface Verfuegbarkeit {
  verfuegbar: boolean;
  grund: SperrGrund | null;
  /** Feld, das fehlt. Nur bei grund "datenFehlen" gesetzt. */
  fehlendesFeld: string | null;
}

const FREI: Verfuegbarkeit = { verfuegbar: true, grund: null, fehlendesFeld: null };

/**
 * Feldangabe für einen Datensatz, den der CSV-Parser als Zeit bis zur
 * Ersttherapie eingelesen hat. Kein Feldname, sondern eine Kennung: die
 * Oberfläche zeigt dafür einen eigenen Satz statt der Feldmeldung.
 */
export const TTFT_DATENSATZ = "ttftDatensatz";

/**
 * Hat der Parser diesen Datensatz auf die Zeit bis zur Ersttherapie ausgelegt?
 * Dann führen survivalTime und event bereits diesen Endpunkt.
 */
export function istTtftDatensatz(patients: Patient[]): boolean {
  return patients.some((patient) => (patient as { endpoint?: string }).endpoint === "ttft");
}

function gesperrt(grund: SperrGrund, fehlendesFeld: string | null = null): Verfuegbarkeit {
  return { verfuegbar: false, grund, fehlendesFeld };
}

/**
 * Dreiwertiges Einschlussmerkmal für das krankheitsfreie Überleben.
 *
 * true und false sind Aussagen der Quelle, undefined heißt "die Quelle sagt
 * nichts dazu". Der oBDS-Parser und der OncoBox-Importer setzen den Wert
 * bewusst, der CSV- und Excel-Pfad kennt ihn nicht. Wer undefined beim
 * Einlesen zu false macht, sperrt jede CSV-Kohorte vom krankheitsfreien
 * Überleben aus, auch die mit Rezidivdatum.
 */
export function normalisiereDfsEligible(wert: unknown): boolean | undefined {
  if (wert === true) return true;
  if (wert === false) return false;
  return undefined;
}

function traegtDatum(patient: Patient, feld: EreignisDatumsfeld): boolean {
  return Boolean((patient as unknown as Record<string, unknown>)[feld]);
}

/**
 * Kann dieser Endpunkt auf dieser Kohorte gerechnet werden? Geprüft wird am
 * Datensatz, nicht an der Quelle: ob die nötigen Felder da sind, entscheidet
 * die Datei, nicht das Dateiformat.
 */
export function pruefeVerfuegbarkeit(
  definition: EndpunktDefinition,
  patients: Patient[],
): Verfuegbarkeit {
  // Regel zuerst: fehlt sie, ist das der Grund, den kein Upload beheben kann.
  // Umgekehrt bekäme ein gesperrter Endpunkt auf leerer Kohorte "datenFehlen"
  // gemeldet und der Anwender suchte nach Daten, die nichts ändern.
  const regel = definition.regel;
  if (!regel) return gesperrt("regelFehlt");

  if (patients.length === 0) return gesperrt("datenFehlen");

  // Eine Box mit eigener Rechenvorschrift braucht die Feldprüfungen darunter
  // nicht: sie liest ihre Ereignisse aus der Verlaufsserie, nicht aus den
  // Datumsfeldern, die der oBDS-Pfad erwartet. Ohne diesen Vorrang sperrte die
  // Prüfung DFS für jede OncoBox-Kohorte, weil dort rezidivDatum fehlt.
  const mitBoxregel = patients.some((patient) =>
    boxRegelFuer(patient.oncoBox?.profileId ?? null, definition.id),
  );
  if (mitBoxregel) return FREI;

  // Bei erkannter Behandlungsdatumsspalte rechnet der CSV-Parser survivalTime
  // als Zeit bis zur Ersttherapie und event als "Therapie begonnen". Die
  // Gesamtüberlebenszeit ist damit schon beim Einlesen verloren; sie hier
  // anzubieten hieße, dieselbe Kurve unter anderer Beschriftung zu zeigen.
  if (definition.id === "oas" && istTtftDatensatz(patients)) {
    return gesperrt("datenFehlen", TTFT_DATENSATZ);
  }

  // PPS beginnt bei der Progression, nicht bei der Diagnose. Ohne ein
  // Progressionsdatum gibt es keinen Startzeitpunkt, ganz unabhängig davon,
  // ob todDatum vorliegt. Ohne diese Prüfung meldete die Verfügbarkeit "frei"
  // und kohorteFuerEndpunkt warf danach jeden Fall über den Start-Sentinel
  // wieder heraus: ein grünes Licht auf eine leere Kurve.
  if (regel.start === "progression") {
    const hatStart = patients.some((patient) => traegtDatum(patient, "progressionDatum"));
    if (!hatStart) return gesperrt("datenFehlen", "progressionDatum");
  }

  if (regel.datumsfelder && regel.datumsfelder.length > 0) {
    // Das Merkmal gehört zum Einschluss "tumorfrei nach Primärtherapie", nicht
    // zu den Datumsfeldern. An deren Vorhandensein geknüpft sperrte es auch
    // PFS, PPS und die Zeit bis zur Ersttherapie, sobald eine Quelle jeden Fall
    // als nicht tumorfrei meldet, obwohl die drei etwas anderes voraussetzen.
    // Gleiche Bedingung wie in kohorteFuerEndpunkt.
    const tumorfreiGefordert = regel.einschluss === "tumorfreiNachPrimaertherapie";
    const auswertbar = patients.some(
      (patient) =>
        (!tumorfreiGefordert || patient.dfsEligible !== false) &&
        regel.datumsfelder?.some((feld) => traegtDatum(patient, feld)),
    );
    if (!auswertbar) {
      // Das erste Feld, das keine Zeile führt. Pauschal das erste der Liste zu
      // melden schickte den Anwender nach einem Feld suchen, das er längst
      // mitliefert.
      const fehlend =
        regel.datumsfelder.find((feld) => !patients.some((p) => traegtDatum(p, feld))) ??
        regel.datumsfelder[0];
      return gesperrt("datenFehlen", fehlend);
    }
  }

  return FREI;
}
