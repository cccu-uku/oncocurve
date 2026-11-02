"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PlotDisplayConfig, PlotDisplayToggleKey } from "./plot-display-config";
import type { LogRankMethod } from "@/utils/kaplan-meier";
import { PALETTE_IDS, type PaletteId } from "./curve-palettes";

type ToggleKey = PlotDisplayToggleKey;

interface PlotDisplayControlProps {
  config: PlotDisplayConfig;
  onToggle: (key: ToggleKey, value: boolean) => void;
  onLogRankMethodChange: (method: LogRankMethod) => void;
  onPaletteChange: (palette: PaletteId) => void;
}

const LOG_RANK_METHODS: LogRankMethod[] = ["logRank", "wilcoxon", "petoPeto", "taroneWare"];

export function PlotDisplayControl({ config, onToggle, onLogRankMethodChange, onPaletteChange }: PlotDisplayControlProps) {
  const t = useTranslations("PlotDisplay");

  const items: { key: ToggleKey; label: string }[] = [
    { key: "showMedianLines",         label: t("medianLines") },
    { key: "showConfidenceIntervals", label: t("confidenceIntervals") },
    { key: "showLegendCounts",        label: t("legendCounts") },
    { key: "showPValueAnnotation",    label: t("pValue") },
    { key: "showLandmarkTable",       label: t("landmarks") },
    { key: "showMedianFollowUp",      label: t("medianFollowUp") },
    { key: "showPairwiseComparisons", label: t("pairwiseComparisons") },
    { key: "showZeroEventWarning",    label: t("zeroEventWarningToggle") },
    { key: "showXAxisInDays",         label: t("xAxisInDays") },
    { key: "showFiveYearTicks",       label: t("fiveYearTicks") },
    { key: "screenshotMode",          label: t("screenshotMode") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between gap-2">
            <Label htmlFor={`pd-${it.key}`} className="text-sm cursor-pointer">
              {it.label}
            </Label>
            <Switch
              id={`pd-${it.key}`}
              checked={config[it.key]}
              onCheckedChange={(v: boolean) => onToggle(it.key, v)}
            />
          </div>
        ))}
        <div className="pt-2 border-t space-y-1">
          <Label htmlFor="pd-palette" className="text-sm">
            {t("palette")}
          </Label>
          <Select
            value={config.palette}
            onValueChange={(v: string) => onPaletteChange(v as PaletteId)}
          >
            <SelectTrigger id="pd-palette" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PALETTE_IDS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`palettes.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-2 border-t space-y-1">
          <Label htmlFor="pd-logrank-method" className="text-sm">
            {t("logRankMethod")}
          </Label>
          <Select
            value={config.logRankMethod}
            onValueChange={(v: string) => onLogRankMethodChange(v as LogRankMethod)}
          >
            <SelectTrigger id="pd-logrank-method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOG_RANK_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(`logRankMethods.${m}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
