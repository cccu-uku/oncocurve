"use client";

import { CoxPatient, CoxSummary, TiesMethod, runCoxRegression } from "@/utils/cox-regression";
import { kompakteZahl } from "./kompakte-zahl";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { Info } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Patient } from "./obds-parser-new";
import { useTranslations } from "next-intl";
import { T_UNKNOWN } from "./tnm-normalize";
import type { Bin, ExtraColumnsState } from "./extra-columns";
import { buildCoxForestSvg, svgToPngDataUrl } from "./cox-forest-svg";
import { coxFaelle } from "./auswertbare-faelle";
import { patientGruppe } from "./patient-gruppe";
import type { StratificationCriterion } from "./stratification-control";
import type { ZeitEinheit } from "./endpunkte/anwenden";

interface CoxAnalysisProps {
  patients: Patient[];
  groups: { id: string; name: string; color: string }[];
  groupCriterion: StratificationCriterion;
  showOnlyPlot?: boolean;
  showOnlyTable?: boolean;
  onRendered?: () => void; // Callback wenn Plot+Tabelle gerendert wurden
  onResult?: (summary: CoxSummary | null) => void; // Callback mit aktueller Cox-Zusammenfassung (für Excel-Export)
  extraColumns?: ExtraColumnsState; // für extra:<col>-Stratifizierungen
  // Die fertigen Klassen der numerischen Zusatzspalten, nicht ihre
  // Konfiguration. Selbst gebildet kämen sie auf andere Quantilsgrenzen als
  // die Kurve, weil sie über eine andere Fallmenge liefen.
  extraBins?: Map<string, Bin[]>;
  // Einheit der Überlebenszeit der Kohorte. Entscheidet, ob eine Zeit null
  // eine fehlende Angabe ist (Monate) oder ein Ereignis am Diagnosetag (Tage).
  zeitEinheit: ZeitEinheit;
  // Größere Schrift braucht breitere Spalten und höhere Zeilen im Forest-Plot.
  screenshotModus?: boolean;
}

