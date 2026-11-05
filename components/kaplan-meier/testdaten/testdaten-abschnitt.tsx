"use client";

import { useTranslations } from "next-intl";
import { TEST_GRUPPEN } from "./szenarien";
import SzenarioKarte from "./szenario-karte";

interface TestdatenAbschnittProps {
  isProcessing: boolean;
  onLoad: (key: string) => void;
}

/**
 * Die Testdaten in drei Blöcken: zuerst die veröffentlichten Kohorten, dann
 * die im Browser erzeugten, zuletzt die, die eine einzelne Funktion vorführen.
 * Jeder Block trägt eine Überschrift und einen Satz dazu, wofür seine
 * Datensätze taugen; vorher lagen alle zwölf ununterschieden in einem Raster.
 */
export default function TestdatenAbschnitt({ isProcessing, onLoad }: TestdatenAbschnittProps) {
  const t = useTranslations("KaplanMeier");

  return (
    <div className="space-y-6">
      {TEST_GRUPPEN.map((gruppe) => (
        <section key={gruppe.id} className="space-y-3">
          <div>
            <h3 className="km-card-title">{t(`testData.groups.${gruppe.id}.title`)}</h3>
            <p className="km-label mt-0.5">{t(`testData.groups.${gruppe.id}.description`)}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {gruppe.szenarien.map((szenario) => (
              <SzenarioKarte key={szenario.key} szenario={szenario} isProcessing={isProcessing} onLoad={onLoad} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
