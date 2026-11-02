import { TEST_GRUPPEN } from "./testdaten/szenarien";

/** Die beim Upload in der Sitzung abgelegten Angaben zur Quelle. */
export interface DateiMeta {
  name?: string;
  source?: string;
}

/**
 * Woraus die Überschrift der Ergebnisseite gebaut wird.
 *
 * Vorher stand dort der Untertitel der Anwendung, also für jede Auswertung
 * derselbe Satz. Wer zwei Auswertungen nebeneinanderlegt oder einen
 * Screenshot ablegt, konnte daran nicht erkennen, welcher Datensatz gerechnet
 * wurde. Jetzt trägt sie den Dateinamen, bei den Testkohorten deren Namen.
 */
export interface DatensatzTitel {
  /** Dateiname, oder bei Testdaten der i18n-Schlüssel des Szenarios. */
  name: string;
  /** true, wenn name erst noch übersetzt werden muss. */
  istSzenario: boolean;
  /** Zweig unter Results.datasetSource: mock, csv, xlsx, xml oder unknown. */
  quelle: string;
}

const BEKANNTE_QUELLEN = ["mock", "csv", "xlsx", "xml"];

/** Der Uploadpfad legt Testkohorten unter "mock-<Schlüssel>" ab. */
function szenarioSchluessel(name: string): string | null {
  if (!name.startsWith("mock-")) return null;
  const key = name.slice("mock-".length);
  for (const gruppe of TEST_GRUPPEN) {
    const treffer = gruppe.szenarien.find((s) => s.key === key);
    if (treffer) return treffer.i18nKey;
  }
  return null;
}

/** Ohne brauchbaren Dateinamen null; die Seite zeigt dann ihre neutrale Überschrift. */
export function datensatzTitel(meta: DateiMeta | null): DatensatzTitel | null {
  const name = meta?.name?.trim();
  if (!name) return null;
  const quelle = meta?.source && BEKANNTE_QUELLEN.includes(meta.source) ? meta.source : "unknown";
  const szenario = szenarioSchluessel(name);
  if (szenario) return { name: szenario, istSzenario: true, quelle: "mock" };
  return { name, istSzenario: false, quelle };
}
