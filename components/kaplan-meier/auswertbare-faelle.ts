// Welche Fälle tragen zur Auswertung bei?
//
// Der Schätzer im Worker wirft Fälle ohne brauchbare Zeit weg, bevor er die
// Kurve rechnet. Jede Zahl daneben muss auf derselben Menge stehen, sonst
// widerspricht sich ein Bericht in sich: die Legende zählt anders als die
// Regression, und die Exportdatei trägt beide Zahlen nebeneinander.
//
// Die Einheit entscheidet mit. In Monaten ist eine Null eine fehlende Angabe,
// in Tagen ein Ereignis am Tag der Diagnose, siehe gueltigeZeit.

import type { CoxPatient } from "@/utils/cox-regression";
import { gueltigeZeit } from "./boxkurve";
import type { ZeitEinheit } from "./endpunkte/anwenden";
import type { Patient } from "./obds-parser-new";

/** Dieselbe Prüfung, die gueltigePatienten im Worker vor der Kurve anlegt. */
export function hatAuswertbareZeit(patient: Patient, zeitEinheit: ZeitEinheit): boolean {
  const zeit = patient.survivalTime;
  return typeof zeit === "number" && !isNaN(zeit) && gueltigeZeit(zeit, zeitEinheit);
}

/**
 * Die Fälle, mit denen die Cox-Regression rechnen darf: dieselbe Menge, die
 * auch in der Kurve steht, aufgeteilt nach der übergebenen Gruppierung.
 * Fälle ausserhalb der betrachteten Teilmenge liefern eine Gruppe null und
 * fallen heraus.
 */
export function coxFaelle(
  patients: Patient[],
  gruppeVon: (patient: Patient) => string | null,
  zeitEinheit: ZeitEinheit,
): CoxPatient[] {
  const faelle: CoxPatient[] = [];
  for (const patient of patients) {
    if (!hatAuswertbareZeit(patient, zeitEinheit)) continue;
    const group = gruppeVon(patient);
    if (group == null) continue;
    faelle.push({ survivalTime: patient.survivalTime as number, event: patient.event, group });
  }
  return faelle;
}
