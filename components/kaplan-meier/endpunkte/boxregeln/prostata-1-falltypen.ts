import type { OncoBoxCase, OncoBoxFollowUp } from "../../oncobox/types";
import type { AusschlussGrund } from "./typen";

const OP_TYPEN = ["RPE", "RZE"];
const BESTRAHLUNGS_TYPEN = ["P", "HDR", "LDR"];
const RAND_POSITIV = ["R1", "R2"];

/** Falltypen des Blatts Categories. */
export type Falltyp = "NI" | "IV" | "IF";

function leer(wert: string | null): boolean {
  return !wert || wert.trim() === "";
}

function istFernmetastase(wert: string | null): boolean {
  return (wert ?? "").startsWith("M1");
}

/**
 * Falltyp nach dem Blatt Categories. Die Reihenfolge ist Teil der Definition:
 * ein Zufallsbefund erfüllt auch die Bedingung des interventionellen Falls,
 * und wer ihn danach prüft, findet ihn nie.
 *
 * null heißt: keine Therapieangabe, der Fall passt in keine der drei
 * Gruppen. Die Ausschlussprüfung behandelt ihn dann wie einen Fall ohne
 * Grundlage, statt ihn einer Gruppe zuzuschlagen.
 */
export function falltyp(fall: OncoBoxCase): Falltyp | null {
  const f = fall.ausschlussFelder;
  if (f.opTyp === "RZE" && f.zufallsbefund === "Y") return "IF";
  if (
    (f.therapieTyp === "WS" || f.therapieTyp === "AS") &&
    leer(f.opTyp) &&
    leer(f.bestrahlungsTyp)
  ) {
    return "NI";
  }
  const interventionell = !leer(f.opTyp) || !leer(f.bestrahlungsTyp) || !leer(f.therapieTyp);
  if ((leer(f.zufallsbefund) || f.zufallsbefund === "N") && interventionell) return "IV";
  return null;
}

/**
 * Die Matrix aus dem Blatt Kaplan-Meier (DFS), Zeilen 17 bis 46. Anders als
 * bei Brust und Darm ist das keine einzelne Prüfung, sondern eine Verzweigung
 * nach Falltyp und Therapieform.
 */
export function nichtTumorfrei(fall: OncoBoxCase, typ: Falltyp): boolean {
  const f = fall.ausschlussFelder;
  const cM = fall.staging.cM;
  const pM = fall.staging.pM;

  // Ein nicht interventioneller Fall wurde nie mit dem Ziel der Tumorfreiheit
  // behandelt. Er zählt geschlossen als nicht tumorfrei.
  if (typ === "NI") return true;

  if (typ === "IF") {
    return f.opTyp === "RZE" && istFernmetastase(pM);
  }

  // IV, operiert
  if (f.opTyp && OP_TYPEN.includes(f.opTyp)) {
    return (
      istFernmetastase(cM) ||
      istFernmetastase(pM) ||
      RAND_POSITIV.includes(f.residualstatusLokal ?? "")
    );
  }

  // IV, nicht operiert
  if (leer(f.opTyp)) {
    if (leer(f.bestrahlungsTyp)) return true;
    if (f.bestrahlungsTyp && BESTRAHLUNGS_TYPEN.includes(f.bestrahlungsTyp)) {
      // Definitiv und kurativ bestrahlt: nur Fernmetastasen schließen aus.
      if (f.bestrahlungsZeitpunkt === "D" && f.bestrahlungsIntention === "C") {
        return istFernmetastase(cM);
      }
      // Neoadjuvant, adjuvant, unbekannt oder palliativ: immer.
      const zeitpunkt = f.bestrahlungsZeitpunkt ?? "";
      return ["N", "A", "U"].includes(zeitpunkt) || f.bestrahlungsIntention === "P";
    }
  }

  return false;
}

const STATUS_LEBEND: Record<string, string[]> = {
  localStatus: ["N", "R"],
  distantStatus: ["N", "M", "R"],
  overallStatus: ["CR", "PR", "NC", "P"],
};

/**
 * Gültige Follow-up-Meldung nach dem Blatt Kaplan-Meier (DFS), Spalten J bis O.
 *
 * Der Unterschied zwischen Lebenden und Verstorbenen ist Absicht: bei einem
 * Lebenden ist "unbekannt" unzulässig, bei einem Verstorbenen erlaubt. Die
 * Box verlangt für wen sie noch beobachtet vollständige Angaben und lässt
 * bei Abgeschlossenen Lücken zu, dafür muss dort ein Sterbedatum stehen.
 */
export function gueltigeMeldung(eintrag: OncoBoxFollowUp, fall: OncoBoxCase): boolean {
  if (!eintrag.date) return false;
  const tot = eintrag.vitalStatus === "dead";
  if (tot !== Boolean(fall.deathDate)) return false;

  const pruefe = (wert: string | null, erlaubt: string[]): boolean => {
    if (wert === null) return false;
    if (tot && wert === "U") return true;
    return erlaubt.includes(wert);
  };

  return (
    pruefe(eintrag.localStatus, STATUS_LEBEND.localStatus) &&
    pruefe(eintrag.biochemicalRecurrence, ["N", "Y"]) &&
    pruefe(eintrag.distantStatus, STATUS_LEBEND.distantStatus) &&
    pruefe(eintrag.overallStatus, STATUS_LEBEND.overallStatus) &&
    pruefe(eintrag.secondTumorRaw, ["N", "Y"])
  );
}

/** Kein Follow-up vorhanden, oder keines, das gültig ist. */
export function keineGrundlage(fall: OncoBoxCase): AusschlussGrund | null {
  if (!fall.diagnosisDate) return "keinDiagnosedatum";
  if (!fall.followUps.some((eintrag) => gueltigeMeldung(eintrag, fall))) return "keinFollowUp";
  return null;
}
