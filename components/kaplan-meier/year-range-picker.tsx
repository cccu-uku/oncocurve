"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  Input,
  Label,
  Slider,
} from "@/components/ui";
import { CalendarDays, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface YearRangePickerProps {
  selectedYearRange: { start: number | null; end: number | null };
  onRangeChange: (range: { start: number | null; end: number | null }) => void;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
}

export const YearRangePicker: React.FC<YearRangePickerProps> = ({
  selectedYearRange,
  onRangeChange,
  minYear = 2000,
  maxYear = new Date().getFullYear(),
  placeholder = ""
}) => {
  const t = useTranslations("YearRangePicker");
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<number>(selectedYearRange.start || minYear);
  const [tempEnd, setTempEnd] = useState<number>(selectedYearRange.end || maxYear);
  // String mirrors of the inputs so the user can edit freely (delete digits,
  // intermediate out-of-range values like "20" while typing "2024") without
  // being clamped on every keystroke. Synced from the numeric temp* whenever
  // a slider, preset, or popover open changes it.
  const [startInput, setStartInput] = useState<string>(String(tempStart));
  const [endInput, setEndInput] = useState<string>(String(tempEnd));
  React.useEffect(() => { setStartInput(String(tempStart)); }, [tempStart]);
  React.useEffect(() => { setEndInput(String(tempEnd)); }, [tempEnd]);

  // Clamp a parsed year into [minYear, maxYear]. Returns null if not a number.
  const clampYear = (raw: string): number | null => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return null;
    return Math.min(Math.max(n, minYear), maxYear);
  };

  // Commit a typed start year: clamp, keep range ordering, sync slider.
  const commitStart = () => {
    const v = clampYear(startInput);
    if (v == null) {
      setStartInput(String(tempStart));
      return;
    }
    const next = v > tempEnd ? tempEnd : v;
    setTempStart(next);
    if (v > tempEnd) setTempEnd(v); // typing past the upper end pushes it up
    setStartInput(String(next));
  };

  const commitEnd = () => {
    const v = clampYear(endInput);
    if (v == null) {
      setEndInput(String(tempEnd));
      return;
    }
    const next = v < tempStart ? tempStart : v;
    setTempEnd(next);
    if (v < tempStart) setTempStart(v);
    setEndInput(String(next));
  };

  // Handle slider change for range selection
  const handleSliderChange = (values: number[]) => {
    setTempStart(values[0]);
    setTempEnd(values[1]);
  };

  // Apply the selected range. If the user typed but did not blur, commit
  // those values first so Apply uses what is in the inputs.
  const applyRange = () => {
    const parsedStart = clampYear(startInput);
    const parsedEnd = clampYear(endInput);
    let s = parsedStart ?? tempStart;
    let e = parsedEnd ?? tempEnd;
    if (s > e) { const tmp = s; s = e; e = tmp; }
    setTempStart(s);
    setTempEnd(e);
    onRangeChange({ start: s, end: e });
    setIsOpen(false);
  };

  // Clear the range
  const clearRange = () => {
    onRangeChange({
      start: null,
      end: null
    });
    setTempStart(minYear);
    setTempEnd(maxYear);
    setIsOpen(false);
  };

  // Reset to show all years
  const resetToAll = () => {
    onRangeChange({
      start: null,
      end: null
    });
    setTempStart(minYear);
    setTempEnd(maxYear);
  };

  // Get display text for button
  const getDisplayText = (): string => {
    if (!selectedYearRange.start && !selectedYearRange.end) {
      return placeholder || t("placeholder");
    }
    
    if (selectedYearRange.start && selectedYearRange.end) {
      if (selectedYearRange.start === selectedYearRange.end) {
        return t("singleYear", { year: selectedYearRange.start });
      }
      return t("range", { start: selectedYearRange.start, end: selectedYearRange.end });
    }
    
    if (selectedYearRange.start) {
      return t("fromYear", { year: selectedYearRange.start });
    }
    
    if (selectedYearRange.end) {
      return t("toYear", { year: selectedYearRange.end });
    }
    
    return placeholder;
  };

  // Quick preset options
  const quickPresets = [
    { label: t("presets.lastYear"), start: maxYear - 1, end: maxYear },
    { label: t("presets.last3Years"), start: maxYear - 2, end: maxYear },
    { label: t("presets.last5Years"), start: maxYear - 4, end: maxYear },
    { label: t("presets.last10Years"), start: maxYear - 9, end: maxYear },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="truncate">{getDisplayText()}</span>
          <CalendarDays className="h-4 w-4 ml-2 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{t("title")}</h4>
            {(selectedYearRange.start || selectedYearRange.end) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearRange}
                className="h-8 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                {t("actions.clear")}
              </Button>
            )}
          </div>

          {/* Quick presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("quickPresets")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickPresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setTempStart(preset.start);
                    setTempEnd(preset.end);
                    onRangeChange({
                      start: preset.start,
                      end: preset.end
                    });
                    setIsOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="text-xs col-span-2"
                onClick={resetToAll}
              >
                {t("allYears")}
              </Button>
            </div>
          </div>

          {/* Range slider */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">{t("rangeLabel")}</Label>
            <div className="px-2">
              <Slider
                value={[tempStart, tempEnd]}
                onValueChange={handleSliderChange}
                min={minYear}
                max={maxYear}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{minYear}</span>
                <span>{maxYear}</span>
              </div>
            </div>
          </div>

          {/* Manual input - direct typing allowed; clamped on blur or Enter */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="start-year" className="text-sm">{t("fromYearLabel")}</Label>
              <Input
                id="start-year"
                type="number"
                inputMode="numeric"
                min={minYear}
                max={maxYear}
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                onBlur={commitStart}
                onKeyDown={(e) => { if (e.key === "Enter") { commitStart(); (e.target as HTMLInputElement).blur(); } }}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-year" className="text-sm">{t("toYearLabel")}</Label>
              <Input
                id="end-year"
                type="number"
                inputMode="numeric"
                min={minYear}
                max={maxYear}
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                onBlur={commitEnd}
                onKeyDown={(e) => { if (e.key === "Enter") { commitEnd(); (e.target as HTMLInputElement).blur(); } }}
                className="text-sm"
              />
            </div>
          </div>

          {/* Current selection display */}
          <div className="text-center p-2 bg-muted rounded-md">
            <div className="text-sm font-medium">
              {tempStart === tempEnd 
                ? t("singleYear", { year: tempStart })
                : t("range", { start: tempStart, end: tempEnd })
              }
            </div>
            <div className="text-xs text-muted-foreground">
              {t("yearCount", { count: tempEnd - tempStart + 1 })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              {t("actions.cancel")}
            </Button>
            <Button 
              size="sm" 
              onClick={applyRange}
              className="flex-1"
            >
              {t("actions.apply")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}; 