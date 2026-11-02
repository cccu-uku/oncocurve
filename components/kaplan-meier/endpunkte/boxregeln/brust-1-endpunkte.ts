import type { BoxCodes } from "./verlaufsregel";
import { verlaufsRegel } from "./verlaufsregel";

// Brust 1.0 codiert die Verlaufsfelder mit Buchstaben. Die Gültigkeitstabelle
// des Auswertungsblatts lässt in der Gesamtbeurteilung VR, TR, NC und P zu, das
// Feld führt den Wert P also. Die Kategorien des Blatts nutzen ihn aber nicht:
// keine von ihnen greift auf eine Progression zu. Deshalb kein PFS und kein
// PPS, für sie gibt es bei dieser Box keine vorgeschriebene Regel.
const BRUST_CODES: BoxCodes = {
  nachweis: "R",
  // null heißt hier "keine vorgeschriebene Regel", nicht "Feld ohne Wert".
  progression: null,
  biochemisch: null,
};

const BRUST_QUELLE = "STEEP 2.0, auf die Verlaufscodes der Box Brust 1.0 übertragen";

export const BRUST_1_LRR = verlaufsRegel({
  boxId: "brust-1",
  endpunkt: "lrr",
  quelle: BRUST_QUELLE,
  codes: BRUST_CODES,
  felder: ["lokal", "lymphknoten"],
  todAlsEreignis: false,
  schaetzer: "kumulativeInzidenz",
  beobachtungsfensterTage: null,
});

export const BRUST_1_LRFS = verlaufsRegel({
  boxId: "brust-1",
  endpunkt: "lrfs",
  quelle: BRUST_QUELLE,
  codes: BRUST_CODES,
  felder: ["lokal", "lymphknoten"],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
});

export const BRUST_1_MFS = verlaufsRegel({
  boxId: "brust-1",
  endpunkt: "mfs",
  quelle: BRUST_QUELLE,
  codes: BRUST_CODES,
  felder: ["fern"],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
});