export const CoxAnalysis: React.FC<CoxAnalysisProps> = ({ patients, groups, groupCriterion, showOnlyPlot, showOnlyTable, onRendered, onResult, extraColumns, extraBins, zeitEinheit, screenshotModus = false }) => {
  const t = useTranslations("CoxAnalysis");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(groups.map(g => g.id));
  // Reference group defaults to the first group that is not "Keine Angabe" — an
  // undefined-T bucket is never a meaningful Cox baseline.
  const firstEligibleRef = (ids: string[]) => ids.find(id => id !== T_UNKNOWN) ?? ids[0] ?? "";
  const [referenceGroup, setReferenceGroup] = useState<string>(firstEligibleRef(groups.map(g => g.id)));
  const [tiesMethod, setTiesMethod] = useState<TiesMethod>('efron');

  // Wenn sich Gruppen oder Kriterium ändern: per Default alle aktivieren.
  // Wichtig: nur State setzen, wenn sich die Gruppen-IDs tatsächlich unterscheiden — sonst kommt es
  // zu einer Endlosschleife, weil der Parent bei jedem Render eine neue groups-Array-Referenz übergibt.
  useEffect(() => {
    const all = groups.map(g => g.id);
    setSelectedGroups(prev => {
      if (prev.length === all.length && prev.every((v, i) => v === all[i])) return prev;
      return all;
    });
    // Keep the user's chosen reference while it is still a valid, non-"Keine Angabe"
    // group; only fall back to a default when it is gone (e.g. criterion changed).
    // (The previous code forced the first id on every groups update, which made it
    // impossible to keep a manually selected reference group.)
    setReferenceGroup(prev => (prev && prev !== T_UNKNOWN && all.includes(prev) ? prev : firstEligibleRef(all)));
  }, [groups, groupCriterion]);

  // Filter Patienten nach ausgewählten Gruppen. null-Gruppen (außerhalb der
  // analysierten Teilmenge, z. B. cT unter pathologischem Kriterium) fallen raus.
  const getPatientGroupId = (p: Patient): string | null =>
    patientGruppe(p, groupCriterion, { extraColumns, extraBins });

  const filteredPatients = useMemo(() =>
    patients.filter(p => {
      const groupId = getPatientGroupId(p);
      return groupId != null && selectedGroups.includes(groupId);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getPatientGroupId
    // entsteht bei jedem Render neu; die Zuordnung hängt allein an criterion,
    // extraColumns und extraBins.
    [patients, selectedGroups, groupCriterion, extraColumns, extraBins]
  );

  // Cox-Patientenstruktur erzeugen.
  //
  // Über coxFaelle, damit die Regression auf derselben Menge steht wie die
  // Kurve. Vorher lief jeder Fall mit, auch ohne brauchbare Überlebenszeit:
  // der Schätzer im Worker wirft solche Fälle weg, die Regression nahm sie
  // mit. In einer Kohorte mit 24 solchen Zeilen meldete die Legende 944
  // Patienten und die Cox-Tabelle 968, und das Hazard Ratio verschob sich von
  // 2,31 auf 2,34.
  const coxPatients: CoxPatient[] = useMemo(
    () => coxFaelle(filteredPatients, (p) => getPatientGroupId(p), zeitEinheit),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getPatientGroupId
    // ist eine reine Zuordnung, die bei jedem Render neu entsteht; sie mit
    // aufzunehmen liesse die Regression bei jedem Render neu rechnen.
    [filteredPatients, groupCriterion, zeitEinheit]
  );

  // Cox-Analyse durchführen
  //
  // PERF: was a useMemo running in the render pipeline. For ~2000 patients
  // with Newton-Raphson iterations this took 100-500 ms synchronously,
  // which froze the page on every stratification change. Now it runs in a
  // deferred useEffect so the page renders immediately with the previous
  // coxResult while the new fit is computed off-frame.
  const [coxResult, setCoxResult] = useState<CoxSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    const handle = requestAnimationFrame(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const result = runCoxRegression(coxPatients, { reference: referenceGroup, ties: tiesMethod });
        if (cancelled) return;
        setCoxResult(result);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(handle);
    };
  }, [coxPatients, referenceGroup, tiesMethod]);

  // Render-Callback nach Datenänderung (signalisiert dem übergeordneten Layout, dass wir fertig sind)
  useEffect(() => {
    if (coxResult && coxResult.results.length > 0) {
      // kurze Verzögerung, damit der DOM gezeichnet ist
      const id = setTimeout(() => { onRendered && onRendered(); }, 0);
      return () => clearTimeout(id);
    }
  }, [coxResult, onRendered]);

  // Ergebnis nach oben propagieren (für Excel-Export)
  useEffect(() => {
    if (onResult) onResult(coxResult ?? null);
  }, [coxResult, onResult]);

  // Forest-Plot-Daten
  const forestData = coxResult?.results.map(r => ({
    ...r,
    color: groups.find(g => g.id === r.group)?.color || "#888"
  })) || [];

  // Farbpalette für die DOM-Forest-Darstellung (SVG-Builder hat seine eigene Kopie)
  const BLUE_SCALE = ['#08306B', '#08519C', '#2171B5', '#4292C6', '#6BAED6', '#9ECAE1'];
  const PINK = '#e6007a';

  // Export‑Funktionen ohne plotly.js
  const plotRef = useRef<HTMLDivElement>(null);
  const buildSvg = () => {
    const dark = document.documentElement.classList.contains('dark');
    const ms = coxResult?.modelStats;
    const refName = groups.find(g => g.id === referenceGroup)?.name || referenceGroup;
    const stats = ms ? [
      { label: t("stats.reference"), value: refName },
      { label: t("stats.ties"), value: ms.tiesMethod },
      { label: t("stats.concordance"), value: ms.concordance.toFixed(3) },
      { label: t("stats.likelihoodRatio"), value: ms.likelihoodRatioTest.pValue < 0.001 ? "<0.001" : ms.likelihoodRatioTest.pValue.toFixed(4) },
    ] : undefined;
    const table = coxResult ? {
      headers: [t("table.group"), t("table.n"), t("table.events"), t("table.hazardRatio"), t("table.pValue")],
      rows: coxResult.results.map(r => [
        groups.find(g => g.id === r.group)?.name || r.group,
        r.n,
        r.events,
        r.notEstimable ? t("notEstimable") : r.hazardRatio.toFixed(2),
        r.notEstimable ? t("notEstimable") : (r.pValue < 0.001 ? "<0.001" : r.pValue.toFixed(3)),
      ] as (string | number)[]),
    } : undefined;
    return buildCoxForestSvg(coxResult?.results ?? [], groups, {
      title: t("forestPlotTitle"),
      dark,
      stats,
      table,
      notEstimableLabel: t("notEstimable"),
      notEstimableShort: t("notEstimableShort"),
    });
  };
  const exportPNG = async () => {
    const { svg, width, height } = buildSvg();
    const pngUrl = await svgToPngDataUrl(svg, width, height, 1);
    const a = document.createElement('a'); a.href = pngUrl; a.download = `cox-forest-plot-${new Date().toISOString().split('T')[0]}.png`; a.click();
  };
  const exportSVG = () => {
    const { svg } = buildSvg();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cox-forest-plot-${new Date().toISOString().split('T')[0]}.svg`; a.click();
    URL.revokeObjectURL(url);
  };

  // Gruppen-Auswahl
  const handleGroupToggle = (id: string) => {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };


  // Forest-Plot-Komponente (vereinfacht)
  const ForestPlot: React.FC = () => {
  const cleanLabel = (label: string) => label.replace(/^T-Kategorie\s*:?\s*/i, '').trim();
  const plotWidth = 760;

  // Die drei Spalten der Zeile: Gruppenname, Plotfläche, Zahlen. Name und
  // Zahlen bekommen feste Breiten, weil die Plotfläche eine exakte
  // Pixelbreite braucht, auf die sich die Skala bezieht.
  //
  // Vorher zog die Plotfläche alles ausser 210 Pixeln an sich, während die
  // beiden äusseren Spalten zusammen schon 180 Pixel Mindestbreite und die
  // Karte selbst 32 Pixel Innenabstand verlangten. Das Raster war damit von
  // vornherein zwei Pixel zu breit, und die Zahlenspalte schob ihren Inhalt
  // über den Kartenrand hinaus.
  // Im Screenshot-Modus ist die Schrift grösser: breitere Spalten, damit
  // Namen und Zahlen hineinpassen, und höhere Zeilen, damit die drei
  // Zahlenzeilen nicht in die nächste Gruppe laufen.
  const NAMENSSPALTE = screenshotModus ? 220 : 140;
  const WERTESPALTE = screenshotModus ? 196 : 148; // Zahlen plus 16 Innenabstand links
  const ZAHLENBREITE = WERTESPALTE - 16;
  const ZEILENHOEHE = screenshotModus ? 78 : 46;
  const SKALA_OBEN = screenshotModus ? -28 : -18;
  const KARTENPOLSTER = 32; // p-4 links und rechts
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; x: number; y: number }>({ visible: false, text: '', x: 0, y: 0 });
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const [dynamicPlotWidth, setDynamicPlotWidth] = useState(plotWidth);
  useEffect(() => {
    if (!plotContainerRef.current) return;
    const handleResize = () => {
      const rest = plotContainerRef.current!.offsetWidth - NAMENSSPALTE - WERTESPALTE - KARTENPOLSTER;
      setDynamicPlotWidth(Math.max(160, rest));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [NAMENSSPALTE, WERTESPALTE]);
  // Skala bezieht sich jetzt auf die gesamte Plotfläche (0 bis dynamicPlotWidth)
  const xScale = (hr: number) => {
    const minHR = 0.5, maxHR = 4;
    const minX = Math.log(minHR), maxX = Math.log(maxHR);
    return ((Math.log(hr) - minX) / (maxX - minX)) * dynamicPlotWidth;
  };
  const showTooltip = (e: React.MouseEvent<HTMLDivElement>, text: string) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return setTooltip({ visible: true, text, x: 0, y: 0 });
    setTooltip({ visible: true, text, x: e.clientX - rect.left + 8, y: e.clientY - rect.top + 8 });
  };
  const moveTooltip = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(t => ({ ...t, x: e.clientX - rect.left + 8, y: e.clientY - rect.top + 8 }));
  };
  const hideTooltip = () => setTooltip({ visible: false, text: '', x: 0, y: 0 });
  return (
    <div className="w-full flex flex-col items-center my-6">
      <div ref={plotContainerRef} className="relative border rounded-md p-4 dark:bg-background bg-white" style={{ maxWidth: '100%', margin: '0 auto' }}>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-2">{t("forestPlotTitle")}</div>
        <div className={`${screenshotModus ? "mt-8" : "mt-4"} w-full grid`} style={{ gridTemplateColumns: `${NAMENSSPALTE}px ${dynamicPlotWidth}px ${WERTESPALTE}px` }}>
          {forestData.map((row, i) => {
            const baseBlue = BLUE_SCALE[i % BLUE_SCALE.length];
            const name = groups.find(g => g.id === row.group)?.name || row.group;

            // Zero-event group: the HR is not estimable (complete separation), so
            // no marker is drawn - its position would be a meaningless artefact of
            // where the optimiser stopped. The row itself stays, with the label
            // text taking the place of the marker, so the group is not silently
            // missing from the plot.
            if (row.notEstimable) {
              return (
                <React.Fragment key={row.group}>
                  <div className="flex items-center justify-end pr-6 text-base text-right leading-tight break-words" style={{ color: baseBlue, minHeight: ZEILENHOEHE }} title={cleanLabel(name)}>{cleanLabel(name)}</div>
                  <div className="relative flex items-center" style={{ height: ZEILENHOEHE, width: dynamicPlotWidth }}>
                    {/* Referenzlinie exakt bei HR=1 (log(HR)=0) */}
                    <div className="absolute top-0" style={{ left: `${xScale(1)}px`, width: 2, height: '100%', background: '#d1d5db', zIndex: 0 }} />
                    <div
                      className="absolute top-1/2 text-sm text-gray-500 dark:text-gray-400"
                      style={{ left: 0, transform: 'translateY(-50%)', whiteSpace: 'nowrap', zIndex: 1 }}
                      title={t("notEstimableHint")}
                    >
                      {t("notEstimable")}
                    </div>
                    {i === 0 && (
                      <>
                        {[0.5, 1, 2, 4].map((tick) => (
                          <div key={tick} className="absolute text-gray-500" style={{ left: `${xScale(tick) - 16}px`, top: SKALA_OBEN, width: 32, textAlign: 'center', fontSize: 'calc(12px * var(--schrift-faktor, 1))', pointerEvents: 'none' }}>{tick}</div>
                        ))}
                      </>
                    )}
                  </div>
                  {/* Compact side column is sized for short numbers like "1.00" - the
                      long "nicht schaetzbar" phrase overruns it and collides with the
                      neighbouring label, so this slot gets the short placeholder with
                      the full explanation as a hover title instead. */}
                  <div className="flex flex-col justify-center text-xs text-gray-700 dark:text-gray-300 pl-4" style={{ minHeight: ZEILENHOEHE, width: ZAHLENBREITE, gap: 2 }}>
                    <div className="flex justify-between w-full">
                      <span>{t("labels.hr")}</span>
                      <span title={t("notEstimableHint")}>{t("notEstimableShort")}</span>
                    </div>
                    <div className="flex justify-between w-full">
                      <span>{t("labels.ciLower")}</span>
                      <span title={t("notEstimableHint")}>{t("notEstimableShort")}</span>
                    </div>
                    <div className="flex justify-between w-full">
                      <span>{t("labels.ciUpper")}</span>
                      <span title={t("notEstimableHint")}>{t("notEstimableShort")}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            // ALLE x-Positionen OHNE leftMargin!
            const x = xScale(row.hazardRatio);
            const xL = xScale(Math.max(row.ciLower, 1e-12));
            const xU = xScale(Math.max(row.ciUpper, 1e-12));
            const clamp = (v: number) => Math.max(4, Math.min(dynamicPlotWidth - 4, v));
            const xC = clamp(x);
            const xLC = clamp(Math.min(xL, xU));
            const xUC = clamp(Math.max(xL, xU));
            const significant = (row.ciLower > 1 || row.ciUpper < 1) && row.pValue < 0.05;
            const displayColor = significant ? PINK : baseBlue;
            const ciColor = significant ? PINK : '#4292C6';
            return (
              <React.Fragment key={row.group}>
                <div className="flex items-center justify-end pr-6 text-base text-right leading-tight break-words" style={{ color: displayColor, minHeight: ZEILENHOEHE }} title={cleanLabel(name)}>{cleanLabel(name)}</div>
                <div className="relative flex items-center" style={{ height: ZEILENHOEHE, width: dynamicPlotWidth }}>
                  {/* Referenzlinie exakt bei HR=1 (log(HR)=0) */}
                  <div className="absolute top-0" style={{ left: `${xScale(1)}px`, width: 2, height: '100%', background: '#d1d5db', zIndex: 0 }} />
                  {/* CI bar (exakt auf Skala, keine zusätzliche Verschiebung) */}
                  <div
                    className="absolute top-1/2"
                    role="img"
                    aria-label={t("aria.ci", { lower: row.ciLower.toFixed(2), upper: row.ciUpper.toFixed(2), hr: row.hazardRatio.toFixed(2), pValue: row.pValue.toFixed(3) })}
                    style={{ background: ciColor, width: `${Math.max(2, xUC - xLC)}px`, left: `${xLC}px`, height: '2px', transform: 'translateY(-50%)', zIndex: 1 }}
                    onMouseEnter={(e) => showTooltip(e as any, t("tooltip.hr", { hr: row.hazardRatio.toFixed(2), lower: row.ciLower.toFixed(2), upper: row.ciUpper.toFixed(2), pValue: row.pValue < 0.001 ? '<0.001' : row.pValue.toFixed(3) }))}
                    onMouseMove={(e) => moveTooltip(e as any)}
                    onMouseLeave={hideTooltip}
                  />
                  {/* Whiskers (exakt auf Skala) */}
                  <div
                    className="absolute top-1/2"
                    role="img"
                    aria-label={t("aria.ciLower", { lower: row.ciLower.toFixed(2) })}
                    style={{ background: ciColor, width: 6, height: 6, left: `${xLC - 3}px`, transform: 'translateY(-50%) rotate(45deg)', zIndex: 2 }}
                    onMouseEnter={(e) => showTooltip(e as any, t("tooltip.ciLower", { lower: row.ciLower.toFixed(2) }))}
                    onMouseMove={(e) => moveTooltip(e as any)}
                    onMouseLeave={hideTooltip}
                  />
                  <div
                    className="absolute top-1/2"
                    role="img"
                    aria-label={t("aria.ciUpper", { upper: row.ciUpper.toFixed(2) })}
                    style={{ background: ciColor, width: 6, height: 6, left: `${xUC - 3}px`, transform: 'translateY(-50%) rotate(45deg)', zIndex: 2 }}
                    onMouseEnter={(e) => showTooltip(e as any, t("tooltip.ciUpper", { upper: row.ciUpper.toFixed(2) }))}
                    onMouseMove={(e) => moveTooltip(e as any)}
                    onMouseLeave={hideTooltip}
                  />
                  {/* Point estimate (exakt auf Skala, mittig platzieren) */}
                  <div
                    className="absolute top-1/2 rounded-sm"
                    role="img"
                    aria-label={t("aria.hr", { hr: row.hazardRatio.toFixed(2) })}
                    style={{ width: 8, height: 8, background: displayColor, left: `${xC - 4 + (row.group === referenceGroup ? 1 : 0)}px`, transform: 'translateY(-50%)', zIndex: 3 }}
                    onMouseEnter={(e) => showTooltip(e as any, t("tooltip.hr", { hr: row.hazardRatio.toFixed(2), lower: row.ciLower.toFixed(2), upper: row.ciUpper.toFixed(2), pValue: row.pValue < 0.001 ? '<0.001' : row.pValue.toFixed(3) }))}
                    onMouseMove={(e) => moveTooltip(e as any)}
                    onMouseLeave={hideTooltip}
                  />
                  {/* Skala exakt berechnet */}
                  {i === 0 && (
                    <>
                      {[0.5, 1, 2, 4].map((tick) => (
                        <div key={tick} className="absolute text-gray-500" style={{ left: `${xScale(tick) - 16}px`, top: SKALA_OBEN, width: 32, textAlign: 'center', fontSize: 'calc(12px * var(--schrift-faktor, 1))', pointerEvents: 'none' }}>{tick}</div>
                      ))}
                    </>
                  )}
                </div>
                <div className="flex flex-col justify-center text-xs text-gray-700 dark:text-gray-300 pl-4" style={{ minHeight: ZEILENHOEHE, width: ZAHLENBREITE, gap: 2 }}>
                  {/* Feste Breite, deshalb kompakte Zahlen: ein Wert mit
                      dreizehn Stellen lief hier bisher über den Kartenrand
                      hinaus. */}
                  <div className="flex justify-between w-full gap-2">
                    <span>{t("labels.hr")}</span>
                    <span className="tabular-nums" title={String(row.hazardRatio)}>{kompakteZahl(row.hazardRatio)}</span>
                  </div>
                  <div className="flex justify-between w-full gap-2">
                    <span>{t("labels.ciLower")}</span>
                    <span className="tabular-nums" title={String(row.ciLower)}>{kompakteZahl(row.ciLower)}</span>
                  </div>
                  <div className="flex justify-between w-full gap-2">
                    <span>{t("labels.ciUpper")}</span>
                    <span className="tabular-nums" title={String(row.ciUpper)}>{kompakteZahl(row.ciUpper)}</span>
                  </div>
                </div>

                </React.Fragment>
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-3 text-center">{t("referenceGroup", { name: groups.find(g => g.id === referenceGroup)?.name || referenceGroup })}</div>
          {/* Schoenfeld-Rho Diagnostics */}
          {coxResult?.diagnostics && (
            <div className="mt-3 text-xs text-gray-600 text-center">
              <div>{t("phTestGlobal", { pValue: coxResult.diagnostics.globalPValue.toFixed(3) })}</div>
              <div className="mt-1">
                {/* A Schoenfeld-residual test needs events: for a zero-event group rho
                    and p are as meaningless as its HR, so that group is left out of
                    the per-coefficient PH line entirely (the global PH line above is
                    unaffected). */}
                {coxResult.diagnostics.perCoefficient
                  .filter(p => !coxResult.results.find(r => r.group === p.name)?.notEstimable)
                  .map(p => (
                    <span key={p.name} className="inline-block mr-3" title={t("phTestTooltip", { rho: p.rho.toFixed(3), pValue: p.pValue.toFixed(3) })}>
                      {t("phTestPerCoefficient", { name: p.name, rho: p.rho.toFixed(2), pValue: p.pValue < 0.001 ? '<0.001' : p.pValue.toFixed(3) })}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {/* Tooltip */}
          {tooltip.visible && (
            <div className="dark:bg-gray-800 dark:text-gray-200" style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, pointerEvents: 'none', background: 'white', padding: '6px 8px', borderRadius: 4, boxShadow: '0 1px 6px rgba(0,0,0,0.12)', fontSize: 12, whiteSpace: 'pre-line', zIndex: 40 }}>
              {tooltip.text}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-6" data-cox-analysis>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPNG} title={t("export.pngTitle")}>PNG</Button>
            <Button variant="outline" size="sm" onClick={exportSVG} title={t("export.svgTitle")}>SVG</Button>
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-1 rounded hover:bg-gray-100" title={t("info.title")} aria-label={t("info.title")}>
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="max-w-md text-sm" align="end">
                <div className="font-semibold mb-1">{t("info.title")}</div>
                <p className="mb-2">{t("info.body")}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t("info.items.reference")}</li>
                  <li>{t("info.items.significance")}</li>
                  <li>{t("info.items.phAssumption")}</li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!showOnlyTable && (
          <>
            <div className="mb-4">
              <Label>{t("groupsLabel")}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {groups.map(group => (
                  <Badge
                    key={group.id}
                    variant={selectedGroups.includes(group.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    style={{ backgroundColor: selectedGroups.includes(group.id) ? group.color : "transparent", color: selectedGroups.includes(group.id) ? "white" : group.color, borderColor: group.color }}
                    onClick={() => handleGroupToggle(group.id)}
                  >
                    {group.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-6">
              <div>
                <Label>{t("referenceGroupLabel")}</Label>
                <Select value={referenceGroup} onValueChange={setReferenceGroup}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.filter(g => selectedGroups.includes(g.id) && g.id !== T_UNKNOWN).map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("tiesMethodLabel")}</Label>
                <Select value={tiesMethod} onValueChange={(v) => setTiesMethod(v as TiesMethod)}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efron">{t("tiesEfron")}</SelectItem>
                    <SelectItem value="breslow">{t("tiesBreslow")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
        {coxResult && coxResult.results.length > 1 ? (
          <>
            <ForestPlot />
            <div className="overflow-x-auto mt-8">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{t("resultsTitle")}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    // CSV Export
                    const rows = [
                      [t("table.group"), t("table.n"), t("table.events"), t("table.hazardRatio"), t("table.pValue")],
                      ...coxResult.results.map(r => [
                        (groups.find(g => g.id === r.group)?.name || r.group),
                        String(r.n),
                        String(r.events),
                        r.notEstimable ? t("notEstimable") : r.hazardRatio.toFixed(4),
                        r.notEstimable ? t("notEstimable") : (r.pValue < 0.001 ? '<0.001' : r.pValue.toFixed(4))
                      ])
                    ];
                    const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `cox-results-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
                  }}>CSV</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    // Excel-Export als Minimal-HTML-Table (kompatibel mit Excel)
                    const header = [t("table.group"), t("table.n"), t("table.events"), t("table.hazardRatio"), t("table.pValue")];
                    const rows = coxResult.results.map(r => [
                      (groups.find(g => g.id === r.group)?.name || r.group),
                      r.n,
                      r.events,
                      r.notEstimable ? t("notEstimable") : Number(r.hazardRatio.toFixed(4)),
                      r.notEstimable ? t("notEstimable") : (r.pValue < 0.001 ? '<0.001' : Number(r.pValue.toFixed(4)))
                    ]);
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table border="1">${
                      [header, ...rows].map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
                    }</table></body></html>`;
                    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `cox-results-${new Date().toISOString().split('T')[0]}.xls`; a.click(); URL.revokeObjectURL(url);
                  }}>Excel</Button>
                </div>
              </div>
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.group")}</TableHead>
                      <TableHead>{t("table.n")}</TableHead>
                      <TableHead>{t("table.events")}</TableHead>
                      <TableHead>{t("table.hazardRatio")}</TableHead>
                      <TableHead>{t("table.pValue")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coxResult.results.map(row => (
                      <TableRow key={row.group} className={row.group === referenceGroup ? "bg-blue-50 dark:bg-blue-900/20" : undefined}>
                        <TableCell>{groups.find(g => g.id === row.group)?.name || row.group}</TableCell>
                        <TableCell>{row.n}</TableCell>
                        <TableCell>{row.events}</TableCell>
                        <TableCell>{row.notEstimable ? t("notEstimable") : row.hazardRatio.toFixed(2)}</TableCell>
                        <TableCell>{row.notEstimable ? t("notEstimable") : (row.pValue < 0.001 ? "<0.001" : row.pValue.toFixed(3))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          </>
        ) : (
          <div className="text-sm text-gray-500 mt-4">{t("noData")}</div>
        )}
      </CardContent>
    </Card>
  );
};