"use client";

import React, { useState } from "react";
import {
  Button,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Checkbox,
  Label,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui";
import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  maxDisplayItems?: number;
}

export function MultiSelect({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "",
  searchPlaceholder = "",
  maxDisplayItems = 3,
}: MultiSelectProps) {
  const t = useTranslations("MultiSelect");
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(item => item !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelection);
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedValues.filter(item => item !== value));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectAll = () => {
    onSelectionChange(options.map(option => option.value));
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder || t("placeholder");
    if (selectedValues.length <= maxDisplayItems) {
      return selectedValues.map(value => 
        options.find(option => option.value === value)?.label || value
      ).join(", ");
    }
    return t("selectedCount", { count: selectedValues.length });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder || t("searchPlaceholder")} />
          <CommandEmpty>{t("empty")}</CommandEmpty>
          <CommandGroup>
            <div className="flex gap-2 p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-6 text-xs"
              >
                {t("selectAll")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 text-xs"
              >
                {t("clearAll")}
              </Button>
            </div>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => handleSelect(option.value)}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onChange={() => handleSelect(option.value)}
                />
                <Label className="flex-1 cursor-pointer">{option.label}</Label>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Badge display component for selected items
interface SelectedBadgesProps {
  selectedValues: string[];
  options: MultiSelectOption[];
  onRemove: (value: string) => void;
  maxVisible?: number;
}

export function SelectedBadges({
  selectedValues,
  options,
  onRemove,
  maxVisible = 5,
}: SelectedBadgesProps) {
  const t = useTranslations("MultiSelect");

  if (selectedValues.length === 0) return null;

  const visibleItems = selectedValues.slice(0, maxVisible);
  const remainingCount = selectedValues.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {visibleItems.map((value) => {
        const option = options.find(opt => opt.value === value);
        return (
          <Badge
            key={value}
            variant="secondary"
            className="text-xs flex items-center gap-1"
          >
            {option?.label || value}
            <X
              className="h-3 w-3 cursor-pointer hover:text-red-500"
              onClick={() => onRemove(value)}
            />
          </Badge>
        );
      })}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {t("moreCount", { count: remainingCount })}
        </Badge>
      )}
    </div>
  );
}