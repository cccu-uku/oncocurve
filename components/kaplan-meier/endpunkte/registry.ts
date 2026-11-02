import { ENDPUNKT_REGELN } from "./regeln";
import type { EndpunktDefinition, EndpunktId, ZentrumsTyp } from "./typen";
import { ZENTRUMS_TYPEN } from "./typen";

/** Zentrumstypen ohne TTFT-Sonderfall, für Endpunkte die überall gelten. */
const ALLE = ZENTRUMS_TYPEN;

interface RegistryEintrag {
  id: EndpunktId;
  kuerzel: string;
  pflichtFuer: ZentrumsTyp[];
  alternativFuer: ZentrumsTyp[];
}

/**
 * Welcher Zentrumstyp welchen Endpunkt braucht. Quelle ist der
 * OnkoZert-Erhebungsbogen, Abschnitt "Parameter Ergebnisqualität /
 * Kaplan-Meier-Kurve". Wer hier etwas ändert, ändert eine
 * Zertifizierungsanforderung; der Test in endpunkte-registry.test.ts hält
 * die Vorlage dagegen.
 */
const EINTRAEGE: RegistryEintrag[] = [
  { id: "oas", kuerzel: "OAS", pflichtFuer: ALLE, alternativFuer: [] },
  { id: "lrr", kuerzel: "LRR", pflichtFuer: ["BZ", "DZ", "MP"], alternativFuer: [] },
  { id: "lrfs", kuerzel: "LRFS", pflichtFuer: ["LZ", "MN", "MB", "MH", "OZ"], alternativFuer: [] },
  { id: "mfs", kuerzel: "MFS", pflichtFuer: ["BZ", "DZ", "MP", "OZ"], alternativFuer: [] },
  { id: "dfs", kuerzel: "DFS", pflichtFuer: ["PZ"], alternativFuer: ["BZ", "DZ", "MP"] },
  { id: "pfs", kuerzel: "PFS", pflichtFuer: ["GZ", "HAEZ", "HZ"], alternativFuer: ["BZ", "DZ", "MP"] },
  {
    id: "pps",
    kuerzel: "PPS",
    pflichtFuer: ["BZ", "LZ", "DZ", "MP", "HAEZ", "MN", "MB", "MH"],
    alternativFuer: [],
  },
  // TTFT gehört zur freien Analyse und keinem Zentrumstyp.
  { id: "ttft", kuerzel: "TTFT", pflichtFuer: [], alternativFuer: [] },
];

export const ENDPUNKTE: EndpunktDefinition[] = EINTRAEGE.map((eintrag) => ({
  ...eintrag,
  labelKey: eintrag.id,
  regel: ENDPUNKT_REGELN[eintrag.id] ?? null,
}));

export function endpunktById(id: EndpunktId): EndpunktDefinition | undefined {
  return ENDPUNKTE.find((endpunkt) => endpunkt.id === id);
}

/** Endpunkte, die dieser Zentrumstyp braucht, Pflicht und Alternative. */
export function endpunkteFuerZentrum(typ: ZentrumsTyp): EndpunktDefinition[] {
  return ENDPUNKTE.filter(
    (endpunkt) => endpunkt.pflichtFuer.includes(typ) || endpunkt.alternativFuer.includes(typ),
  );
}

/** Wie der Erhebungsbogen diesen Endpunkt für diesen Zentrumstyp führt. */
export type Kennzeichnung = "pflicht" | "alternativ";

/**
 * Pflicht, Alternative oder gar nichts. null steht für die freie Analyse und
 * für jeden Endpunkt, den der Zentrumstyp nicht führt: dort gibt es keine
 * Pflichten, und eine Kennzeichnung wäre eine erfundene Anforderung.
 */
export function kennzeichnungFuer(
  definition: EndpunktDefinition,
  typ: ZentrumsTyp | null,
): Kennzeichnung | null {
  if (!typ) return null;
  if (definition.pflichtFuer.includes(typ)) return "pflicht";
  if (definition.alternativFuer.includes(typ)) return "alternativ";
  return null;
}
