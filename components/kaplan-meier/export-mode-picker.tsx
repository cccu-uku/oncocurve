"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import {
  Label,
  RadioGroup,
  RadioGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import type { ExportMode } from "./export-anonymization";

interface ExportModePickerProps {
  value: ExportMode;
  onChange: (mode: ExportMode) => void;
}

/**
 * Three mutually exclusive export modes, shared by the Excel and the PDF
 * popover. Each export keeps its own state — a user may well want to share the
 * PDF pseudonymised while keeping the Excel complete.
 */
export function ExportModePicker({ value, onChange }: ExportModePickerProps) {
  const tr = useTranslations("Results");
  // This component is rendered twice on the same page (Excel and PDF
  // popover), so a fixed id would collide between the two instances. A
  // per-instance unique prefix keeps the heading/RadioGroup association and
  // the radio ids valid across both.
  const uid = React.useId();
  const headingId = `export-mode-heading-${uid}`;

  const options: Array<{ mode: ExportMode; labelKey: string; tipKey: string }> = [
    { mode: "full", labelKey: "export.modeFull", tipKey: "export.tipFull" },
    { mode: "noPatients", labelKey: "export.modeNoPatients", tipKey: "export.tipNoPatients" },
    { mode: "pseudonymized", labelKey: "export.modePseudonymized", tipKey: "export.tipPseudonymized" },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-2">
        <p id={headingId} className="text-sm font-medium">{tr("export.heading")}</p>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as ExportMode)}
          aria-labelledby={headingId}
        >
          {options.map(({ mode, labelKey, tipKey }) => (
            <div key={mode} className="flex items-center gap-2">
              {/* The vendored RadioGroupItem positions its dot with
                  `absolute top-1/2 left-1/2 -translate-1/2` inside an indicator
                  span that has no size, and the vertical half of that translate
                  does not take effect — measured, the dot sat 4px below centre.
                  Instead of fighting the offsets, take the dot out of absolute
                  positioning entirely and let flexbox centre it: the indicator
                  is already `flex items-center justify-center`, so a static svg
                  sizes it to 8x8, and centring the item centres that box. */}
              <RadioGroupItem
                value={mode}
                id={`export-mode-${mode}-${uid}`}
                className="flex items-center justify-center [&_svg]:static [&_svg]:translate-none"
              />
              <Label
                htmlFor={`export-mode-${mode}-${uid}`}
                className="text-sm font-normal leading-snug cursor-pointer"
              >
                {tr(labelKey)}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={tr("export.infoAriaLabel", { option: tr(labelKey) })}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs leading-snug">
                  {tr(tipKey)}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </RadioGroup>
      </div>
    </TooltipProvider>
  );
}
