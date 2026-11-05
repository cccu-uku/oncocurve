import { ONCOBOX_CODES } from "./codes.generated";

/**
 * Schreibt einen Kurzcode aus, mit dem Code in Klammern dahinter. Ein
 * unbekannter Code bleibt unveraendert, damit Daten aus anderen Quellen als
 * den OncoBoxen nicht verstuemmelt werden.
 *
 * Beispiel: "C50.2" wird zu "Oberer innerer Quadrant der Brustdruese (C50.2)",
 * und der Platzhalter "N" zu "Kein Primaertumor/Lokalrezidiv (N)".
 */
export function spellOutCode(
  raw: string | null | undefined,
  codeTable: string,
  locale: string,
): string | null {
  if (!raw) return null;

  const label = ONCOBOX_CODES[codeTable]?.[raw];
  if (!label) return raw;

  const text = locale.startsWith("en") ? label.en : label.de;
  return text ? `${text} (${raw})` : raw;
}

export const ICD_10_CODES = "icd_10_einzeltyp";
