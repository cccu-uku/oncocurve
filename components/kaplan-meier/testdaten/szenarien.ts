/**
 * Die Testdatensätze, nach Herkunft gruppiert.
 *
 * Vorher standen alle zwölf in einem einzigen Raster: veröffentlichte
 * Kohorten, im Browser erzeugte Kohorten und Kohorten, die nur eine einzelne
 * Funktion vorführen, ohne Trennung nebeneinander. Wer die Anwendung gegen
 * publizierte Kurven prüfen wollte, musste die beiden echten Datensätze
 * zwischen den erzeugten heraussuchen.
 */

export interface TestSzenario {
  /** Ladeschlüssel; bei erzeugten Kohorten zugleich der Schlüssel in mockDataScenarios. */
  key: string;
  /** Zweig unter testData.scenarios in den Sprachdateien. Weicht bei der DFS-Kohorte vom Ladeschlüssel ab. */
  i18nKey: string;
  patientCount: number;
  /** Fertige Datei in public/. Ohne diesen Eintrag werden XML und CSV beim Klick erzeugt. */
  csvDatei?: string;
  /** Ziel des <link>-Platzhalters in der Beschreibung. */
  quellLink?: string;
}

export interface TestGruppe {
  /** Zweig unter testData.groups in den Sprachdateien. */
  id: string;
  szenarien: TestSzenario[];
}

export const TEST_GRUPPEN: TestGruppe[] = [
  {
    id: "public",
    szenarien: [
      {
        key: "metabric",
        i18nKey: "metabric",
        patientCount: 1973,
        csvDatei: "sample-metabric.csv",
        quellLink: "https://www.cbioportal.org/study/summary?id=brca_metabric",
      },
      {
        key: "tcga",
        i18nKey: "tcga",
        patientCount: 968,
        csvDatei: "sample-tcga.csv",
        quellLink: "https://www.cell.com/pb-assets/consortium/pancanceratlas/pancani3/index.html",
      },
    ],
  },
  {
    id: "synthetic",
    szenarien: [
      { key: "comprehensive", i18nKey: "comprehensive", patientCount: 1350 },
      { key: "small", i18nKey: "small", patientCount: 50 },
      { key: "medium", i18nKey: "medium", patientCount: 150 },
      { key: "large", i18nKey: "large", patientCount: 300 },
      { key: "mamma", i18nKey: "mamma", patientCount: 120 },
      { key: "breastCancer", i18nKey: "breastCancer", patientCount: 100 },
      { key: "lungCancer", i18nKey: "lungCancer", patientCount: 100 },
      { key: "pancreaticCancer", i18nKey: "pancreaticCancer", patientCount: 80 },
    ],
  },
  {
    id: "features",
    szenarien: [
      { key: "diseaseFreeSurvival", i18nKey: "dfs", patientCount: 120 },
      { key: "anomalyDemo", i18nKey: "anomalyDemo", patientCount: 39, csvDatei: "sample-anomalies.csv" },
    ],
  },
];
