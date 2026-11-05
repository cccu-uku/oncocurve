import type { BoxCodes } from "./verlaufsregel";
import { verlaufsRegel } from "./verlaufsregel";

// Prostata 1.0 codiert die Verlaufsfelder mit englischen Buchstaben und
// führt als einzige Box ein biochemisches Rezidiv.
const PROSTATA_CODES: BoxCodes = {
  nachweis: "R",
  progression: "P",
  biochemisch: "Y",
};

const PROSTATA_QUELLE =
  "STEEP 2.0 und DATECAN, auf die Verlaufscodes der Box Prostata 1.0 übertragen";

// LRR und LRFS bekommen zusätzlich das Feld "biochemisch", weil das
// biochemische Rezidiv bei Prostata der früheste Rezidivnachweis ist. Ohne
// "lymphknoten": die Box führt im Follow-up kein eigenes Lymphknotenfeld.
export const PROSTATA_1_LRR = verlaufsRegel({
  boxId: "prostata-1",
  endpunkt: "lrr",
  quelle: PROSTATA_QUELLE,
  codes: PROSTATA_CODES,
  felder: ["lokal", "biochemisch"],
  todAlsEreignis: false,
  schaetzer: "kumulativeInzidenz",
  beobachtungsfensterTage: null,
});

export const PROSTATA_1_LRFS = verlaufsRegel({
  boxId: "prostata-1",
  endpunkt: "lrfs",
  quelle: PROSTATA_QUELLE,
  codes: PROSTATA_CODES,
  felder: ["lokal", "biochemisch"],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
});

export const PROSTATA_1_MFS = verlaufsRegel({
  boxId: "prostata-1",
  endpunkt: "mfs",
  quelle: PROSTATA_QUELLE,
  codes: PROSTATA_CODES,
  felder: ["fern"],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
});

export const PROSTATA_1_PFS = verlaufsRegel({
  boxId: "prostata-1",
  endpunkt: "pfs",
  quelle: PROSTATA_QUELLE,
  codes: PROSTATA_CODES,
  felder: ["gesamt"],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
});

export const PROSTATA_1_PPS = verlaufsRegel({
  boxId: "prostata-1",
  endpunkt: "pps",
  quelle: PROSTATA_QUELLE,
  codes: PROSTATA_CODES,
  felder: [],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
  startBeiProgression: true,
});
