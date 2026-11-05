import type { BoxCodes } from "./verlaufsregel";
import { verlaufsRegel } from "./verlaufsregel";

// Familie 2.0 codiert die Verlaufsfelder mit K, R und U und führt in der
// Gesamtbeurteilung ein Progressionsfeld, anders als Brust 1.0 und Darm 1.0.
const FAMILY_CODES: BoxCodes = {
  nachweis: "R",
  progression: "P",
  biochemisch: null,
};

const FAMILY_QUELLE =
  "STEEP 2.0 und DATECAN, auf die Verlaufscodes der Familie 2.0 übertragen";

export const FAMILY_2_LRR = verlaufsRegel({
  boxId: "family-2",
  endpunkt: "lrr",
  quelle: FAMILY_QUELLE,
  codes: FAMILY_CODES,
  felder: ["lokal", "lymphknoten"],
  todAlsEreignis: false,
  schaetzer: "kumulativeInzidenz",
  beobachtungsfensterTage: null,
});

export const FAMILY_2_LRFS = verlaufsRegel({
  boxId: "family-2",
  endpunkt: "lrfs",
  quelle: FAMILY_QUELLE,
  codes: FAMILY_CODES,
  felder: ["lokal", "lymphknoten"],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
});

export const FAMILY_2_MFS = verlaufsRegel({
  boxId: "family-2",
  endpunkt: "mfs",
  quelle: FAMILY_QUELLE,
  codes: FAMILY_CODES,
  felder: ["fern"],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
});

export const FAMILY_2_PFS = verlaufsRegel({
  boxId: "family-2",
  endpunkt: "pfs",
  quelle: FAMILY_QUELLE,
  codes: FAMILY_CODES,
  felder: ["gesamt"],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
});

export const FAMILY_2_PPS = verlaufsRegel({
  boxId: "family-2",
  endpunkt: "pps",
  quelle: FAMILY_QUELLE,
  codes: FAMILY_CODES,
  felder: [],
  todAlsEreignis: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
  startBeiProgression: true,
});
