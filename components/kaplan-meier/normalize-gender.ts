/**
 * Geschlechtsangaben aller Quellen auf drei Werte vereinheitlichen.
 *
 * Filter und Legende der Ergebnisseite vergleichen gegen "male" und "female".
 * Ein Rohwert wie "M", "W" oder "Female" trifft dort nie zu: der Filter leerte
 * damit die ganze Kohorte, und die Legende beschriftete jede Gruppe als
 * weiblich, auch die der Männer. Deshalb normalisiert jede Quelle an der
 * Stelle, an der sie den Patienten baut.
 */
export type NormalizedGender = "male" | "female" | "unknown";

const MALE_VALUES = ["m", "männl", "männlich", "mann", "male", "1"];
const FEMALE_VALUES = ["w", "weibl", "weiblich", "frau", "female", "2", "f"];

export function normalizeGender(value: string | null | undefined): NormalizedGender {
  if (!value) return "unknown";
  const normalized = value.toString().trim().toLowerCase();
  if (MALE_VALUES.includes(normalized)) return "male";
  if (FEMALE_VALUES.includes(normalized)) return "female";
  return "unknown";
}
