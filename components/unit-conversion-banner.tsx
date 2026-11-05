"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info, X } from "lucide-react";
import type { ExtraColumnWarning } from "@/components/kaplan-meier/extra-columns";

interface UnitConversionBannerProps {
  warnings: ExtraColumnWarning[];
}

export function UnitConversionBanner({ warnings }: UnitConversionBannerProps) {
  const t = useTranslations("UnitConversionBanner");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const items = warnings.filter(w => w.kind === "unit_conversion");
  if (items.length === 0) return null;

  const visible = items.filter((_, idx) => !dismissed.has(`${items[idx].column}-${idx}`));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {items.map((w, idx) => {
        const key = `${w.column}-${idx}`;
        if (dismissed.has(key)) return null;
        const d = w.details ?? {};
        const fromUnit = String(d.fromUnit ?? "");
        const toUnit = String(d.toUnit ?? "");
        const nValues = Number(d.nValues ?? 0);
        const factor = Number(d.factor ?? 1);
        return (
          <div
            key={key}
            className="flex items-start gap-3 p-3 rounded-lg border border-blue-300/50 bg-blue-100/70 dark:bg-blue-950/40 dark:border-blue-800"
          >
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-300 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-medium mb-1">{t("title")}</div>
              <p>
                {t("body", { column: w.column, n: nValues, from: fromUnit, to: toUnit, factor })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t("hint")}</p>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(key))}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
