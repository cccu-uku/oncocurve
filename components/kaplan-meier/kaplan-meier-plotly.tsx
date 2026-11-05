"use client";

import html2canvas from "html2canvas";
import { useTheme } from "next-themes";
import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from "react";
import { computeKaplanMeierCI, computeKMPercentile, fixedFiveYearTicks, niceTimeTicks, xAxisPlotRange, SurvivalDataPoint, TimeUnit } from "../../utils/kaplan-meier";
import { useLocale, useTranslations } from "next-intl";
import { ICD_10_CODES, spellOutCode } from "./oncobox/code-label";
import { plotSchrift } from "./screenshot-modus";

const Plot = dynamic(() => import('./plotly-plot'), { ssr: false }) as any;

// Hilfsfunktion: Robuste Datumsformatierung-gibt '' zurück wenn kein gültiges Datum
function formatDateSafe(value: any, locale: string): string {
  if (!value) return '';
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    d = new Date(value);
  } else {
    return '';
  }
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale);
}

export interface KaplanMeierCurve {
  name: string;
  color: string;
  dash?: import("./curve-palettes").DashPattern;
  data: SurvivalDataPoint[];
  // True for a stratum with real patients but zero events (flat line at 1.0).
  // It still counts in the log-rank test, so it is shown, but the legend
  // marks it since it has no median and its "events" count is always 0.
  zeroEvent?: boolean;
}

interface KaplanMeierPlotlyProps {
  curves: KaplanMeierCurve[];
  title?: string;
  height?: number;
  stratificationLabel?: string; // e.g. "Overallsurvival (OAS)"
  survivalMode?: "overall" | "dfs" | "stratified";
  endpoint?: "overall" | "ttft"; // y-axis/event wording; orthogonal to grouping
  onRendered?: () => void; // Callback wenn Plot initial gerendert/aktualisiert wurde
  showMedianLines?: boolean;
  showConfidenceIntervals?: boolean;
  showLegendCounts?: boolean;
  showPValueAnnotation?: boolean;
  showMedianFollowUp?: boolean;
  pValue?: number | null;
  medianFollowUpMonths?: number | null;
  curveCounts?: Record<string, { n: number; events: number }>;
  // Beschriftung der x-Achse. Boxkohorten rechnen in Tagen, alles andere in
  // Monaten; ohne diese Angabe stünde die feste Beschriftung "Monate" auch
  // unter einer Kurve in Tagen.
  xAxisLabel?: string;
  // Einheit, in der `curves[].data[].time` bereits vorliegt (die Seite rechnet
  // beim "x-Achse in Tagen"-Schalter um, bevor sie die Kurven hier hineingibt).
  // Nur für die Tick-Schrittwahl nötig: niceTimeTicks braucht ein Kandidaten-Set
  // passend zur Einheit der schon umgerechneten Werte.
  timeUnit?: TimeUnit;
  // Feste Marken alle fünf Jahre statt einer zur Kohorte passenden
  // Schrittweite. Die Seite setzt denselben Schalter auch für die
  // Risikotabelle darunter, sonst stünden die beiden Achsen nicht mehr
  // untereinander.
  fiveYearTicks?: boolean;
  // Einheit-Beschriftung für `medianFollowUpMonths`. Der Reverse-KM-Wert
  // kommt roh von der Seite und wird NICHT mit den Kurven umgerechnet (siehe
  // dort), folgt also der Kohorten-Einheit statt der gewählten Achsen-Einheit.
  // Ohne eigenes Label läse die Annotation sonst "176.0 Monate" für einen
  // Tage-Wert, sobald xAxisLabel (Achsentitel) auf die Anzeigeeinheit zeigt.
  medianFollowUpUnitLabel?: string;
  // Größere, kräftigere Schrift und dunkle Achsen für Screenshots.
  screenshotModus?: boolean;
  // Called when a legend entry is clicked (with its legendgroup = curve name).
  // Lets the parent hide the group for real (re-running the analysis and
  // rescaling the axes) instead of Plotly's default "legendonly" greying, which
  // leaves the x-axis stretched to the now-hidden curve.
  onCurveToggle?: (legendGroup: string) => void;
  // Groups that are currently hidden: shown as greyed-out "legendonly" entries
  // so the user can click them to re-enable them without leaving the chart.
  hiddenCurves?: { name: string; color: string }[];
}

