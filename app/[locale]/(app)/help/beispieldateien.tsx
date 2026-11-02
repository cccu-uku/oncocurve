"use client";

import React from "react";
import { Download, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Alle Beispieldateien, die im Projekt liegen, an einer Stelle zum
 * Herunterladen.
 *
 * Bisher waren sie über die Anwendung verstreut: drei im Uploadabschnitt der
 * Hilfe, zwei im Testdatenbereich, die OncoBox-Dateien nirgends. Wer ein
 * Format ausprobieren wollte, musste wissen, wo es liegt. Die Dateinamen
 * stehen unübersetzt da, denn sie sind auch das, was hinterher auf der
 * Festplatte liegt.
 */

interface Gruppe {
  /** Zweig unter Help.sampleFiles.groups in den Sprachdateien. */
  id: string;
  /** Pfade unterhalb von public/. */
  dateien: string[];
}

const GRUPPEN: Gruppe[] = [
  { id: "obds", dateien: ["sample-obds.xml", "sample-50patients.xml", "test-100-patients-complete.xml"] },
  {
    id: "oncobox",
    dateien: [
      "oncobox-samples/brust-1.xml",
      "oncobox-samples/brust-2.xml",
      "oncobox-samples/darm-1.xml",
      "oncobox-samples/darm-1-verlauf.xml",
      "oncobox-samples/darm-2.xml",
      "oncobox-samples/lunge-2.xml",
      "oncobox-samples/prostata-1.xml",
    ],
  },
  { id: "csv", dateien: ["sample-patients.csv", "sample-patients-simple.csv", "sample-metabric.csv", "sample-tcga.csv"] },
  { id: "excel", dateien: ["sample-extras/sample-extras-cohort.xlsx", "sample-ttft-cll.xlsx"] },
  {
    id: "extras",
    dateien: ["sample-extras/sample-extras-cohort.csv", "sample-extras/sample-extras-mixed-units.csv", "sample-anomalies.csv"],
  },
];

/**
 * Die Stellen, die diese Unterlagen herausgeben. Die Adressen sind belegt: die
 * erste steht in public/oncobox-samples/SOURCE.md als Quelle der
 * Musterlösungen, die übrigen stehen in den Spezifikationstabellen der Boxen
 * selbst.
 *
 * Angeklickt werden sie in einem neuen Tab. Von sich aus ruft die Anwendung
 * nichts davon ab: ein Verweis lädt nichts, solange niemand darauf klickt, und
 * damit bleibt sie auch ohne Netz vollständig benutzbar.
 */
const QUELLEN: { id: string; url: string }[] = [
  { id: "oncobox", url: "https://www.xml-oncobox.de/de/Home/FuerHersteller" },
  { id: "dkg", url: "https://www.krebsgesellschaft.de/zertdokumente.html" },
  { id: "onkozert", url: "https://www.onkozert.de/informationen/hinweise/" },
  {
    id: "gekid",
    url: "https://www.gekid.de/wp-content/uploads/2018/10/Empfehlungen_zur_Analyse_von_Ueberlebensraten.pdf",
  },
];

/** Der Dateiname ohne Ordner, so wie er nach dem Herunterladen heisst. */
function dateiname(pfad: string): string {
  return pfad.slice(pfad.lastIndexOf("/") + 1);
}

export function Beispieldateien(): React.ReactElement {
  const t = useTranslations("Help");
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">{t("sampleFiles.intro")}</p>
      {GRUPPEN.map((gruppe) => (
        <div key={gruppe.id}>
          <h4 className="text-sm font-medium">{t(`sampleFiles.groups.${gruppe.id}.title`)}</h4>
          <p className="km-label mb-1.5">{t(`sampleFiles.groups.${gruppe.id}.description`)}</p>
          <div className="flex flex-wrap gap-2">
            {gruppe.dateien.map((pfad) => (
              <a
                key={pfad}
                href={`/${pfad}`}
                download={dateiname(pfad)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-xs hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="h-3 w-3 shrink-0" />
                {dateiname(pfad)}
              </a>
            ))}
          </div>
        </div>
      ))}
      <p className="km-label">{t("sampleFiles.note")}</p>

      <div className="border-t pt-3">
        <h4 className="text-sm font-medium">{t("sampleFiles.sources.title")}</h4>
        <p className="km-label mb-2">{t("sampleFiles.sources.intro")}</p>
        <ul className="space-y-1.5">
          {QUELLEN.map((quelle) => (
            <li key={quelle.id}>
              <a
                href={quelle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1.5 text-sm underline underline-offset-2 hover:no-underline"
              >
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{t(`sampleFiles.sources.${quelle.id}`)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
