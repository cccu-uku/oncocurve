"use client";

import { useTranslations } from "next-intl";
import {
  type SurvivalDataPoint,
  computeKaplanMeierCI,
  computeKMAtTimepoints,
} from "@/utils/kaplan-meier";

interface LandmarkSurvivalTableProps {
  curves: { name: string; color: string; data: SurvivalDataPoint[] }[];
  /**
   * Zeitpunkte für die drei Spalten, in der Einheit der Kohorte. Ohne Angabe
   * die bisherigen Monate. Eine Boxkohorte rechnet in Tagen; ohne die
   * passenden Tageswerte würden 12/36/60 Tage statt 12/36/60 Monaten
   * abgefragt, und die Spalten "1 Jahr" bis "5 Jahre" zeigten Werte kurz nach
   * der Diagnose.
   */
  landmarkTimes?: [number, number, number];
  /**
   * Falsch, wenn eine umgebende Karte die Überschrift schon selbst stellt
   * (siehe results/page.tsx). Ohne dieses Feld stünde die Überschrift
   * doppelt: einmal im Kartenkopf, einmal hier.
   */
  showTitle?: boolean;
}

const LANDMARK_MONTHS: [number, number, number] = [12, 36, 60];

function formatRate(survival: number, ciLo: number, ciHi: number): string {
  const fmtPct = (v: number) => (isFinite(v) ? `${(v * 100).toFixed(1)}%` : "-");
  if (!isFinite(survival)) return "-";
  return `${fmtPct(survival)} (${fmtPct(ciLo)}-${fmtPct(ciHi)})`;
}

export function LandmarkSurvivalTable({ curves, landmarkTimes, showTitle = true }: LandmarkSurvivalTableProps) {
  const t = useTranslations("LandmarkTable");
  if (!curves || curves.length === 0) return null;

  const zeitpunkte = landmarkTimes ?? LANDMARK_MONTHS;
  // Kumulative Inzidenz steigt von null: steht an den Kurvenpunkten selbst
  // (siehe boxkurve.ts), nicht am Endpunktnamen. "Überleben" wäre hier falsch.
  const istKumulativeInzidenz = curves.some((curve) => curve.data[0]?.cumulativeIncidence);

  const rows = curves.map((curve) => {
    const dataWithCI = computeKaplanMeierCI(curve.data);
    const points = computeKMAtTimepoints(dataWithCI, zeitpunkte);
    // computeKMAtTimepoints returns the LAST observed survival for timepoints
    // beyond the maximum observation time (not NaN). Detect explicitly.
    const maxObserved =
      dataWithCI.length > 0 ? dataWithCI[dataWithCI.length - 1].time : 0;
    return {
      name: curve.name,
      color: curve.color,
      cells: points.map((p, i) =>
        zeitpunkte[i] > maxObserved
          ? "-"
          : formatRate(p.survival, p.ciLower95, p.ciUpper95)
      ),
    };
  });

  return (
    <div className={showTitle ? "mt-4 overflow-x-auto" : "overflow-x-auto"}>
      {showTitle && (
        <h4 className="km-card-title mb-2">{t(istKumulativeInzidenz ? "titleIncidence" : "title")}</h4>
      )}
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-3 font-medium">{t("stratum")}</th>
            <th className="text-right py-2 px-3 font-medium">{t("oneYear")}</th>
            <th className="text-right py-2 px-3 font-medium">{t("threeYear")}</th>
            <th className="text-right py-2 px-3 font-medium">{t("fiveYear")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-border/40">
              <td className="py-2 pr-3 flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: row.color }}
                  aria-hidden="true"
                />
                <span>{row.name}</span>
              </td>
              {row.cells.map((cell, i) => (
                <td key={i} className="py-2 px-3 text-right tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="km-label mt-1">{t(istKumulativeInzidenz ? "hintIncidence" : "hint")}</p>
    </div>
  );
}
