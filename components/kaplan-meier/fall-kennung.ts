import type { Patient } from "./obds-parser-new";

export interface FallKennung {
  /** Nummer der Person. Leer, wenn die Quelle keine führt. */
  patientId: string;
  /** Nummer des Falls dieser Person. Leer ausserhalb der OncoBoxen. */
  caseId: string;
}

/**
 * Patientennummer und Fallnummer getrennt.
 *
 * Die Zeilenkennung eines OncoBox-Falls setzt beide zusammen, etwa
 * "012933-0001234". In einer Spalte ist darin weder nach der einen noch nach
 * der anderen zu suchen oder zu sortieren, und in einem Bericht steht eine
 * Zahl, die es so in keinem System gibt.
 *
 * Gelesen wird aus den Feldern des Falls, nicht durch Zerlegen der
 * zusammengesetzten Kennung: bei den 2.0-Boxen enthält die Fallnummer die
 * Patientennummer bereits, dort wird gar nicht zusammengesetzt, und ein Trennen
 * am Bindestrich träfe die falsche Stelle.
 */
export function fallKennung(patient: Patient): FallKennung {
  const box = patient.oncoBox;
  if (box) return { patientId: box.patientId, caseId: box.caseId };
  return { patientId: patient.id ?? "", caseId: "" };
}

/** Trennt die beiden Teile im Schlüssel. Kommt in keiner Kennung vor. */
const TRENNER = "::";

/**
 * Schlüssel einer Tabellenzeile, aus beiden Kennungen zusammengesetzt.
 *
 * Die Pseudonymisierung verschiebt die Daten je Zeile um einen festen Betrag
 * und findet die Rohdaten über diesen Schlüssel. Solange die Kennung eine
 * einzige Spalte war, genügte sie dafür; seit sie geteilt ist, braucht es
 * beide Teile. Mit nur einem Teil fände die Verschiebung bei mehreren Fällen
 * derselben Person die falsche Zeile.
 *
 * Ohne Fallnummer bleibt es bei der Patientennummer allein. Sonst änderte sich
 * der Schlüssel auch für gewöhnliche Uploads, die gar keine Fallnummer führen,
 * und die Verschiebung liefe dort ins Leere, ohne dass es auffiele.
 */
export function zeilenSchluessel(patientId: unknown, caseId: unknown): string {
  const person = String(patientId ?? "");
  const fall = String(caseId ?? "");
  return fall ? `${person}${TRENNER}${fall}` : person;
}
