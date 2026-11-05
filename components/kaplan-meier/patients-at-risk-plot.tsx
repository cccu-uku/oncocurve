"use client";

import React, { useEffect, useRef, useState } from "react";
import Plot from "./plotly-plot";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { atRiskTable, xAxisPlotRange } from "@/utils/kaplan-meier";
import { canvasMesser, PLOTLY_SCHRIFT, umbrechen } from "./label-umbruch";
import { plotSchrift } from "./screenshot-modus";

interface Patient {
  time: number;
  event: boolean;
  censored: boolean;
  group?: string;
}

type AtRiskCurve = { name: string; color?: string; data: { time: number; atRisk: number; events?: number }[] };

// Plotly zeichnet seine Beschriftungen als SVG-Text, den CSS
// (font-variant-numeric: tabular-nums, siehe styles/globals.css) nicht
// erreicht: die Ziffern bleiben proportional, obwohl der Container die
// Klasse "tabular-nums" trägt. Für dieses eine Raster aus Zahlen ist die
// Spaltenausrichtung aber der ganze Zweck der Tabelle, deshalb ein
// monospaces Schriftfamilien-Fallback direkt in Plotlys eigener
// Font-Konfiguration: jede Ziffer ist darin gleich breit, unabhängig vom
// OpenType-Feature der Anwendungsschrift.
const TABULAR_DIGITS_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Linker Rand der Tabelle, gleich dem des KM-Plots darüber (siehe
// kaplan-meier-plotly.tsx). Beide Werte müssen übereinstimmen, sonst stehen
// die Spalten nicht mehr unter den Ticks der Kurve. Deshalb wird ein langer
// Gruppenname umgebrochen, statt den Rand zu verbreitern.
const RAND_LINKS = 130;
const LABEL_SCHRIFTGROESSE = 10;
const LABEL_VERSATZ = 8;
// Platz für einen Namen: Rand abzüglich Versatz zur Achse und etwas Luft,
// damit der längste Buchstabe nicht an der Bildkante klebt.
const LABEL_BREITE = RAND_LINKS - LABEL_VERSATZ - 6;
const LABEL_ZEILENHOEHE = 13;
const ZEILENABSTAND_MIN = 30;

interface PatientsAtRiskPlotProps {
  patients?: Patient[];
  xTicks?: number[];
  groupLabels?: string[];
  curves?: { name: string; color?: string; data: { time: number; atRisk: number; event?: boolean; censored?: boolean }[] }[];
  xmlPatients?: Patient[]; // direct XML/testdata input
  // True when the page shows a single unstratified cohort. Passed explicitly
  // because it cannot be inferred from the labels: the worker emits a
  // hardcoded German curve name ("Gesamt"), so comparing it against the
  // translated tr("overallTotal") only ever matched in German and the
  // Observed/Censored rows silently disappeared in English.
  unstratified?: boolean;
  // Zeiteinheit der x-Achse, ergänzt die Überschrift "Patienten unter
  // Risiko" um die Einheit, statt sie zu ersetzen. Boxkohorten rechnen in
  // Tagen, alles andere in Monaten; ohne diese Angabe bliebe unklar, in
  // welcher Einheit die Achse dieser Tabelle steht.
  xAxisLabel?: string;
  // Größere, kräftigere Schrift und dunkle Achsen für Screenshots.
  screenshotModus?: boolean;
}

interface PreparedPatientsAtRiskData {
  filteredPatients: Patient[];
  xTicks: number[];
  groupLabels: string[] | null;
  visibleGroupNames: string[] | null;
  // The real survival curves (worker output) carry the concrete atRisk / events /
  // censored counts; when present the table reads those directly instead of
  // reconstructing patients from the curve points (which double-counted).
  curves: AtRiskCurve[] | null;
  unstratified: boolean;
}

interface PatientsAtRiskPlotContentProps extends PreparedPatientsAtRiskData {
  xAxisLabel?: string;
  screenshotModus?: boolean;
}

function preparePatientsAtRiskData(
  props: PatientsAtRiskPlotProps,
  t: (key: string, values?: Record<string, any>) => string
): { fallback: string | null; data: PreparedPatientsAtRiskData | null } {
  const directPatients = Array.isArray(props.patients) ? props.patients : null;
  const curvePatients = props.curves && props.curves.length > 0
    ? props.curves.flatMap(curve => curve.data.map(d => ({
        time: d.time,
        event: d.event ?? false,
        censored: d.censored ?? false,
        group: curve.name,
      })))
    : null;
  const xmlPatients = Array.isArray(props.xmlPatients) && props.xmlPatients.length > 0 ? props.xmlPatients : null;

  const patientsSource = directPatients && directPatients.length > 0
    ? directPatients
    : curvePatients && curvePatients.length > 0
      ? curvePatients
      : xmlPatients && xmlPatients.length > 0
        ? xmlPatients
        : null;

  if (!patientsSource || patientsSource.length === 0) {
    return { fallback: t("patientsAtRisk.noData"), data: null };
  }

  const visibleGroupNames: string[] | null = props.curves && props.curves.length > 0
    ? props.curves.map(c => c.name)
    : (Array.isArray(props.groupLabels) && props.groupLabels.length > 0 ? props.groupLabels : null);

  const filteredPatients = visibleGroupNames
    ? patientsSource.filter(p => typeof p.group === 'string' ? visibleGroupNames.includes(p.group) : true)
    : [...patientsSource];

  if (filteredPatients.length === 0) {
    return { fallback: t("patientsAtRisk.noDataVisibleGroups"), data: null };
  }

  let xTicks: number[] = Array.isArray(props.xTicks) && props.xTicks.length > 0
    ? [...props.xTicks]
    : [];

  if (xTicks.length === 0) {
    xTicks = Array.from(new Set(filteredPatients.map(p => p.time))).sort((a, b) => a - b);
  }

  if (xTicks.length === 0) {
    return { fallback: t("patientsAtRisk.noTimePoints"), data: null };
  }

  const groupLabels = Array.isArray(props.groupLabels) && props.groupLabels.length > 0 ? props.groupLabels : null;

  return {
    fallback: null,
    data: {
      filteredPatients,
      xTicks,
      groupLabels,
      visibleGroupNames,
      curves: props.curves && props.curves.length > 0 ? props.curves : null,
      unstratified: props.unstratified ?? false,
    },
  };
}

const PatientsAtRiskPlotContent: React.FC<PatientsAtRiskPlotContentProps> = ({ filteredPatients, xTicks, groupLabels, visibleGroupNames, curves, unstratified, xAxisLabel, screenshotModus = false }) => {
  const tr = useTranslations("Results");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const [revision, setRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;
    const element = containerRef.current;
    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setRevision(r => r + 1);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  }, [resolvedTheme]);

  const ensuredXTicks = xTicks;
  const useCurves = Array.isArray(curves) && curves.length > 0;
  // Per-curve at-risk/events/censored read directly from the worker output
  // (concrete counts), collapsing the duplicated staircase rows. Keyed by the
  // curve name so the stratified rows below can look each group up.
  const curveTables = useCurves
    ? curves!.map(c => ({ name: c.name, table: atRiskTable(c.data, ensuredXTicks) }))
    : null;
  // For each xTick, calculate at risk, events, censored
  const atRiskArr: number[] = [];
  const eventsArr: number[] = [];
  const censoredArr: number[] = [];
  if (curveTables) {
    // Overall row = sum of the concrete per-curve counts at each tick.
    for (let i = 0; i < ensuredXTicks.length; i++) {
      atRiskArr.push(curveTables.reduce((s, ct) => s + ct.table[i].atRisk, 0));
      eventsArr.push(curveTables.reduce((s, ct) => s + ct.table[i].events, 0));
      censoredArr.push(curveTables.reduce((s, ct) => s + ct.table[i].censored, 0));
    }
  } else {
    let nAtRisk = filteredPatients.length;
    let patientsLeft = [...filteredPatients];
    for (let i = 0; i < ensuredXTicks.length; i++) {
      const t = ensuredXTicks[i];
      // Events at t
      const nEvents = patientsLeft.filter(p => p.time === t && p.event).length;
      // Censored at t
      const nCensored = patientsLeft.filter(p => p.time === t && p.censored).length;
      atRiskArr.push(nAtRisk);
      eventsArr.push(nEvents);
      censoredArr.push(nCensored);
      // Remove patients with time == t
      patientsLeft = patientsLeft.filter(p => p.time > t);
      nAtRisk = patientsLeft.length;
    }
  }
  let yLabels: string[];
  let z: (number | null)[][];
  // Shorten "CODE - description" labels (e.g. ICD-10) to just the code. Only
  // triggers on a spaced " - " separator, so names that merely contain a hyphen
  // (the PAM50 subtypes "Basal-like", "HER2-enriched", ...) stay intact and
  // match the plot legend.
  const getShortLabel = (label: string) => {
    if (typeof label === 'string' && label.includes(' - ')) {
      return label.split(' - ')[0].trim();
    }
    return label;
  };
  // If stratification is active, show only At Risk per group; for a single
  // unstratified cohort also show the Observed / Censored rows.
  // `unstratified` comes from the page (criterion === "none"). It must NOT be
  // re-derived by comparing labels against tr("overallTotal") /
  // tr("overallSurvivalLabel"): the worker emits the hardcoded German name
  // "Gesamt", so that comparison matched only in German and the two extra rows
  // silently vanished in English.
  const effectiveGroupLabels = visibleGroupNames ?? groupLabels;
  const noStrat =
    unstratified ||
    !Array.isArray(effectiveGroupLabels) ||
    effectiveGroupLabels.length === 0;
  if (noStrat) {
    yLabels = [tr("patientsAtRisk.atRisk"), tr("patientsAtRisk.observed"), tr("patientsAtRisk.censored")];
    z = [atRiskArr, eventsArr, censoredArr];
  } else {
    // For each group, calculate at risk at each xTick
    // Natural alphanumeric sort for labels (e.g., G1 < G2 < G10)
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
    yLabels = (effectiveGroupLabels as string[])
      .map(label => label === tr("overallSurvivalLabel") ? tr("overallSurvivalLabel") : getShortLabel(label))
      .sort((a, b) => collator.compare(a, b));
    z = yLabels.map(group => {
      // Achtung: group ist jetzt der gekürzte Label!
      // Wir müssen die Patienten nach dem Original-Label filtern
      // Also: Finde das Original-Label, das zu diesem gekürzten Label passt
      const origLabel = (effectiveGroupLabels as string[]).find(l => getShortLabel(l) === group) || group;
      const groupKey = origLabel === tr("overallSurvivalLabel") ? tr("overallSurvivalLabel") : origLabel;
      // Concrete per-group at-risk straight from the curve's atRisk field.
      if (curveTables) {
        const ct = curveTables.find(c => c.name === groupKey);
        return ct ? ct.table.map(col => col.atRisk) : ensuredXTicks.map(() => 0);
      }
      // Fallback (real patients passed directly): count per group.
      const groupPatients = filteredPatients.filter(p => p.group === groupKey);
      let nAtRisk = groupPatients.length;
      let groupPatientsLeft = [...groupPatients];
      return ensuredXTicks.map(t => {
        const val = nAtRisk;
        // Remove patients with time == t
        groupPatientsLeft = groupPatientsLeft.filter(p => p.time > t);
        nAtRisk = groupPatientsLeft.length;
        return val;
      });
    });
    // Filter out groups where all at-risk values are 0 (empty groups not shown in KM plot)
    const validIndices = yLabels
      .map((_, i) => (z[i].some(v => v !== null && (v as number) > 0) ? i : -1))
      .filter(i => i >= 0);
    yLabels = validIndices.map(i => yLabels[i]);
    z = validIndices.map(i => z[i]);
  }

  // Right edge of the x-axis: the last of the shared xTicks, so it matches
  // the Kaplan-Meier plot exactly (both derive it from the same tick set) —
  // rounding it independently here used to drift out of sync whenever the
  // KM plot's tick step wasn't a multiple of 12.
  const maxTick = ensuredXTicks[ensuredXTicks.length - 1] ?? 0;

  // Text plot: One trace per row, text at intersections
  const traces = yLabels.map((group, i) => ({
    x: ensuredXTicks,
    y: Array(ensuredXTicks.length).fill(group),
    text: z[i].map(v => (v !== null ? v.toString() : "")),
    mode: "text",
    type: "scatter",
    textfont: { ...plotSchrift(12, screenshotModus), family: TABULAR_DIGITS_FONT },
    // Let the numbers at the first/last tick (x = 0 / x = maxTick, which sit on
    // the plot edges) spill into the margin instead of being clipped in half.
    cliponaxis: false,
    showlegend: false,
    hoverinfo: "skip",
  }));

  const isDark = resolvedTheme === 'dark';
  const colors = {
    paperBg: isDark ? '#0b0f14' : '#fff',
    plotBg: isDark ? '#0b0f14' : '#fff',
    axis: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
  } as const;
  const achse = screenshotModus ? (isDark ? '#e5e7eb' : '#111827') : colors.axis;
  const labelSchrift = plotSchrift(LABEL_SCHRIFTGROESSE, screenshotModus);
  // Plotly zwängt den Achsentitel in den unteren Rand. Mit großer Schrift
  // reichen 40 Pixel nicht, und der Titel läge auf den Achsenzahlen.
  const randUnten = screenshotModus ? 84 : 40;

  // Colour the strata labels to match the curve colours in the plot legend.
  // Plotly's y-axis tickfont colour is uniform, so render the labels as per-row
  // annotations (each with its own colour) and hide the default tick labels.
  const colorByShort = new Map<string, string>();
  if (useCurves) {
    for (const c of curves!) {
      if (c.color) colorByShort.set(getShortLabel(c.name), c.color);
    }
  }
  const colorLabels = !noStrat && colorByShort.size > 0;

  // Lange Gruppennamen umbrechen. Plotly bricht nicht selbst um: ein Name, der
  // breiter war als der linke Rand, lief aus der Grafik und wurde abgeschnitten,
  // "Breast Invasive Mixed Mucinous Carcinoma" verlor so knapp hundert Pixel.
  const messe = canvasMesser(`${labelSchrift.weight} ${labelSchrift.size}px ${PLOTLY_SCHRIFT}`);
  const labelZeilen = new Map(yLabels.map(g => [g, umbrechen(getShortLabel(g), LABEL_BREITE, messe)]));
  const labelText = (g: string) => (labelZeilen.get(g) ?? [g]).join("<br>");
  const meisteZeilen = Math.max(1, ...[...labelZeilen.values()].map(z => z.length));
  // Jede Zeile der Tabelle bekommt so viel Höhe, wie ihr längster Name
  // braucht; bei einzeiligen Namen bleibt es beim bisherigen Abstand.
  const zeilenHoehe = Math.round(LABEL_ZEILENHOEHE * labelSchrift.size / LABEL_SCHRIFTGROESSE);
  const zeilenAbstand = Math.max(ZEILENABSTAND_MIN, meisteZeilen * zeilenHoehe + 8);
  const yAnnotations = colorLabels
    ? yLabels.map(g => ({
        xref: "paper" as const, x: 0, xanchor: "right" as const,
        yref: "y" as const, y: g, yanchor: "middle" as const,
        text: labelText(g), showarrow: false, align: "right" as const,
        font: { ...labelSchrift, color: colorByShort.get(g) ?? achse },
        xshift: -LABEL_VERSATZ,
      }))
    : [];

  return (
    <div ref={containerRef} className="w-full overflow-x-hidden no-scrollbar tabular-nums">
      <Plot
        data={traces}
        layout={{
          height: 120 + (randUnten - 40) + zeilenAbstand * (yLabels.length + 2),
          // Match the Kaplan-Meier plot's horizontal geometry (l/r margin + the
          // x-range below) so the at-risk columns line up under the curve's
          // x-ticks. Keep l in sync with kaplan-meier-plotly.tsx (l: 130).
          // 130 rather than 80 because this plot labels its y-axis with group
          // names, not numbers, and longer ones were clipped.
          margin: { t: 10, l: RAND_LINKS, r: 30, b: randUnten },
          paper_bgcolor: colors.paperBg,
          plot_bgcolor: colors.plotBg,
          font: { color: achse, ...plotSchrift(12, screenshotModus) },
          xaxis: {
            title: {
              text: xAxisLabel ? `${tr("patientsAtRisk.title")} (${xAxisLabel})` : tr("patientsAtRisk.title"),
              standoff: screenshotModus ? 30 : 20,
            },
            side: "bottom",
            showticklabels: true,
            showgrid: false,
            zeroline: false,
            fixedrange: true,
            showline: true,
            tickvals: ensuredXTicks,
            ticktext: ensuredXTicks.map(t => t.toString()),
            range: xAxisPlotRange(ensuredXTicks, maxTick),
            color: achse,
            tickfont: { color: achse, family: TABULAR_DIGITS_FONT, ...plotSchrift(12, screenshotModus) },
          },
          yaxis: {
            type: "category",
            showline: true,
            tickvals: yLabels,
            ticktext: yLabels.map(labelText),
            showticklabels: !colorLabels,
            showgrid: false,
            zeroline: true,
            fixedrange: true,
            autorange: "reversed",
            color: achse,
            tickfont: { color: achse, ...labelSchrift },
          },
          annotations: yAnnotations,
          hovermode: false,
        }}
        config={{ 
          displayModeBar: false, 
          staticPlot: true
        }}
        useResizeHandler
        revision={revision}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

const PatientsAtRiskPlot: React.FC<PatientsAtRiskPlotProps> = (props) => {
  const tr = useTranslations("Results");
  const { fallback, data } = preparePatientsAtRiskData(props, tr);

  if (fallback) {
    return <div className="w-full text-center text-gray-500 py-4">{fallback}</div>;
  }

  return <PatientsAtRiskPlotContent {...data!} xAxisLabel={props.xAxisLabel} screenshotModus={props.screenshotModus} />;
};

// Function to calculate overall patients-at-risk data
function calculateOverallPatientsAtRisk(data: { icd10: string; time: number; }[]) {
  // Group data by ICD-10 overcodes
  const groupedData = data.reduce((acc: Record<string, { time: number; }[]>, point) => {
    const overcode = point.icd10.substring(0, 3); // Assuming ICD-10 overcode is the first 3 characters
    if (!acc[overcode]) {
      acc[overcode] = [];
    }
    acc[overcode].push(point);
    return acc;
  }, {});

  // Calculate patients-at-risk data for each group
  return Object.entries(groupedData).map(([overcode, points]) => {
    // Sort points by time
    points.sort((a, b) => a.time - b.time);

    // Calculate at-risk numbers
    let atRisk = points.length;
    const atRiskData = points.map(point => {
      const currentAtRisk = atRisk;
      atRisk--;
      return {
        time: point.time,
        atRisk: currentAtRisk,
      };
    });

    return {
      name: overcode,
      data: atRiskData,
    };
  });
}

export default PatientsAtRiskPlot;