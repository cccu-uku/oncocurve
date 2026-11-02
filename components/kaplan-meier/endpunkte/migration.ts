import type { EndpunktId } from "./typen";

/** Kriterium, das es vor Teilprojekt B gab und das jetzt ein Endpunkt ist. */
const ALTES_DFS_KRITERIUM = "diseaseFreeSurvival";

export interface MigrierteStratifizierung {
  criterion: string;
  endpunkt: EndpunktId | null;
  /**
   * true, wenn die gespeicherte Gruppenliste verworfen werden muss. Sie führt
   * sonst weiter die alte DFS-Gruppe, zu der keine Gruppenkennung mehr passt,
   * und die Cox-Analyse rechnet stillschweigend auf null Patienten.
   */
  gruppenZuruecksetzen: boolean;
}

/**
 * Setzt eine gespeicherte Stratifizierung auf das neue Modell um. Ohne diese
 * Umsetzung liefe eine laufende Sitzung in ein Kriterium, das es nicht mehr
 * gibt, und die Auswahl bliebe leer.
 */
export function migriereStratifizierung(gespeichert: unknown): MigrierteStratifizierung {
  const leer: MigrierteStratifizierung = {
    criterion: "none",
    endpunkt: null,
    gruppenZuruecksetzen: false,
  };
  if (!gespeichert || typeof gespeichert !== "object") return leer;
  const criterion = (gespeichert as { criterion?: unknown }).criterion;
  if (typeof criterion !== "string") return leer;
  if (criterion === ALTES_DFS_KRITERIUM) {
    return { criterion: "none", endpunkt: "dfs", gruppenZuruecksetzen: true };
  }
  return { criterion, endpunkt: null, gruppenZuruecksetzen: false };
}
