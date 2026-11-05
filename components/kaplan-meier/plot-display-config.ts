// Plot display preferences. Persisted in sessionStorage so users keep
// their toggle state across reloads within a tab.
// All toggles default to true (full standard view).

import type { LogRankMethod } from "@/utils/kaplan-meier";
import type { PaletteId } from "./curve-palettes";

export interface PlotDisplayConfig {
  showMedianLines: boolean;
  showConfidenceIntervals: boolean;
  showLegendCounts: boolean;
  showPValueAnnotation: boolean;
  showLandmarkTable: boolean;
  showMedianFollowUp: boolean;
  showPairwiseComparisons: boolean;
  showZeroEventWarning: boolean;
  // Display unit of the KM plot's and at-risk table's x-axis. Independent of
  // the cohort's own time unit (Box cohorts compute in days): this only
  // controls how that axis is presented, converting on the fly.
  showXAxisInDays: boolean;
  // Feste Marken alle fünf Jahre statt einer zur Kohorte passenden
  // Schrittweite. Für den Vergleich mehrerer Auswertungen untereinander:
  // sonst tragen zwei Abbildungen nebeneinander verschiedene Achsen.
  showFiveYearTicks: boolean;
  // Größere, kräftigere Schrift im ganzen Seiteninhalt, für Screenshots, die
  // im Paper verkleinert werden. Gilt auch auf der Upload-Seite.
  screenshotMode: boolean;
  logRankMethod: LogRankMethod;
  palette: PaletteId;
}

/**
 * The boolean on/off switches of the config, derived rather than listed. Both
 * the control and the results page used to repeat this union by hand, which
 * drifted apart the moment a switch was added.
 */
export type PlotDisplayToggleKey = {
  [K in keyof PlotDisplayConfig]: PlotDisplayConfig[K] extends boolean ? K : never;
}[keyof PlotDisplayConfig];

export const DEFAULT_PLOT_DISPLAY: PlotDisplayConfig = {
  showMedianLines: true,
  showConfidenceIntervals: true,
  showLegendCounts: true,
  showPValueAnnotation: true,
  showLandmarkTable: true,
  showMedianFollowUp: true,
  showPairwiseComparisons: true,
  showZeroEventWarning: true,
  showXAxisInDays: false,
  showFiveYearTicks: false,
  screenshotMode: false,
  logRankMethod: "logRank",
  palette: "standard",
};

export const PLOT_DISPLAY_STORAGE_KEY = "km-plot-display";

export function loadPlotDisplay(): PlotDisplayConfig {
  if (typeof window === "undefined") return DEFAULT_PLOT_DISPLAY;
  try {
    const raw = sessionStorage.getItem(PLOT_DISPLAY_STORAGE_KEY);
    if (!raw) return DEFAULT_PLOT_DISPLAY;
    const parsed = JSON.parse(raw) as Partial<PlotDisplayConfig>;
    return { ...DEFAULT_PLOT_DISPLAY, ...parsed };
  } catch {
    return DEFAULT_PLOT_DISPLAY;
  }
}

export function savePlotDisplay(cfg: PlotDisplayConfig): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PLOT_DISPLAY_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* sessionStorage quota or disabled — silent skip */
  }
}
