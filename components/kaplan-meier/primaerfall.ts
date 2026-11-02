// Ist dieser Fall ein Primärfall?
//
// Die Quellen schreiben das verschieden: oBDS und OncoBox "1" und "0", die
// mitgelieferten Testszenarien "ja" und "nein", CSV-Dateien je nach Herkunft
// auch "true" oder "yes". Bisher gab es dafür drei Prüfungen: der CSV-Parser
// kannte "true", "1" und "ja", der oBDS-Parser und die Ergebnisseite nur "1".
// Auf der Ergebnisseite stand deshalb bei sieben von neun Testszenarien bei
// jedem Fall "Nein", und der Filter "Primärfall" liess keinen einzigen übrig.
//
// Eine fehlende oder unbekannte Angabe gilt nicht als Primärfall. Welcher Fall
// ohne Angabe trotzdem als Primärfall zählt, entscheidet der jeweilige Parser
// selbst, bevor der Wert hier ankommt.

const JA = new Set(["1", "ja", "j", "true", "yes", "y"]);

export function istPrimaerfall(wert: unknown): boolean {
  if (typeof wert !== "string") return false;
  return JA.has(wert.trim().toLowerCase());
}
