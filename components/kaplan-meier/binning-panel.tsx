"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import {
  type BinningConfig,
  type NumericColumnMeta,
  computeBins,
  parseNumberWithUnit,
} from "./extra-columns";
import type { Patient } from "./obds-parser-new";

interface BinningPanelProps {
  columnName: string;
  meta: NumericColumnMeta;
  patients: Patient[];
  initialConfig?: BinningConfig;
  onApply: (config: BinningConfig) => void;
}

export function BinningPanel({
  columnName,
  meta,
  patients,
  initialConfig,
  onApply,
}: BinningPanelProps) {
  const t = useTranslations("Binning");

  const [mode, setMode] = useState<"quantiles" | "manual">(
    initialConfig?.mode ?? "quantiles"
  );
  const [quantiles, setQuantiles] = useState<2 | 3 | 4 | 5>(
    initialConfig?.quantiles ?? 4
  );
  const [manualText, setManualText] = useState<string>(
    (initialConfig?.manualCutoffs ?? []).join(", ")
  );

  // Sorted numeric values (in target unit)
  const sortedValues = useMemo(() => {
    const arr: number[] = [];
    for (const p of patients) {
      const raw = p.extras?.[columnName];
      if (!raw) continue;
      const parsed = parseNumberWithUnit(raw);
      if (!parsed) continue;
      const factor =
        meta.conversionFactors?.[parsed.unit ?? ""] ??
        (parsed.unit == null || parsed.unit === "" ? 1 : NaN);
      if (!isFinite(factor)) continue;
      arr.push(parsed.number * factor);
    }
    arr.sort((a, b) => a - b);
    return arr;
  }, [patients, columnName, meta]);

  // Validate manual cutoffs
  const parsedManualCutoffs = useMemo(() => {
    if (mode !== "manual") return null;
    const parts = manualText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;
    const nums: number[] = [];
    for (const part of parts) {
      const n = Number(part.replace(",", "."));
      if (!isFinite(n)) return null;
      nums.push(n);
    }
    // Strictly ascending?
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] <= nums[i - 1]) return null;
    }
    return nums;
  }, [manualText, mode]);

  const previewConfig: BinningConfig | null = useMemo(() => {
    if (mode === "quantiles") return { mode: "quantiles", quantiles };
    if (parsedManualCutoffs) return { mode: "manual", manualCutoffs: parsedManualCutoffs };
    return null;
  }, [mode, quantiles, parsedManualCutoffs]);

  const previewBins = useMemo(() => {
    if (!previewConfig || sortedValues.length === 0) return [];
    return computeBins(meta, sortedValues, previewConfig);
  }, [previewConfig, meta, sortedValues]);

  const previewCounts = useMemo(
    () => previewBins.map((bin) => sortedValues.filter((v) => bin.matches(v)).length),
    [previewBins, sortedValues]
  );

  const canApply = previewConfig !== null && previewBins.length > 0;

  const handleApply = () => {
    if (!previewConfig) return;
    onApply({ ...previewConfig, appliedAt: new Date().toISOString() });
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {t("title", { column: columnName, unit: meta.unit ?? "" })}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("distribution", {
            n: sortedValues.length,
            min: meta.min.toFixed(2),
            max: meta.max.toFixed(2),
            median: meta.median.toFixed(2),
            q25: meta.q25.toFixed(2),
            q75: meta.q75.toFixed(2),
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mode toggle as Button toggles */}
        <div className="flex gap-2">
          <Button
            variant={mode === "quantiles" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("quantiles")}
          >
            {t("modeQuantiles")}
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("manual")}
          >
            {t("modeManual")}
          </Button>
        </div>

        {mode === "quantiles" && (
          <Select
            value={String(quantiles)}
            onValueChange={(v) => setQuantiles(Number(v) as 2 | 3 | 4 | 5)}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">{t("quantilesMedian")}</SelectItem>
              <SelectItem value="3">{t("quantilesTertile")}</SelectItem>
              <SelectItem value="4">{t("quantilesQuartile")}</SelectItem>
              <SelectItem value="5">{t("quantilesQuintile")}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {mode === "manual" && (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={t("manualPlaceholder")}
              className="w-full max-w-xs"
            />
            {meta.unit && (
              <span className="text-sm text-muted-foreground">{meta.unit}</span>
            )}
          </div>
        )}

        {previewBins.length > 0 && (
          <div className="text-xs space-y-1">
            <div className="font-medium">{t("preview")}</div>
            {previewBins.map((bin, i) => {
              const count = previewCounts[i];
              // Symbol statt Zeichen, damit die Bedeutung nicht allein an der
              // Farbe haengt und die Schriftart sie nicht verfaelscht.
              const StatusIcon = count === 0 ? X : count < 10 ? AlertTriangle : Check;
              const colorCls =
                count === 0
                  ? "text-red-600"
                  : count < 10
                  ? "text-amber-600"
                  : "text-green-600";
              return (
                <div key={bin.id} className="flex justify-between gap-4">
                  <span>{bin.label}</span>
                  <span className={`${colorCls} inline-flex items-center gap-1`}>
                    n={count}
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {(() => {
          const emptyCount = previewCounts.filter((c) => c === 0).length;
          if (emptyCount === 0) return null;
          return (
            <div className="rounded-md border border-red-300/60 bg-red-50/60 dark:bg-red-950/30 dark:border-red-800 p-2 text-xs flex items-start gap-2">
              <Info className="h-4 w-4 text-red-600 dark:text-red-300 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-red-700 dark:text-red-200">
                  {t("emptyBinsWarning.title", { empty: emptyCount, total: previewBins.length })}
                </div>
                <div className="text-red-700/90 dark:text-red-200/90">
                  {t("emptyBinsWarning.body")}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={handleApply} disabled={!canApply} size="sm" className="min-w-0 flex-shrink">
            {t("apply")}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-0 flex-shrink">
                <Info className="h-4 w-4 mr-1" /> {t("helpButton")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="text-xs space-y-2 max-w-md">
              <p>{t("help.intro")}</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>{t("help.quartile")}</li>
                <li>{t("help.tertile")}</li>
                <li>{t("help.median")}</li>
                <li>{t("help.manual")}</li>
              </ul>
              <p className="font-medium">{t("help.rule")}</p>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
