import { FUENF_JAHRE_TAGE } from "./darm-1-fenster";
import type { BoxCodes } from "./verlaufsregel";
import { verlaufsRegel } from "./verlaufsregel";

// Darm 1.0 codiert die Verlaufsfelder mit Ziffern statt mit Buchstaben und
// führt in der Gesamtbeurteilung gar kein Feld, deshalb kein PFS und kein
// PPS, das ist eine Datenlücke der Box.
const DARM_CODES: BoxCodes = {
  nachweis: "1",
  progression: null,
  biochemisch: null,
};

const DARM_QUELLE = "STEEP 2.0, auf die Verlaufscodes der Box Darm 1.0 übertragen";

// Darm 1.0 führt kein Sterbedatum, weder am Patienten noch am Fall. Der Tod
// steht als Vitalstatus im Follow-up, so wie ihn auch das OAS-Blatt der Box
// liest. Alle drei Regeln hier müssen ihn von dort nehmen.

export const DARM_1_LRR = verlaufsRegel({
  boxId: "darm-1",
  endpunkt: "lrr",
  quelle: DARM_QUELLE,
  codes: DARM_CODES,
  felder: ["lokal", "lymphknoten"],
  todAlsEreignis: false,
  todImVerlauf: true,
  schaetzer: "kumulativeInzidenz",
  beobachtungsfensterTage: FUENF_JAHRE_TAGE,
});

export const DARM_1_LRFS = verlaufsRegel({
  boxId: "darm-1",
  endpunkt: "lrfs",
  quelle: DARM_QUELLE,
  codes: DARM_CODES,
  felder: ["lokal", "lymphknoten"],
  todAlsEreignis: true,
  todImVerlauf: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: FUENF_JAHRE_TAGE,
});

export const DARM_1_MFS = verlaufsRegel({
  boxId: "darm-1",
  endpunkt: "mfs",
  quelle: DARM_QUELLE,
  codes: DARM_CODES,
  felder: ["fern"],
  todAlsEreignis: true,
  todImVerlauf: true,
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: FUENF_JAHRE_TAGE,
});
