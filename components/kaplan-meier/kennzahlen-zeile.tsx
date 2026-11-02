"use client";

import { useTranslations } from "next-intl";
import { formatiereKennzahlenZeile, kennzahlenFuerKurve, type KennzahlenPatient } from "./endpunkte/boxregeln/kennzahlen-kohorte";
import type { ZeitEinheit } from "./endpunkte/anwenden";
import type { KurvenSchaetzer } from "./boxkurve";
import { InfoTooltip } from "./info-tooltip";

interface KennzahlenZeileProps {
  /** Dieselbe Kohorte, aus der die daneben gezeichnete Kurve entsteht. */
  patienten: KennzahlenPatient[];
  zeitEinheit: ZeitEinheit;
  /** Übersetzte Einheit ("Tage"/"Monate"), dieselbe wie an der Achse. */
  einheitLabel: string;
  /** Dasselbe Verfahren, mit dem die daneben gezeichnete Kurve entsteht. */
  kurvenSchaetzer: KurvenSchaetzer;
  /**
   * Mediane Nachbeobachtung nach reverse Kaplan-Meier. Steht hier immer, auch
   * wenn die gleichnamige Annotation im Diagramm abgeschaltet ist: das ist die
   * methodisch übliche Angabe, und nur hier kann sie einen Info-Knopf tragen,
   * weil eine SVG-Annotation nichts Fokussierbares aufnimmt. Die Annotation im
   * Diagramm bleibt davon unberührt; wer sie einschaltet, will die Zahl im
   * Bild haben, etwa für einen Screenshot der Kurve allein.
   */
  medianFollowUpReverseKm?: number | null;
}

/**
 * Ruhige, einzeilige Ergänzung unter Kurve und Risikotabelle: Nachbeobach-
 * tungsdauer und mediane ereignisfreie Zeit, in derselben Einheit wie die
 * Achse daneben. Ohne Kohorte wird nichts gerendert.
 *
 * Zeigt zusätzlich den reverse-KM-Median aus der Diagramm-Annotation, denn
 * die beiden Zahlen sehen einander ähnlich, beantworten aber verschiedene
 * Fragen. Je ein stiller Info-Knopf erklärt, was die jeweilige Zahl misst
 * und warum sie von der anderen abweicht.
 */
export default function KennzahlenZeile({ patienten, zeitEinheit, einheitLabel, kurvenSchaetzer, medianFollowUpReverseKm }: KennzahlenZeileProps) {
  const tr = useTranslations("Results");
  const ergebnis = kennzahlenFuerKurve(patienten, zeitEinheit, kurvenSchaetzer);
  const zeile = formatiereKennzahlenZeile(ergebnis, einheitLabel, {
    dauer: tr("followUp.durationLabel"),
    median: tr("followUp.medianAbbr"),
    min: tr("followUp.minAbbr"),
    max: tr("followUp.maxAbbr"),
    ereignisfrei: tr("followUp.eventFreeLabel"),
    nichtErreicht: tr("followUp.notReached"),
  });
  if (!zeile) return null;

  const zeigeReverseKm = medianFollowUpReverseKm !== null && medianFollowUpReverseKm !== undefined && isFinite(medianFollowUpReverseKm);

  return (
    <div className="km-label mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
      {zeigeReverseKm && (
        <span className="inline-flex items-center gap-1">
          {tr("followUp.reverseKmLabel")}: {medianFollowUpReverseKm!.toFixed(1)} {einheitLabel}
          <InfoTooltip text={tr("followUp.reverseKmTooltip")} ariaLabel={tr("followUp.reverseKmInfoAriaLabel")} />
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        {zeile}
        <InfoTooltip text={tr("followUp.tooltip")} ariaLabel={tr("followUp.plainMedianInfoAriaLabel")} />
      </span>
    </div>
  );
}
