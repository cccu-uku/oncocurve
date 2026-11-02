"use client";

import { Button, Card } from "@/components/ui";
import { useTranslations } from "next-intl";

export interface OncoBoxSample {
  fileName: string;
  boxType: string;
  schemaVersion: string;
  withoutFollowUps: boolean;
}

/** Nur Boxen, die der Importer auch parsen kann. Prostata 1.0 liegt im Repo,
 *  bekommt seine Karte aber erst mit seinem Profil. */
export const ONCOBOX_SAMPLES: readonly OncoBoxSample[] = [
  { fileName: "brust-2.xml", boxType: "brust", schemaVersion: "2.0", withoutFollowUps: false },
  { fileName: "darm-2.xml", boxType: "darm", schemaVersion: "2.0", withoutFollowUps: false },
  { fileName: "lunge-2.xml", boxType: "lunge", schemaVersion: "2.0", withoutFollowUps: false },
  { fileName: "brust-1.xml", boxType: "brust", schemaVersion: "1.0", withoutFollowUps: false },
  { fileName: "darm-1.xml", boxType: "darm", schemaVersion: "1.0", withoutFollowUps: true },
];

interface OncoBoxSampleCardsProps {
  onLoadSample: (fileName: string) => void;
}

export function OncoBoxSampleCards({ onLoadSample }: OncoBoxSampleCardsProps) {
  const t = useTranslations("OncoBox");

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h3 className="font-medium">{t("samplesTitle")}</h3>
        <span className="text-xs text-muted-foreground">{t("samplesOrigin")}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ONCOBOX_SAMPLES.map((sample) => (
          <Card key={sample.fileName} className="p-4 space-y-2">
            <p className="font-medium">
              {t(`boxes.${sample.boxType}`)} {sample.schemaVersion}
            </p>
            {sample.withoutFollowUps && (
              <p className="text-xs text-muted-foreground">{t("noFollowUpHint")}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLoadSample(sample.fileName)}
              aria-label={`${t("loadSample")}: ${t(`boxes.${sample.boxType}`)} ${sample.schemaVersion}`}
            >
              {t("loadSample")}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
