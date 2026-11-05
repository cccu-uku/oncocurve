"use client";

import { Badge, Button, Card } from "@/components/ui";
import { Database, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TestSzenario } from "./szenarien";
import { baueSzenarioCsv, baueSzenarioXml, speichereAlsDatei } from "./dateien";

interface SzenarioKarteProps {
  szenario: TestSzenario;
  /** Läuft gerade ein Import, sind alle Ladeknöpfe gesperrt. */
  isProcessing: boolean;
  onLoad: (key: string) => void;
}

/** Eine Kachel: Name, Fallzahl, Beschreibung, Laden und Herunterladen. */
export default function SzenarioKarte({ szenario, isProcessing, onLoad }: SzenarioKarteProps) {
  const t = useTranslations("KaplanMeier");
  const zweig = `testData.scenarios.${szenario.i18nKey}`;
  const dateiname = (endung: string) =>
    `${t("testData.filePrefix")}-${szenario.key}-${szenario.patientCount}-${t("testData.filePatientsSuffix")}.${endung}`;

  return (
    <Card className="flex flex-col p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-medium">{t(`${zweig}.name`)}</h4>
        <Badge variant="outline" className="shrink-0">
          {t("testData.patientCount", { count: szenario.patientCount })}
        </Badge>
      </div>
      <p className="mb-3 flex-1 text-sm text-muted-foreground">
        {szenario.quellLink
          ? t.rich(`${zweig}.description`, {
              link: (chunks) => (
                <a
                  href={szenario.quellLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  {chunks}
                </a>
              ),
            })
          : t(`${zweig}.description`)}
      </p>
      <Button onClick={() => onLoad(szenario.key)} disabled={isProcessing} className="mb-2 w-full" variant="outline">
        <Database className="mr-2 h-4 w-4" />
        {isProcessing ? t("loading") : t("testData.load")}
      </Button>
      <div className="flex gap-2">
        {szenario.csvDatei ? (
          // Fertige Datei aus public/: sie ist die Quelle, aus der die Kohorte
          // auch geladen wird, und wird deshalb nicht neu erzeugt.
          <Button variant="ghost" size="sm" asChild className="flex-1 text-primary hover:text-primary/80">
            <a href={`/${szenario.csvDatei}`} download={szenario.csvDatei}>
              <Download className="mr-1 h-3 w-3" />
              CSV
            </a>
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => speichereAlsDatei(baueSzenarioXml(szenario.key), dateiname("xml"), "text/xml")}
              className="flex-1 text-primary hover:text-primary/80"
            >
              <Download className="mr-1 h-3 w-3" />
              XML
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => speichereAlsDatei(baueSzenarioCsv(szenario.key), dateiname("csv"), "text/csv")}
              className="flex-1 text-primary hover:text-primary/80"
            >
              <Download className="mr-1 h-3 w-3" />
              CSV
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
