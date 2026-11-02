import type { EndpunktId } from "../typen";
import { BRUST_1_DFS, BRUST_1_LRFS, BRUST_1_LRR, BRUST_1_MFS, BRUST_1_OAS } from "./brust-1";
import { DARM_1_DFS, DARM_1_LRFS, DARM_1_LRR, DARM_1_MFS, DARM_1_OAS } from "./darm-1";
import {
  FAMILY_2_DFS,
  FAMILY_2_LRFS,
  FAMILY_2_LRR,
  FAMILY_2_MFS,
  FAMILY_2_OAS,
  FAMILY_2_PFS,
  FAMILY_2_PPS,
} from "./family-2";
import {
  PROSTATA_1_DFS,
  PROSTATA_1_LRFS,
  PROSTATA_1_LRR,
  PROSTATA_1_MFS,
  PROSTATA_1_OAS,
  PROSTATA_1_PFS,
  PROSTATA_1_PPS,
} from "./prostata-1";
import type { BoxRegel } from "./typen";

export type { AusschlussGrund, BoxBewertung, BoxRegel } from "./typen";

/**
 * Regeln je Paar aus Box und Endpunkt. Die äußere Ebene ist die Box, weil
 * derselbe Endpunkt zwischen Boxen unterschiedlich zensiert; eine Tabelle
 * allein nach Endpunkt trüge diese Unterschiede nicht.
 *
 * Ein fehlender Eintrag heißt: für dieses Paar gibt es keine freigegebene
 * Boxvorschrift. Dann greift die allgemeine Regel aus regeln.ts, dieselbe wie
 * für oBDS, CSV, TXT und Excel. Für Brust 1.0 und Darm 1.0 schreibt kein
 * Auswertungsblatt eine Regel für die Progression vor, deshalb bleiben pfs und
 * pps dort unbelegt.
 */
const REGELN: Record<string, Partial<Record<EndpunktId, BoxRegel>>> = {
  "brust-1": {
    dfs: BRUST_1_DFS,
    oas: BRUST_1_OAS,
    lrr: BRUST_1_LRR,
    lrfs: BRUST_1_LRFS,
    mfs: BRUST_1_MFS,
  },
  "darm-1": {
    dfs: DARM_1_DFS,
    oas: DARM_1_OAS,
    lrr: DARM_1_LRR,
    lrfs: DARM_1_LRFS,
    mfs: DARM_1_MFS,
  },
  "prostata-1": {
    dfs: PROSTATA_1_DFS,
    oas: PROSTATA_1_OAS,
    lrr: PROSTATA_1_LRR,
    lrfs: PROSTATA_1_LRFS,
    mfs: PROSTATA_1_MFS,
    pfs: PROSTATA_1_PFS,
    pps: PROSTATA_1_PPS,
  },
  "family-2": {
    dfs: FAMILY_2_DFS,
    oas: FAMILY_2_OAS,
    lrr: FAMILY_2_LRR,
    lrfs: FAMILY_2_LRFS,
    mfs: FAMILY_2_MFS,
    pfs: FAMILY_2_PFS,
    pps: FAMILY_2_PPS,
  },
};

export function boxRegelFuer(boxId: string | null, endpunkt: EndpunktId): BoxRegel | null {
  if (!boxId) return null;
  return REGELN[boxId]?.[endpunkt] ?? null;
}
