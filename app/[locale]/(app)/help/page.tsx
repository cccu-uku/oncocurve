"use client";

import React from "react";
import { Info, ShieldCheck, PanelLeftOpen, Activity, Sigma, TrendingUp, FileText, BookOpen, AlertTriangle, Users, Download, Boxes, FileDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { ALL_RULES } from "@/components/kaplan-meier/anomaly-rules";
import { useParams } from "next/navigation";
import { TourLayer } from "@/components/guided-tour";
import { BoxregelnAbschnitt } from "./boxregeln-abschnitt";
import { HilfeKachel } from "./hilfe-kachel";
import { Beispieldateien } from "./beispieldateien";

export default function HelpPage() {
  const t = useTranslations("Help");
  const { locale } = useParams() as { locale: string };

  const wiley = locale === "de" ? {
    title: "Entitätenspezifisches Staging nach Wiley",
    body: "Das entitätenspezifische Staging basiert auf der TNM-Klassifikation maligner Tumoren von Wittekind (Hrsg.), 9. Auflage (Wiley-VCH, 2025). Nicht alle onkologischen Entitäten sind darin enthalten. Die Klassifikation gilt ausschließlich für die nachfolgend aufgeführten Tumorentitäten.",
    entitiesNote: `Enthaltene Entitäten (61):`,
  } : {
    title: "Entity-specific staging (Wiley)",
    body: "Entity-specific staging is based on the TNM Klassifikation maligner Tumoren edited by Wittekind, 9th edition (Wiley-VCH, 2025). Not all oncological entities are included. The classification applies only to the tumour entities listed below.",
    entitiesNote: `Included entities (61):`,
  };

  const stratVars = locale === "de" ? {
    title: "Herkunft & Logik der Stratifizierungsvariablen",
    body: "Die meisten Stratifizierungskriterien übernehmen ein Feld direkt aus der Datenquelle. Die T/N/M-basierten und die daraus abgeleiteten Kriterien normalisieren dagegen den Rohwert - die folgende Tabelle zeigt für jede Variable, welches Feld einfließt und nach welcher Regel die Gruppe bestimmt wird.",
    colVar: "Variable",
    colSource: "Quellfeld",
    colLogic: "Logik",
    rows: [
      ["Geschlecht, Grading, UICC-Stadium, N-/M-Kategorie", "gender / grading / staging.uicc / nCategory / mCategory", "Rohwert unverändert übernommen; leer → „Keine Angabe\"."],
      ["ICD-10 (Tumortyp), Tumor-Kategorie", "tumorType / tumorCategory", "Rohwert aus der Datenquelle, keine weitere Verarbeitung."],
      ["Altersgruppe", "age", "Fehlendes/Alter 0 → „Unbekannt\"; < 18 „Kind\"; < 65 „Erwachsen\"; ≥ 65 „Senior\"."],
      ["Diagnosejahr", "diagnosisDate", "Jahr aus dem Diagnosedatum extrahiert, jedes Jahr eine eigene Gruppe."],
      ["T-Kategorie, 1-/2-stellig", "staging.tCategory", "c/p-Präfix und (bei 1-stellig) Sub-Suffix werden ignoriert: cT1c/pT1 → T1 (1-stellig) bzw. T1C (2-stellig, Präfix entfernt, Suffix bleibt)."],
      ["T-Kategorie klinisch/pathologisch, 1-/2-stellig", "staging.tClinical / staging.tPathological", "Wie oben, aber nur aus dem jeweiligen Feld. Ein Wert mit widersprüchlichem Präfix (z. B. ein cT-Wert im pathologischen Feld) wird komplett ausgeschlossen, nicht als „Keine Angabe\" gezählt. Das Label behält das Präfix (z. B. „pT1a\")."],
      ["T-Kategorie klinisch/pathologisch (ungekürzt)", "staging.tClinical / staging.tPathological", "Rohwert des jeweiligen Feldes ohne Digit-Trimming."],
      ["Tumor-Haupt-/Subkategorie", "tumorType (ICD-10)", "ICD-10-Code wird gegen eine feste Zuordnungstabelle (solide vs. hämatologische Entitäten) geprüft; ohne Treffer „Solide Tumore/Sonstige\"."],
      ["Ausbreitungskategorie", "T-/N-/M-Kategorie", "Aus TNM abgeleitet, siehe Tabelle unten."],
      ["Entitätenspezifisches Staging (Wiley)", "ICD-10, T-/N-/M-Kategorie, Alter", "ICD-10 wird einer Wiley-Entität zugeordnet (Alter entscheidet bei Schilddrüse), das TNM-Tripel bestimmt dann das entitätsspezifische Stadium; siehe Abschnitt unten."],
      ["Krankheitsfreies Überleben (DFS)", "rezidivDatum / metastasenDatum / todDatum, Startdatum wählbar (Diagnosedatum oder Therapiebeginn)", "Ereigniszeitpunkt = frühestes von Rezidiv-, Metastasen- oder Todesdatum; ohne eines dieser Daten Zensierung am Nachsorgedatum. Nur Fälle mit erfüllten DFS-Einschlusskriterien (Complete Response, R0) fließen ein."],
      ["Zusatzspalten (hochgeladen)", "extras.<Spaltenname>", "Kategorisch: Rohwert je Ausprägung. Numerisch: Einheit wird umgerechnet, danach automatische Bin-Einteilung (siehe Filterbereich)."],
    ],
    note: "Werte außerhalb des jeweils analysierten Teilbereichs (z. B. ein klinischer Wert unter einem pathologischen Kriterium) werden von der Analyse ausgeschlossen statt in „Keine Angabe\" zu landen - nur so bleibt die Gruppe wirklich rein.",
  } : {
    title: "Origin & logic of the stratification variables",
    body: "Most stratification criteria take a field straight from the source data. The T/N/M-based criteria and everything derived from them instead normalise the raw value - the table below shows, for each variable, which field feeds in and the rule that determines the group.",
    colVar: "Variable",
    colSource: "Source field",
    colLogic: "Logic",
    rows: [
      ["Gender, grading, UICC stage, N/M category", "gender / grading / staging.uicc / nCategory / mCategory", "Raw value taken as-is; empty → \"Unknown\"."],
      ["ICD-10 (tumour type), tumour category", "tumorType / tumorCategory", "Raw value from the source data, no further processing."],
      ["Age group", "age", "Missing/age 0 → \"Unknown\"; < 18 \"Child\"; < 65 \"Adult\"; ≥ 65 \"Senior\"."],
      ["Diagnosis year", "diagnosisDate", "Year extracted from the diagnosis date, each year its own group."],
      ["T category, 1-/2-digit", "staging.tCategory", "c/p prefix and (1-digit only) subcategory suffix are ignored: cT1c/pT1 → T1 (1-digit) or T1C (2-digit, prefix dropped, suffix kept)."],
      ["T category clinical/pathological, 1-/2-digit", "staging.tClinical / staging.tPathological", "As above, but only from the matching field. A value with the opposite prefix (e.g. a cT value in the pathological field) is excluded entirely rather than counted as \"Unknown\". The label keeps the prefix (e.g. \"pT1a\")."],
      ["T category clinical/pathological (unabridged)", "staging.tClinical / staging.tPathological", "Raw value of that field, no digit-trimming."],
      ["Tumour main/sub-category", "tumorType (ICD-10)", "ICD-10 code is matched against a fixed lookup table (solid vs. haematological entities); no match → \"Solid tumours/Other\"."],
      ["Spread category", "T/N/M category", "Derived from TNM, see table below."],
      ["Entity-specific staging (Wiley)", "ICD-10, T/N/M category, age", "ICD-10 is mapped to a Wiley entity (age decides for thyroid), the TNM triple then determines the entity-specific stage; see section below."],
      ["Disease-free survival (DFS)", "rezidivDatum / metastasenDatum / todDatum, selectable start date (diagnosis or treatment start)", "Event time = earliest of recurrence, metastasis or death date; censored at the follow-up date if none of these are present. Only cases meeting the DFS inclusion criteria (complete response, R0) are included."],
      ["Extra columns (uploaded)", "extras.<column name>", "Categorical: raw value per level. Numeric: unit is converted, then automatically binned (see filter panel)."],
    ],
    note: "Values outside the analysed subset (e.g. a clinical value under a pathological criterion) are excluded from the analysis rather than landing in \"Unknown\" - that is the only way the group stays truly pure.",
  };

  const sharing = locale === "de" ? {
    title: "Berichte teilen: Pseudonymisierung und ihre Grenzen",
    body: "Excel- und PDF-Report lassen sich in drei Varianten herunterladen: vollständig, ohne Patientendaten (die Patiententabelle entfällt, alle Auswertungen bleiben) oder pseudonymisiert. Pseudonymisiert bedeutet: Patienten-IDs werden durch fortlaufende Nummern ersetzt, Diagnose- und Enddatum je Patient um bis zu ±4 Wochen verschoben, und Angaben zur Quelldatei entfernt. Beide Daten eines Patienten werden um denselben Betrag verschoben, damit die Überlebenszeit exakt erhalten bleibt. Alle Auswertungen werden immer auf den Originaldaten gerechnet; die Pseudonymisierung greift erst danach auf die exportierte Tabelle.",
    limitsTitle: "Was das nicht leistet",
    limits: [
      "Das ist Pseudonymisierung, keine Anonymisierung im Sinne der DSGVO.",
      "In einer kleinen Kohorte kann die Kombination aus seltener ICD-10, Alter, T-Kategorie und Stratum eine Person weiterhin identifizierbar machen.",
      "Die exakt erhaltene Überlebenszeit ist selbst ein Quasi-Identifikator.",
      "Die Verschiebung ist deterministisch: Wer den Algorithmus und die echte Patienten-ID kennt, kann den Versatz nachrechnen.",
      "Liegt ein Diagnosedatum nahe am Jahreswechsel, kann die Verschiebung es ins Nachbarjahr versetzen. Bei Stratifizierung nach Diagnosejahr steht ein Patient in der Tabelle dann scheinbar im falschen Stratum; die Kurven nutzen das echte Jahr.",
    ],
    note: "Die Funktion senkt die Hürde für das kollegiale Teilen. Sie ersetzt keine datenschutzrechtliche Freigabe.",
  } : {
    title: "Sharing reports: pseudonymisation and its limits",
    body: "The Excel and PDF reports can be downloaded in three variants: complete, without patient data (the patient table is omitted, all analyses remain), or pseudonymised. Pseudonymised means: patient IDs are replaced by sequential numbers, diagnosis and end dates are shifted per patient by up to ±4 weeks, and details about the source file are removed. Both dates of a patient move by the same amount so that survival time stays exactly intact. All analyses are always computed on the original data; pseudonymisation is applied afterwards, to the exported table only.",
    limitsTitle: "What this does not achieve",
    limits: [
      "This is pseudonymisation, not anonymisation in the sense of the GDPR.",
      "In a small cohort, the combination of a rare ICD-10 code, age, T category and stratum can still make a person identifiable.",
      "The exactly preserved survival time is itself a quasi-identifier.",
      "The shift is deterministic: anyone who knows the algorithm and the real patient ID can recompute the offset.",
      "If a diagnosis date falls close to a year boundary, the shift can move it into the adjacent year. When stratifying by diagnosis year, a patient may then appear to sit in the wrong stratum in the table; the curves use the real year.",
    ],
    note: "The feature lowers the barrier to collegial sharing. It does not replace a data protection clearance.",
  };

  const pHacking = locale === "de" ? {
    title: "p-Werte, multiples Testen und explorative Auswertung",
    intro: "Ein Signifikanzniveau von 0,05 bedeutet, dass ein einzelner Test in etwa 5 % der Fälle einen Unterschied anzeigt, obwohl keiner besteht. Dieses Risiko gilt pro Test, nicht pro Auswertung. Wer zehn verschiedene Stratifizierungen durchprobiert, hat rund 40 % Chance, mindestens einmal ein p unter 0,05 zu sehen, ohne dass in den Daten ein echter Unterschied steckt (1 minus 0,95 hoch 10).",
    risk: "Diese App macht das Durchprobieren besonders leicht: Jede Stratifizierung und jeder Filter ist einen Klick entfernt. Genau darin liegt die Gefahr. Wird anschließend nur das Ergebnis mit dem kleinsten p-Wert berichtet, ist dieser p-Wert nicht mehr interpretierbar.",
    adviceTitle: "Was hilft",
    advice: [
      "Die Fragestellung festlegen, bevor die Daten geladen werden, und genau diese eine auswerten.",
      "Alles Weitere als explorativ kennzeichnen. Explorative Befunde erzeugen Hypothesen, sie bestätigen keine.",
      "Einen so gefundenen Zusammenhang in einer unabhängigen Kohorte prüfen, bevor er als gesichert gilt.",
    ],
  } : {
    title: "p-values, multiple testing and exploratory analysis",
    intro: "A significance level of 0.05 means a single test indicates a difference in about 5 % of cases even when none exists. That risk applies per test, not per analysis. Trying ten different stratifications gives roughly a 40 % chance of seeing at least one p below 0.05 with no real difference in the data (1 minus 0.95 to the power of 10).",
    risk: "This app makes trying things especially easy: every stratification and every filter is one click away. That is precisely where the risk lies. If only the result with the smallest p-value is then reported, that p-value is no longer interpretable.",
    adviceTitle: "What helps",
    advice: [
      "Fix the question before the data is loaded, and analyse that one question.",
      "Label everything beyond it as exploratory. Exploratory findings generate hypotheses, they do not confirm them.",
      "Check any association found this way in an independent cohort before treating it as established.",
    ],
  };

  const spread = locale === "de" ? {
    title: "Ausbreitungskategorie (aus TNM abgeleitet)",
    body: "Wird eine Kohorte nach „Ausbreitungskategorie\" stratifiziert, leitet die App die Kategorie automatisch aus der TNM-Klassifikation jedes Falls ab. TNM-Werte werden dabei normalisiert: das c/p-Präfix und Subkategorie-Suffixe werden ignoriert (z. B. cT1c, pT1 → T1; M1b → M1). Die Einteilung funktioniert auch bei unvollständigem TNM - bereits ein M1 oder ein positiver Lymphknotenstatus genügt.",
    colCat: "Kategorie",
    colRule: "Regel (TNM)",
    rows: [
      ["Metastasiert", "M1 (unabhängig von T und N)"],
      ["Fortgeschritten", "N1, N2 oder N3 (regionäre Lymphknoten)"],
      ["Lokal fortgeschritten", "T3 oder T4, mit N0 und M0"],
      ["Lokal begrenzt", "T1 oder T2, mit N0 und M0"],
      ["Carcinoma in situ", "Tis, mit N0 und M0"],
      ["Unbekannt", "kein ausreichendes TNM vorhanden"],
    ],
    note: "Die Regeln werden von oben nach unten geprüft; die erste zutreffende Kategorie gewinnt. Die T-basierten Kategorien verlangen ein dokumentiertes N0 und M0, damit eine unbekannte Ausbreitung nicht fälschlich als lokal begrenzt gewertet wird.",
  } : {
    title: "Spread category (derived from TNM)",
    body: "When a cohort is stratified by \"spread category\", the app derives the category automatically from each case's TNM classification. TNM values are normalised: the c/p prefix and subcategory suffixes are ignored (e.g. cT1c, pT1 → T1; M1b → M1). Classification also works with incomplete TNM - an M1 or a positive nodal status alone is enough.",
    colCat: "Category",
    colRule: "Rule (TNM)",
    rows: [
      ["Metastatic", "M1 (regardless of T and N)"],
      ["Advanced (regional)", "N1, N2 or N3 (regional lymph nodes)"],
      ["Locally advanced", "T3 or T4, with N0 and M0"],
      ["Locally confined", "T1 or T2, with N0 and M0"],
      ["Carcinoma in situ", "Tis, with N0 and M0"],
      ["Unknown", "insufficient TNM available"],
    ],
    note: "Rules are evaluated top to bottom; the first match wins. The T-based categories require a documented N0 and M0 so that unknown spread is not misread as locally confined.",
  };

  return (
    <div className="hilfe-flaeche min-h-full w-full px-[max(1rem,4vw)] py-6">
      <h1 className="km-heading mb-6">{t("title")}</h1>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <HilfeKachel titel={t("overview.title")} icon={<Info className="h-4 w-4" />} ton={1}>
                <p className="text-muted-foreground">
                  {t("overview.body")}
                </p>
              </HilfeKachel>

              <HilfeKachel titel={t("filters.title")} icon={<PanelLeftOpen className="h-4 w-4" />} ton={2}>
                <p className="text-muted-foreground">{t("filters.body")}</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>{t("filters.items.dimensions")}</li>
                  <li>{t("filters.items.sidebar")}</li>
                  <li>{t("filters.items.toggle")}</li>
                  <li>{t("filters.items.responsive")}</li>
                </ul>
              </HilfeKachel>

              <HilfeKachel titel={t("upload.title")} icon={<FileText className="h-4 w-4" />} ton={3}>
                <p className="text-muted-foreground">
                  {t("upload.body")}
                </p>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{t("upload.acceptedFormats.title")}</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li>{t("upload.acceptedFormats.xml")}</li>
                    <li>{t("upload.acceptedFormats.csv")}</li>
                    <li>{t("upload.acceptedFormats.xlsx")}</li>
                  </ul>
                </div>

                <p className="text-muted-foreground mt-3">{t("upload.headerDetection")}</p>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{t("upload.requiredColumns.title")}</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li>{t("upload.requiredColumns.event")}</li>
                    <li>{t("upload.requiredColumns.survivalTime")}</li>
                  </ul>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{t("upload.recommendedColumns.title")}</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li>{t("upload.recommendedColumns.id")}</li>
                    <li>{t("upload.recommendedColumns.tumorType")}</li>
                    <li>{t("upload.recommendedColumns.diagnosisDate")}</li>
                  </ul>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{t("upload.optionalColumns.title")}</h4>
                  <p className="text-muted-foreground">{t("upload.optionalColumns.list")}</p>
                </div>

                <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <h4 className="text-sm font-medium mb-1">{t("upload.extraColumns.title")}</h4>
                  <p className="text-muted-foreground mb-2">{t("upload.extraColumns.intro")}</p>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li>{t("upload.extraColumns.numeric")}</li>
                    <li>{t("upload.extraColumns.categorical")}</li>
                    <li>{t("upload.extraColumns.conversion")}</li>
                  </ul>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{t("upload.examples.title")}</h4>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li><a className="underline" href="/sample-extras/sample-extras-cohort.csv" download>{t("upload.examples.csvLink")}</a></li>
                    <li><a className="underline" href="/sample-extras/sample-extras-cohort.xlsx" download>{t("upload.examples.xlsxLink")}</a></li>
                    <li><a className="underline" href="/sample-extras/sample-extras-mixed-units.csv" download>{t("upload.examples.mixedUnitsLink")}</a></li>
                  </ul>
                </div>

                <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <h4 className="text-sm font-medium mb-1">{t("upload.ttft.title")}</h4>
                  <p className="text-muted-foreground mb-2">{t("upload.ttft.intro")}</p>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li>{t("upload.ttft.diagnosis")}</li>
                    <li>{t("upload.ttft.treatment")}</li>
                    <li>{t("upload.ttft.lastContact")}</li>
                    <li>{t("upload.ttft.group")}</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">{t("upload.ttft.note")}</p>
                  <a className="underline mt-1 inline-block" href="/sample-ttft-cll.xlsx" download>{t("upload.ttft.example")}</a>
                </div>
              </HilfeKachel>

              <HilfeKachel titel={t("sampleFiles.title")} icon={<FileDown className="h-4 w-4" />} ton={1}>
                <Beispieldateien />
              </HilfeKachel>

              <HilfeKachel titel={t("stratification.title")} icon={<Users className="h-4 w-4" />} ton={2}>
                <p className="text-muted-foreground">{t("stratification.body")}</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>{t("stratification.items.builtin")}</li>
                  <li>{t("stratification.items.extra")}</li>
                  <li>{t("stratification.items.binning")}</li>
                  <li>{t("stratification.items.compare")}</li>
                </ul>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{stratVars.title}</h4>
                  <p className="text-muted-foreground mb-2">{stratVars.body}</p>
                  {/* Eigener Scrollbereich: die Kachel ist halb so breit wie die Seite,
                      und eine gestauchte Tabelle liest sich schlechter als eine, die
                      seitlich scrollt. */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[30rem] text-xs border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-1 text-left">{stratVars.colVar}</th>
                          <th className="p-1 text-left">{stratVars.colSource}</th>
                          <th className="p-1 text-left">{stratVars.colLogic}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stratVars.rows.map(([variable, source, logic]) => (
                          <tr key={variable} className="border-t align-top">
                            <td className="p-1 font-medium">{variable}</td>
                            <td className="p-1 font-mono">{source}</td>
                            <td className="p-1">{logic}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stratVars.note}</p>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{spread.title}</h4>
                  <p className="text-muted-foreground mb-2">{spread.body}</p>
                  {/* Eigener Scrollbereich: die Kachel ist halb so breit wie die Seite,
                      und eine gestauchte Tabelle liest sich schlechter als eine, die
                      seitlich scrollt. */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[30rem] text-xs border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-1 text-left">{spread.colCat}</th>
                          <th className="p-1 text-left">{spread.colRule}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spread.rows.map(([cat, rule]) => (
                          <tr key={cat} className="border-t">
                            <td className="p-1 font-medium">{cat}</td>
                            <td className="p-1 font-mono">{rule}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{spread.note}</p>
                </div>
              </HilfeKachel>

              <HilfeKachel titel={t("logRank.title")} icon={<Sigma className="h-4 w-4" />} ton={3}>
                <p className="text-muted-foreground">
                  {t("logRank.body")}
                </p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>{t.rich("logRank.items.interpretation", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("logRank.items.assumption", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                </ul>
                <h4 className="font-semibold pt-2">{t("logRank.variantsTitle")}</h4>
                <p className="text-muted-foreground">{t("logRank.variantsIntro")}</p>
                {/* Eigener Scrollbereich: die Kachel ist halb so breit wie die Seite,
                    und eine gestauchte Tabelle liest sich schlechter als eine, die
                    seitlich scrollt. */}
                <div className="overflow-x-auto mt-1">
                  <table className="w-full min-w-[30rem] text-xs border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-1 text-left">{t("logRank.variantsTable.variant")}</th>
                        <th className="p-1 text-left">{t("logRank.variantsTable.weight")}</th>
                        <th className="p-1 text-left">{t("logRank.variantsTable.when")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-1 font-medium">{t("logRank.variants.logRank.name")}</td>
                        <td className="p-1 font-mono">w(t) = 1</td>
                        <td className="p-1">{t("logRank.variants.logRank.when")}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-1 font-medium">{t("logRank.variants.wilcoxon.name")}</td>
                        <td className="p-1 font-mono">w(t) = n(t)</td>
                        <td className="p-1">{t("logRank.variants.wilcoxon.when")}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-1 font-medium">{t("logRank.variants.petoPeto.name")}</td>
                        <td className="p-1 font-mono">w(t) = S~(t-)</td>
                        <td className="p-1">{t("logRank.variants.petoPeto.when")}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-1 font-medium">{t("logRank.variants.taroneWare.name")}</td>
                        <td className="p-1 font-mono">w(t) = √n(t)</td>
                        <td className="p-1">{t("logRank.variants.taroneWare.when")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground pt-1">{t("logRank.variantsNote")}</p>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{pHacking.title}</h4>
                  <p className="text-muted-foreground mb-2">{pHacking.intro}</p>
                  <p className="text-muted-foreground mb-2">{pHacking.risk}</p>
                  <h5 className="text-sm font-medium mb-1">{pHacking.adviceTitle}</h5>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    {pHacking.advice.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </HilfeKachel>
            </div>

            <div className="flex flex-col gap-6">
              <HilfeKachel titel={t("dataProcessing.title")} icon={<ShieldCheck className="h-4 w-4" />} ton={2}>
                <p className="text-muted-foreground">
                  {t.rich("dataProcessing.body", {
                    code: (chunks) => <code>{chunks}</code>
                  })}
                </p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>{t("dataProcessing.items.noTransfer")}</li>
                  <li>{t("dataProcessing.items.removeData")}</li>
                </ul>
              </HilfeKachel>

              <HilfeKachel titel={t("kaplanMeier.title")} icon={<Activity className="h-4 w-4" />} ton={3}>
                <p className="text-muted-foreground">
                  {t("kaplanMeier.body")}
                </p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>{t("kaplanMeier.items.axes")}</li>
                  <li>{t("kaplanMeier.items.multipleGroups")}</li>
                  <li>{t("kaplanMeier.items.patientsAtRisk")}</li>
                  <li>{t("kaplanMeier.items.plotDisplay")}</li>
                </ul>
              </HilfeKachel>

              <HilfeKachel titel={t("cox.title")} icon={<TrendingUp className="h-4 w-4" />} ton={1}>
                <p className="text-muted-foreground">
                  {t.rich("cox.body", { em: (chunks) => <em>{chunks}</em> })}
                </p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>{t.rich("cox.items.outputs", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("cox.items.interpretation", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("cox.items.estimation", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("cox.items.ties", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("cox.items.assumption", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                </ul>
              </HilfeKachel>

              <HilfeKachel titel={t("boxregeln.title")} icon={<Boxes className="h-4 w-4" />} ton={2}>
                <BoxregelnAbschnitt />
              </HilfeKachel>

              <HilfeKachel titel={t("export.title")} icon={<Download className="h-4 w-4" />} ton={3}>
                <p className="text-muted-foreground">{t("export.body")}</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>{t.rich("export.items.report", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("export.items.figures", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                  <li>{t.rich("export.items.data", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
                </ul>

                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">{sharing.title}</h4>
                  <p className="text-muted-foreground mb-2">{sharing.body}</p>
                  <h5 className="text-sm font-medium mb-1">{sharing.limitsTitle}</h5>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    {sharing.limits.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">{sharing.note}</p>
                </div>
              </HilfeKachel>

              <HilfeKachel titel={t("anomalies.title")} icon={<AlertTriangle className="h-4 w-4" />} ton={1}>
                <p>{t("anomalies.intro")}</p>
                <h4 className="font-semibold">{t("anomalies.uploadBehaviorTitle")}</h4>
                <p>{t("anomalies.uploadBehavior")}</p>
                <h4 className="font-semibold">{t("anomalies.resultsPanelTitle")}</h4>
                <p>{t("anomalies.resultsPanel")}</p>
                <h4 className="font-semibold">{t("anomalies.ruleTableTitle")}</h4>
                {/* Eigener Scrollbereich: die Kachel ist halb so breit wie die Seite,
                    und eine gestauchte Tabelle liest sich schlechter als eine, die
                    seitlich scrollt. */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-xs border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-1 text-left">{t("anomalies.ruleTableHeader.ruleId")}</th>
                        <th className="p-1 text-left">{t("anomalies.ruleTableHeader.class")}</th>
                        <th className="p-1 text-left">{t("anomalies.ruleTableHeader.severity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_RULES.map(r => (
                        <tr key={r.id} className="border-t">
                          <td className="p-1 font-mono">{r.id}</td>
                          <td className="p-1">{r.class}</td>
                          <td className="p-1">{r.severity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </HilfeKachel>

              <HilfeKachel titel={wiley.title} icon={<BookOpen className="h-4 w-4" />} ton={2}>
                <p className="text-muted-foreground">
                  {wiley.body}
                </p>
                <p className="text-muted-foreground font-medium mt-2">{wiley.entitiesNote}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 list-disc pl-5 text-muted-foreground text-xs">
                  {[
                    "Ampulla Vateri",
                    "Analkanal/perianale Haut",
                    "Appendix",
                    "Cervix uteri",
                    "Distale extrahepatische Gallengänge",
                    "Dünndarm",
                    "Endometriumkarzinom",
                    "Extremitätenskelett, Rumpf, Schädelbasis, Gesichtsknochen",
                    "GIST des Dünndarms",
                    "GIST des Magens",
                    "Gallenblase",
                    "Große Speicheldrüsen",
                    "Harnblasenkarzinom",
                    "Harnröhrenkarzinom",
                    "Hautkarzinome",
                    "Hautkarzinome des Kopf-Hals-Bereichs",
                    "Hepatozelluläres Karzinom",
                    "Intrahepatische Gallengänge",
                    "Karzinom des Augenlids",
                    "Kolon/Rektum",
                    "Larynx",
                    "Lungenkarzinom",
                    "Magen",
                    "Malignes Melanom der Haut",
                    "Malignes Melanom der Uvea",
                    "Malignes Melanom des Aerodigestivtrakts",
                    "Mammatumoren",
                    "Merkelzellkarzinom",
                    "Mundhöhle",
                    "Nasenhöhle und Nasennebenhöhlen",
                    "Nasopharynx",
                    "Nebennierenrindentumor",
                    "Neuroendokrine Tumoren (G1/G2) des Pankreas",
                    "Neuroendokrine Tumoren der Appendix",
                    "Neuroendokrine Tumoren des Jejunum und Ileum",
                    "Neuroendokrine Tumoren des Magens",
                    "Neuroendokrine Tumoren von Duodenum/Ampulle",
                    "Neuroendokrine Tumoren von Kolon und Rektum",
                    "Nierenbecken und Harnleiter",
                    "Nierenkarzinom",
                    "Ovar, Tube, Peritonealkarzinom",
                    "Pankreas",
                    "Peniskarzinom",
                    "Perihiläre Gallengänge",
                    "Pleuramesotheliom",
                    "Prostatakarzinom",
                    "Retinoblastom",
                    "Schilddrüse (<55 Jahre)",
                    "Schilddrüse (\u226555 Jahre)",
                    "Schilddrüse (anaplastisch)",
                    "Schilddrüse (medullär)",
                    "Thymustumoren",
                    "Thymic Tumours",
                    "Unbekannter Primärtumor mit Metastasen der Halslymphknoten",
                    "Uterussarkom",
                    "Vagina",
                    "Vulva",
                    "p16-negativ Oro- und Hypopharynxtumoren",
                    "p16-positive Oropharynxtumoren",
                    "Ösophagus/AEG (Adeno)",
                    "Ösophagus/AEG (PE)",
                  ].map((entity) => (
                    <li key={entity}>{entity}</li>
                  ))}
                </ul>
              </HilfeKachel>
            </div>
          </div>
      <TourLayer page="help" />
    </div>
  );
}


