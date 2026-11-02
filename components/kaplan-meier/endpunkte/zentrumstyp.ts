import type { Patient } from "../obds-parser-new";
import type { ZentrumsTyp } from "./typen";
import { ZENTRUMS_TYPEN } from "./typen";

/**
 * Boxbezeichnung der 2.0-Familie zum Zentrumstyp. Familie 1.0 führt den Typ
 * im Datensatz selbst, unter Fallinfos/Organ, und braucht diese Abbildung
 * nicht.
 */
const BOX_ZU_ZENTRUM: Record<string, ZentrumsTyp> = {
  brust: "BZ",
  darm: "DZ",
  lunge: "LZ",
  prostata: "PZ",
};

interface OncoBoxHerkunft {
  boxType?: string;
  centerType?: string | null;
}

function herkunft(patient: Patient): OncoBoxHerkunft | undefined {
  return (patient as { oncoBox?: OncoBoxHerkunft }).oncoBox;
}

function istZentrumsTyp(wert: string): wert is ZentrumsTyp {
  return (ZENTRUMS_TYPEN as string[]).includes(wert);
}

/**
 * Zentrumstyp der Kohorte, oder null für die freie Analyse. Der im Datensatz
 * geführte Zentrumstyp hat Vorrang vor der Boxbezeichnung: er steht direkt am
 * Fall, während die Boxbezeichnung nur aus dem Dateiformat folgt.
 */
export function zentrumsTypAusKohorte(patients: Patient[]): ZentrumsTyp | null {
  for (const patient of patients) {
    const quelle = herkunft(patient);
    if (!quelle) continue;

    const ausDatensatz = quelle.centerType?.trim().toUpperCase();
    if (ausDatensatz && istZentrumsTyp(ausDatensatz)) return ausDatensatz;

    const ausBox = quelle.boxType ? BOX_ZU_ZENTRUM[quelle.boxType] : undefined;
    if (ausBox) return ausBox;
  }
  return null;
}