// Hilfsfunktion: PNG-Export
export async function exportPlotlyChartAsPNG(containerRef: React.RefObject<HTMLDivElement | null>, filename = "kaplan-meier-plot.png") {
  if (!containerRef.current) return;
  const canvas = await html2canvas(containerRef.current);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

// Hilfsfunktion: PDF-Export (Plot + Statistiken)
export async function exportKaplanMeierAsPDF(
  containerRef: React.RefObject<HTMLDivElement | null>,
  filename = "kaplan-meier-report.pdf",
  titleText = "Kaplan-Meier Report"
) {
  if (!containerRef.current) return;
  const jsPDF = (await import('jspdf')).default;
  const canvas = await html2canvas(containerRef.current, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  // Plot-Bild einfügen (maximal 60% der Seite)
  const imgWidth = pageWidth - 80;
  const imgHeight = Math.min((canvas.height / canvas.width) * imgWidth, pageHeight * 0.6);
  pdf.text(titleText, 40, 40);
  pdf.addImage(imgData, 'PNG', 40, 60, imgWidth, imgHeight);
  // Platz für weitere Statistiken (optional)
  // pdf.text('Weitere Statistiken ...', 40, 80 + imgHeight);
  pdf.save(filename);
}

// Hex nach RGBA umwandeln (robust für Plotly-Farben)
function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  const clampedA = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedA})`;
}

// Hilfsfunktion: Statistik-Berechnung (Median, 25%, max Follow-up)
export function getKaplanMeierStatistics(
  data: { time: number; probability: number; cumulativeIncidence?: boolean }[],
  options?: { notReachedLabel?: string }
) {
  if (!data || data.length === 0) return null;
  const notReached = options?.notReachedLabel ?? "Not reached";
  // Eine kumulative Inzidenz steigt von null: die Suche nach dem ersten Wert
  // unter 0,5 träfe dort den ersten Punkt der Kurve. Eine Rate hat kein
  // Überlebensquantil, siehe computeKMPercentile.
  const inzidenz = Boolean(data[0]?.cumulativeIncidence);
  const medianSurvival = (!inzidenz && data.find(d => d.probability <= 0.5)?.time) || notReached;
  const survival25 = (!inzidenz && data.find(d => d.probability <= 0.25)?.time) || notReached;
  const maxFollowUp = Math.max(...data.map(d => d.time));
  return { medianSurvival, survival25, maxFollowUp, finalProbability: data[data.length - 1]?.probability || 0 };
}

// Use shared color palette for consistency
import KAPLAN_MEIER_COLORS from "./kaplan-meier-colors";
const PLOT_COLORS = KAPLAN_MEIER_COLORS;

const KaplanMeierPlotly: React.FC<KaplanMeierPlotlyProps> = ({
  curves,
  title,
  height = 400,
  stratificationLabel,
  survivalMode = "stratified",
  endpoint = "overall",
  onRendered,
  showMedianLines = true,
  showConfidenceIntervals = true,
  showLegendCounts = true,
  showPValueAnnotation = true,
  showMedianFollowUp = true,
  pValue = null,
  medianFollowUpMonths = null,
  curveCounts,
  onCurveToggle,
  hiddenCurves = [],
  xAxisLabel,
  timeUnit = "months",
  fiveYearTicks = false,
  medianFollowUpUnitLabel,
  screenshotModus = false,
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resizeDebounceRef = useRef<number | null>(null);
  const t = useTranslations("KaplanMeier");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const [revision, setRevision] = useState(0);

  // Zwei Zeiteinheiten gibt es insgesamt: Tage oder Monate. xAxisLabel trägt
  // bereits das übersetzte Wort; ohne eigenes Wort für Monate hier fiele die
  // Unterscheidung weg. Dient nur den Sätzen, die die Einheit fest im Text
  // tragen ("Tod im Monat", "Zeit (Monate)") und sich nicht wie die Achse
  // durch einfaches Anhängen von xAxisLabel umstellen lassen.
  const zeitEinheitIstTage = xAxisLabel !== undefined && xAxisLabel !== t("plot.months");

  // Theme-aware colors, reagieren auf Theme-Wechsel
  const isDark = resolvedTheme === 'dark';
  const colors = {
    paperBg: isDark ? '#0b0f14' : '#ffffff',
    plotBg: isDark ? '#0b0f14' : '#ffffff',
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    axis: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
    title: isDark ? '#e5e7eb' : '#111827',
    text: isDark ? '#e5e7eb' : '#111827',
    hoverBg: isDark ? '#111827' : '#ffffff',
    hoverText: isDark ? '#e5e7eb' : '#111827',
  } as const;
  const achse = screenshotModus ? colors.text : colors.axis;
  const schrift = (groesse: number) => plotSchrift(groesse, screenshotModus);

  // Bei Theme-Wechsel Refresh/Resize auslösen, damit Plotly Layoutfarben übernimmt
  useEffect(() => {
    setRevision(r => r + 1);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  }, [resolvedTheme]);

  // Check if no stratification is selected
  const isOverallSurvival = curves.length === 0;

  // If no stratification, calculate overall survival
  const overallCurves = isOverallSurvival ? calculateOverallSurvival(curves.flatMap(curve => curve.data.map(d => ({
    icd10: curve.name, // Assuming curve name is the ICD-10 code
    time: d.time,
    event: d.events > 0,
  })))) : curves;

  // Assign colors if not set and sort legend/groups naturally
  const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });
  // In der Legende Präfixe beibehalten (cT/pT/T)
  const stripPrefix = (s: string) => s;
  const coloredCurves = overallCurves
    .map((curve, idx) => ({
    ...curve,
      color: curve.color || PLOT_COLORS[idx % PLOT_COLORS.length],
      dash: (curve as { dash?: KaplanMeierCurve["dash"] }).dash ?? "solid",
      name: stripPrefix(curve.name),
      zeroEvent: (curve as { zeroEvent?: boolean }).zeroEvent,
    }))
    .sort((a, b) => collator.compare(a.name, b.name));

  // Welches Verfahren die gezeigten Kurven tatsächlich gerechnet hat: steht
  // an jedem Punkt selbst (siehe boxkurve.ts), nicht am Endpunktnamen. Eine
  // kumulative Inzidenz steigt von null, deshalb braucht die Achse ein
  // anderes Wort als "Überlebenswahrscheinlichkeit".
  const istKumulativeInzidenz = coloredCurves.some(
    (curve) => (curve.data[0] as { cumulativeIncidence?: boolean } | undefined)?.cumulativeIncidence,
  );

  // Calculate survival and CI for each curve
  const traces = coloredCurves.flatMap((curve, idx) => {
    // Synchronize CI and survival curve strictly by time points
    const dataWithCI = computeKaplanMeierCI(curve.data);
    // Only use the time points from the survival curve (step function)
    const x = dataWithCI.map((d) => d.time);
    const y = dataWithCI.map((d) => d.probability * 100);
    const yUpper = dataWithCI.map((d) => d.upperCI * 100);
    const yLower = dataWithCI.map((d) => d.lowerCI * 100);

    // Helper: hide legend for all traces if Overallsurvival (OAS)
    const hideLegend = false; // Legende immer anzeigen
    const overallLabel = t("plot.overallTitle"); // "Gesamtüberleben"
    const eventLabel = survivalMode === "overall" ? t("plot.eventDeath") : t("plot.eventGeneric");

    // CI area als geschlossenes Polygon (oberes Band -> unteres Band rückwärts -> Start schließen)
    const xPolygon = [...x, ...x.slice().reverse(), x[0]];
    const yPolygon = [...yUpper, ...yLower.slice().reverse(), yUpper[0]];
    const ciTrace = {
      x: xPolygon,
      y: yPolygon,
      fill: "toself",
      fillcolor: hexToRgba(curve.color.startsWith('#') ? curve.color : '#0072e6', 0.15),
      line: { color: "transparent", width: 0 },
      hoverinfo: "skip",
      name: undefined,
      legendgroup: curve.name,
      showlegend: hideLegend ? false : false, // always false for CI
      type: "scatter",
      mode: "lines",
      connectgaps: true,
      visible: showConfidenceIntervals,
    };
    // Survival curve
    const counts = curveCounts?.[curve.name];
    const nameWithCounts =
      showLegendCounts && curve.zeroEvent
        ? counts
          ? `${curve.name} (n=${counts.n}, ${t("plot.noEvents")})`
          : `${curve.name} (${t("plot.noEvents")})`
        : showLegendCounts && counts
          ? `${curve.name} (n=${counts.n}, ${counts.events} ${t("plot.events")})`
          : curve.name;
    const survTrace = {
      x,
      y,
      mode: "lines",
      line: { color: curve.color, width: 2, shape: 'hv' as const, dash: curve.dash ?? 'solid' },
      name: survivalMode === "overall" ? overallLabel : nameWithCounts,
      legendgroup: curve.name,
      showlegend: survivalMode === "overall" ? (idx === 0) : true,
      type: "scatter",
      visible: true,
      customdata: dataWithCI.map(d => [d.atRisk, d.events, (d as any).patientId || null, (d as any).icd10 || null]),
      hoverinfo: "skip"
    };
    // Marker für Tod (event === true) — asterisk with a white halo so it stays
    // visible on top of the same-coloured curve line; keeps the per-patient hover.
    const deathEvents = curve.data.filter(d => (d as any).event === true);
    const deathY = deathEvents.map(d => {
      const found = dataWithCI.find(dd => dd.time === d.time);
      return found ? found.probability * 100 : null;
    });
    const deathTrace = deathEvents.length > 0 ? {
      x: deathEvents.map(d => d.time),
      y: deathY,
      mode: "markers",
      marker: { symbol: "asterisk", color: curve.color, size: 8, line: { width: 2, color: curve.color } },
      cliponaxis: false,
      name: hideLegend ? undefined : `${curve.name} ${eventLabel}`,
      legendgroup: curve.name,
      showlegend: false,
      type: "scatter",
      visible: true,
      customdata: deathEvents.map(d => {
        const found = dataWithCI.find(dd => dd.time === d.time) as any;
        // Kurzcodes ausschreiben, den Code in Klammern dahinter. Unbekannte
        // Codes bleiben stehen, damit Nicht-OncoBox-Daten unberuehrt bleiben.
        return [found?.patientId ?? null, spellOutCode(found?.icd10, ICD_10_CODES, locale) ?? null];
      }),
      hovertemplate: `${t("plot.patientId")}: %{customdata[0]}<br>${t("plot.icd10")}: %{customdata[1]}<br>${zeitEinheitIstTage ? t("plot.deathAtDay") : t("plot.deathAtMonth")}: %{x}<extra></extra>`
    } : null;

    // Marker für Zensierung (event === false)
    // A censored patient is censored at their observed time regardless of
    // whether a follow-up DATE is recorded (that date is only used for the
    // tooltip). Marking only those with a followupDate hid censoring on data
    // like METABRIC that carries times but no follow-up dates.
    const censoredPoints = curve.data
      .map((d, i) => ({ ...d, idx: i }))
      .filter(d => (d as any).event === false);
    const censoredTrace = censoredPoints.length > 0 ? {
      x: censoredPoints.map(d => d.time),
      y: censoredPoints.map(d => {
        const found = dataWithCI.find(dd => dd.time === d.time);
        return found ? found.probability * 100 : null;
      }),
      mode: "markers",
      marker: {
        symbol: "line-ns-open",
        color: curve.color,
        size: 12,
        line: { width: 2.5, color: curve.color },
      },
      cliponaxis: false,
      name: hideLegend ? undefined : `${curve.name} ${t("plot.censored")}`,
      legendgroup: curve.name,
      showlegend: hideLegend ? false : false,
      type: "scatter",
      visible: true,
      customdata: censoredPoints.map(d => {
        // Patientendaten für Hover: ID, Zeit, Follow-up/Vitaldatum
        const patientId = (d as any).patientId ?? null;
        const time = d.time;
        const followupDate = (d as any).followupDate;
        const vitalDate = (d as any).vitalDate;
        // Format für Anzeige -robust gegen ungültige Datumswerte
        const followupStr = formatDateSafe(followupDate, locale);
        const vitalStr = formatDateSafe(vitalDate, locale);
        // Optionale Zeilen nur einfügen wenn Wert vorhanden
        const lines = [
          `${t("plot.patientId")}: ${patientId ?? '-'}`,
          `${zeitEinheitIstTage ? t("plot.timeDays") : t("plot.timeMonths")}: ${time}`,
          ...(followupStr ? [`${t("plot.followUpDate")}: ${followupStr}`] : []),
          ...(vitalStr ? [`${t("plot.vitalDate")}: ${vitalStr}`] : []),
          t("plot.censored"),
        ];
        return [lines.join('<br>')];
      }),
      hovertemplate: `%{customdata[0]}<extra></extra>`
    } : null;

    // Reihenfolge: CI, Linie, Tod, Zensur
    const traceList: any[] = [ciTrace, survTrace];
    if (deathTrace) traceList.push(deathTrace);
    if (censoredTrace) traceList.push(censoredTrace);

    // Median-Linie: vertikale gestrichelte Linie vom Schnittpunkt mit S=50% bis Y=0
    if (showMedianLines) {
      const median = computeKMPercentile(dataWithCI, 0.5);
      if (median.time !== null && isFinite(median.time)) {
        traceList.push({
          x: [median.time, median.time],
          y: [0, 50],
          mode: "lines",
          type: "scatter",
          line: { color: curve.color, dash: "dash", width: 1.5 },
          legendgroup: curve.name,
          name: `${curve.name} ${t("plot.medianLineLabel")}`,
          showlegend: true,
          hovertemplate: `${curve.name} ${t("plot.medianHover")}: %{x:.1f} ${xAxisLabel ?? t("plot.months")}<extra></extra>`,
        });
      }
    }

    return traceList;
  });

  // Calculate the maximum time (months) for the X-axis
  const maxTime = Math.max(...coloredCurves.flatMap(curve => curve.data.map(d => d.time)), 0);
  // Pick a "nice" tick interval so labels never overlap on long-followed
  // cohorts. niceTimeTicks aims for at most ~10 ticks; 30y cohorts get 5y
  // steps, 2y cohorts get 3-month steps, etc.
  const xTicks = fiveYearTicks
    ? fixedFiveYearTicks(maxTime, timeUnit)
    : niceTimeTicks(maxTime, 10, timeUnit);
  const maxTick = xTicks[xTicks.length - 1];

  // Global 50% reference line — only visible when at least one curve reaches its median
  const anyMedianReached =
    showMedianLines &&
    coloredCurves.some((c) => {
      const dwci = computeKaplanMeierCI(c.data);
      const m = computeKMPercentile(dwci, 0.5);
      return m.time !== null && isFinite(m.time);
    });

  const medianRefShape = anyMedianReached
    ? [
        {
          type: "line" as const,
          xref: "paper" as const,
          yref: "y" as const,
          x0: 0,
          x1: 1,
          y0: 50,
          y1: 50,
          line: { color: colors.grid, width: 1, dash: "dot" as const },
          layer: "below" as const,
        },
      ]
    : [];

  // Annotation per curve at the foot of its median line (median time as integer label)
  const medianAnnotations = showMedianLines
    ? coloredCurves
        .map((c) => {
          const dwci = computeKaplanMeierCI(c.data);
          const m = computeKMPercentile(dwci, 0.5);
          if (m.time === null || !isFinite(m.time)) return null;
          return {
            x: m.time,
            y: 0,
            xref: "x" as const,
            yref: "y" as const,
            text: m.time.toFixed(0),
            showarrow: false,
            yanchor: "bottom" as const,
            yshift: 4,
            font: { color: c.color, ...schrift(12) },
            bgcolor: colors.paperBg,
            borderpad: 2,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null)
    : [];

  // Bottom-left stack: median follow-up at the very bottom, log-rank p above it.
  // Keeping both on the left keeps the right half of the plot uncluttered for
  // long-tailed curves.
  const hasFollowUp =
    showMedianFollowUp && medianFollowUpMonths !== null && isFinite(medianFollowUpMonths);

  const followUpAnnotation = hasFollowUp
    ? [
        {
          xref: "paper" as const,
          yref: "paper" as const,
          x: 0.02,
          y: 0.04,
          xanchor: "left" as const,
          yanchor: "bottom" as const,
          text: `${t("plot.medianFollowUp")}: ${medianFollowUpMonths!.toFixed(1)} ${medianFollowUpUnitLabel ?? xAxisLabel ?? t("plot.months")}`,
          showarrow: false,
          font: { color: colors.text, ...schrift(12) },
        },
      ]
    : [];

  const pValueAnnotation =
    showPValueAnnotation && pValue !== null && isFinite(pValue)
      ? [
          {
            xref: "paper" as const,
            yref: "paper" as const,
            x: 0.02,
            y: hasFollowUp ? 0.11 : 0.04,
            xanchor: "left" as const,
            yanchor: "bottom" as const,
            text: `Log-rank: p = ${pValue > 0.001 ? pValue.toFixed(3) : "<0.001"}`,
            showarrow: false,
            font: { color: colors.text, ...schrift(12) },
          },
        ]
      : [];

  // Patients at Risk by Time plot (only if stratificationLabel is 'Overallsurvival (OAS)')
  let patientsAtRiskPlot = null;
  if (survivalMode === "overall" && isOverallSurvival && coloredCurves.length > 0) {
    // Use the first (and only) curve for overall survival
    const curve = coloredCurves[0];
    const times = curve.data.map(d => d.time);
    
    // Y-Labels immer am '-' kürzen
    const getLabel = (label: string) => {
      if (typeof label === 'string' && label.includes("-")) {
        return label.split("-")[0].trim();
      }
      return label;
    };
    // Strata-Labels für alle Gruppierungen anpassen
    let strataLabels: string[];
    if (coloredCurves.length > 0) {
      strataLabels = coloredCurves.map(curve => getLabel(curve.name));
    } else {
      strataLabels = [t("plot.atRisk"), t("plot.events"), t("plot.censored")];
    }
    // Only show At Risk, Ereignisse, Zensiert
    const strata = strataLabels.map((label, idx) => {
      if (idx === 0) {
        return { label, values: curve.data.map(d => d.atRisk + (d.events || 0)) };
      } else if (idx === 1) {
        return { label, values: curve.data.map(d => d.events || 0) };
      } else if (idx === 2) {
        return { label, values: curve.data.map((d, i, arr) => {
          if (i === 0) return 0;
          const prevAtRisk = arr[i - 1].atRisk + (arr[i - 1].events || 0);
          return prevAtRisk - (d.atRisk + (d.events || 0)) - (d.events || 0);
        }) };
      } else {
        // Für Tumortyp: Dummywerte, falls benötigt
        return { label, values: [] };
      }
    });
    const textTraces = strata.map((stratum, idx) => ({
      x: times,
      y: Array(times.length).fill(
        typeof stratum.label === 'string' && stratum.label.includes('-')
          ? stratum.label.split('-')[0].trim()
          : stratum.label
      ),
      text: stratum.values.map(v => v.toString()),
      mode: "text",
      type: "scatter",
      textposition: "middle center",
      textfont: { size: 14 },
      showlegend: false,
      hoverinfo: "skip",
    }));
    patientsAtRiskPlot = (
      <div className="mt-8">
        <h3 className="text-center text-base font-semibold mb-2">{t("plot.patientsAtRiskTitle")}</h3>
        <Plot
          data={textTraces}
          layout={{
            height: 120 + 30 * strata.length,
            xaxis: {
              title: { text: t("plot.patientsAtRiskTitle") },
              tickvals: times,
              ticktext: times.map(t => t.toString()),
              side: "bottom",
              zeroline: false,
            },
              yaxis: {
                title: { text: t("plot.strata") },
                tickvals: strata.map(s => s.label),
                ticktext: strata.map(s => typeof s.label === 'string' && s.label.includes('-') ? s.label.split('-')[0].trim() : s.label),
                type: "category",
                autorange: "reversed",
                showgrid: false,
                zeroline: false,
                // Mehr Platz für die Labels
                side: 'left',
                automargin: true
              },
            margin: { t: 30, l: 300, r: 30, b: 60 }
          }}
          config={{ responsive: true, displayModeBar: false }}
          useResizeHandler
          revision={revision}
          style={{ width: "100%", height: 120 + 30 * strata.length }}
        />
      </div>
    );
  }

  // ResizeObserver: reagiert auf Containergrößenänderungen (z.B. Sidebar einklappen)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!chartRef.current) return;

    const element = chartRef.current;
    const observer = new ResizeObserver(() => {
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
      }
      resizeDebounceRef.current = window.setTimeout(() => {
        // Triggert react-plotly.js useResizeHandler
        window.dispatchEvent(new Event('resize'));
      }, 180);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
      }
    };
  }, []);

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-white p-4" : "relative w-full"}>
      {/* Export controls live at the results-page card level (PNG / SVG / JSON)
          and as the full PDF report; the plot no longer carries its own
          duplicate PNG/PDF buttons. */}
      {/* Plotly Chart */}
      <div ref={chartRef} style={{ width: "100%", maxWidth: "100%", height: isFullscreen ? window.innerHeight - 200 : height, overflowX: "hidden" }}>
        <Plot
          data={[
            ...traces,
            // Disabled groups: show as greyed-out legend entries so the user
            // can click them to re-enable without leaving the chart.
            ...hiddenCurves.map(hc => ({
              // One dummy point on purpose: Plotly drops the legend entry of a
              // scatter trace that carries no data at all, so an empty x/y made
              // these placeholders invisible: the user could hide a curve from
              // the legend but had no greyed entry left to click to bring it
              // back. `visible: 'legendonly'` keeps the point from being drawn.
              x: [0],
              y: [1],
              mode: 'lines' as const,
              type: 'scatter' as const,
              name: hc.name,
              legendgroup: hc.name,
              showlegend: true,
              visible: 'legendonly' as const,
              line: { color: hc.color, width: 2, dash: 'dash' as const },
            })),
          ]}
          layout={{
            title: survivalMode === "overall" ? t("plot.overallTitle") : undefined,
            height: isFullscreen ? window.innerHeight - 200 : height,
            showlegend: true,
            paper_bgcolor: colors.paperBg,
            plot_bgcolor: colors.plotBg,
            font: { color: colors.text, ...schrift(13) },
            xaxis: {
              title: {
                text: xAxisLabel ?? t("plot.months"),
                standoff: 10,
                font: { color: achse, ...schrift(14) },
              },
              zeroline: false,
              showgrid: true,
              tickvals: xTicks,
              ticktext: xTicks.map((t: number) => t.toString()),
              range: xAxisPlotRange(xTicks, maxTick),
              gridcolor: colors.grid,
              color: achse,
              tickfont: { color: achse, ...schrift(13) },
            },
            yaxis: {
              title: {
                text: endpoint === "ttft"
                  ? t("plot.ttftProbability")
                  : istKumulativeInzidenz
                    ? t("plot.cumulativeIncidence")
                    : t("plot.survivalProbability"),
                standoff: 10,
                font: { color: achse, ...schrift(14) },
              },
              range: [0, 100],
              zeroline: false,
              showgrid: true,
              tickvals: [10,20,30,40,50,60,70,80,90,100],
              ticktext: [10,20,30,40,50,60,70,80,90,100].map(v => v + "%"),
              gridcolor: colors.grid,
              color: achse,
              tickfont: { color: achse, ...schrift(13) },
            },
            legend: {
              orientation: "h",
              x: 0.5,
              y: 1.08,
              xanchor: "center",
              yanchor: "bottom",
              bgcolor: "rgba(0,0,0,0)",
              font: { color: colors.text, ...schrift(13) },
            },
            // l must stay in sync with patients-at-risk-plot.tsx so both plots
            // start their x-axis at the same pixel and the at-risk columns line
            // up under the curve's ticks. 80 was too narrow for the at-risk
            // plot, whose y-axis is labelled with group names rather than
            // numbers ("HER2-enriched" was clipped).
            margin: { t: 70, l: 130, r: 30, b: 60 },
            hovermode: "closest",
            hoverlabel: { bgcolor: colors.hoverBg, font: { color: colors.hoverText } },
            shapes: medianRefShape,
            annotations: [...medianAnnotations, ...pValueAnnotation, ...followUpAnnotation],
          }}
          config={{ responsive: true, displayModeBar: false }}
          onLegendClick={onCurveToggle ? ((e: any) => {
            const lg = e?.data?.[e?.curveNumber]?.legendgroup;
            if (lg != null) { onCurveToggle(String(lg)); return false; }
            return true;
          }) : undefined}
          onLegendDoubleClick={onCurveToggle ? (() => false) : undefined}
          onInitialized={() => { onRendered && onRendered(); }}
          onAfterPlot={() => { onRendered && onRendered(); }}
          useResizeHandler
          revision={revision}
          style={{ width: "100%", maxWidth: "100%", height: isFullscreen ? window.innerHeight - 200 : height }}
        />
      </div>

      {/* Patients at Risk by Time Plot */}
      {patientsAtRiskPlot}

      {/* Fullscreen overlay backdrop */}
      {isFullscreen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />}
    </div>
  );
};

// Function to calculate overall survival
function calculateOverallSurvival(data: { icd10: string; time: number; event: boolean; }[]) {
  // Group data by ICD-10 overcodes
  const groupedData = data.reduce((acc: Record<string, { time: number; event: boolean; }[]>, point) => {
    const overcode = point.icd10.substring(0, 3); // Assuming ICD-10 overcode is the first 3 characters
    if (!acc[overcode]) {
      acc[overcode] = [];
    }
    acc[overcode].push(point);
    return acc;
  }, {});

  // Calculate survival curves for each group
  return Object.entries(groupedData).map(([overcode, points]) => {
    // Sort points by time
    points.sort((a, b) => a.time - b.time);

    // Calculate survival probability
    let atRisk = points.length;
    let events = 0;
    const survivalData = points.map(point => {
      events += point.event ? 1 : 0;
      const probability = (atRisk - events) / atRisk;
      atRisk--;
      return {
        time: point.time,
        probability,
        atRisk,
        events,
      };
    });

    return {
      name: overcode,
      color: '', // Color will be assigned later
      data: survivalData,
    };
  });
}

export default KaplanMeierPlotly; 