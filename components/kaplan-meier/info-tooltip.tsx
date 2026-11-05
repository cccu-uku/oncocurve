"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";

interface InfoTooltipProps {
  /** Ein bis zwei Sätze Erklärung. */
  text: string;
  /** Für Screenreader: was der Knopf öffnet. */
  ariaLabel: string;
}

/**
 * Stiller Info-Knopf neben einer Zahl: öffnet eine kurze Erklärung per
 * Hover und per Tastaturfokus, ein echter <button> statt eines nur mit der
 * Maus erreichbaren title-Attributs.
 */
export function InfoTooltip({ text, ariaLabel }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
