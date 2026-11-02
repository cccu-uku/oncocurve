"use client";

import React, { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  Checkbox,
  Badge,
  Separator,
} from "@/components/ui";
import { ChevronDown, X } from "lucide-react";
import solidTumorCategoriesData from "@/data/solid-tumor-categories.json";
import hematologicalTumorCategoriesData from "@/data/hematological-tumor-categories.json";
import { type Patient } from "./obds-parser-new";
import { useTranslations } from "next-intl";

interface TumorCategory {
  name: string;
  icd10: string[];
}

interface TumorCategoryMultiSelectProps {
  selectedCategories: string[];
  patients: Patient[];
  onSelectionChange: (selectedCategories: string[]) => void;
  placeholder?: string;
}

/**
 * Extract ICD-10 code from tumor type string
 */
function extractICD10Code(tumorType: string): string | null {
  const match = tumorType.match(/^([CDZ]\d{2}(?:\.\d+)?)\b/);
  return match ? match[1] : null;
}

/**
 * Check if an ICD-10 code matches a pattern
 * - If pattern has no dot (e.g., "C50"), match all codes with that prefix (C50, C50.0, C50.1, etc.)
 * - If pattern has a dot (e.g., "C50.1"), match only that exact code
 */
function matchesICD10Pattern(code: string, pattern: string): boolean {
  // Exact match
  if (code === pattern) return true;
  
  // Pattern without dot: match all codes with that prefix
  if (!pattern.includes(".") && code.startsWith(pattern)) {
    // Ensure it's actually a prefix match (e.g., C50 matches C50.1 but not C500)
    if (code.length === pattern.length || code[pattern.length] === ".") {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a patient matches any of the ICD-10 codes for a category
 */
function patientMatchesCategory(patient: Patient, icd10Codes: string[]): boolean {
  const patientICD10 = extractICD10Code(patient.tumorType || "");
  if (!patientICD10) return false;
  
  return icd10Codes.some(pattern => matchesICD10Pattern(patientICD10, pattern));
}

/**
 * Find category by name in both solid and hematological categories
 */
function findCategoryByName(categoryName: string): TumorCategory | undefined {
  const solidCategory = solidTumorCategoriesData.categories.find(cat => cat.name === categoryName);
  if (solidCategory) return solidCategory;
  
  const hematologicalCategory = hematologicalTumorCategoriesData.categories.find(cat => cat.name === categoryName);
  return hematologicalCategory;
}

export const TumorCategoryMultiSelect: React.FC<TumorCategoryMultiSelectProps> = ({
  selectedCategories,
  patients,
  onSelectionChange,
  placeholder = ""
}) => {
  const t = useTranslations("TumorCategorySelect");
  const [isOpen, setIsOpen] = useState(false);

  // Load all tumor categories from JSON
  const allSolidCategories: TumorCategory[] = solidTumorCategoriesData.categories;
  const allHematologicalCategories: TumorCategory[] = hematologicalTumorCategoriesData.categories;

  // Calculate which categories have data (patients) for solid tumors
  const solidCategoriesWithData = useMemo(() => {
    return allSolidCategories.map(category => {
      const hasData = patients.some(patient => patientMatchesCategory(patient, category.icd10));
      const patientCount = patients.filter(patient => patientMatchesCategory(patient, category.icd10)).length;
      return {
        ...category,
        hasData,
        patientCount
      };
    });
  }, [patients, allSolidCategories]);

  // Calculate which categories have data (patients) for hematological tumors
  const hematologicalCategoriesWithData = useMemo(() => {
    return allHematologicalCategories.map(category => {
      const hasData = patients.some(patient => patientMatchesCategory(patient, category.icd10));
      const patientCount = patients.filter(patient => patientMatchesCategory(patient, category.icd10)).length;
      return {
        ...category,
        hasData,
        patientCount
      };
    });
  }, [patients, allHematologicalCategories]);

  // Helper function to check if all solid tumors with data are selected
  const areAllSolidSelected = (): boolean => {
    const categoriesWithDataNames = solidCategoriesWithData
      .filter(cat => cat.hasData)
      .map(cat => cat.name);
    if (categoriesWithDataNames.length === 0) return false;
    return categoriesWithDataNames.every(name => selectedCategories.includes(name));
  };

  // Helper function to check if all hematological tumors with data are selected
  const areAllHematologicalSelected = (): boolean => {
    const categoriesWithDataNames = hematologicalCategoriesWithData
      .filter(cat => cat.hasData)
      .map(cat => cat.name);
    if (categoriesWithDataNames.length === 0) return false;
    return categoriesWithDataNames.every(name => selectedCategories.includes(name));
  };

  // Helper function to check if a specific category is selected
  const isCategorySelected = (categoryName: string): boolean => {
    return selectedCategories.includes(categoryName);
  };

  // Handle main category toggle (Solid Tumors)
  const handleSolidCategoryToggle = () => {
    const allSelected = areAllSolidSelected();
    const categoriesWithDataNames = solidCategoriesWithData
      .filter(cat => cat.hasData)
      .map(cat => cat.name);

    if (allSelected) {
      // Deselect all solid categories
      const newSelection = selectedCategories.filter(name => 
        !categoriesWithDataNames.includes(name)
      );
      onSelectionChange(newSelection);
    } else {
      // Select all solid categories with data
      const newSelection = [...new Set([...selectedCategories, ...categoriesWithDataNames])];
      onSelectionChange(newSelection);
    }
  };

  // Handle main category toggle (Hematological Tumors)
  const handleHematologicalCategoryToggle = () => {
    const allSelected = areAllHematologicalSelected();
    const categoriesWithDataNames = hematologicalCategoriesWithData
      .filter(cat => cat.hasData)
      .map(cat => cat.name);

    if (allSelected) {
      // Deselect all hematological categories
      const newSelection = selectedCategories.filter(name => 
        !categoriesWithDataNames.includes(name)
      );
      onSelectionChange(newSelection);
    } else {
      // Select all hematological categories with data
      const newSelection = [...new Set([...selectedCategories, ...categoriesWithDataNames])];
      onSelectionChange(newSelection);
    }
  };

  // Handle individual category toggle
  const handleCategoryToggle = (categoryName: string, hasData: boolean) => {
    if (!hasData) return; // Ignore clicks on disabled categories
    
    if (isCategorySelected(categoryName)) {
      // Remove category
      const newSelection = selectedCategories.filter(c => c !== categoryName);
      onSelectionChange(newSelection);
    } else {
      // Add category
      const newSelection = [...selectedCategories, categoryName];
      onSelectionChange(newSelection);
    }
  };

  // Remove specific category
  const removeCategory = (categoryName: string) => {
    const newSelection = selectedCategories.filter(c => c !== categoryName);
    onSelectionChange(newSelection);
  };

  // Clear all selections
  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedCategories.length;
  const totalSolidWithData = solidCategoriesWithData.filter(cat => cat.hasData).length;
  const totalHematologicalWithData = hematologicalCategoriesWithData.filter(cat => cat.hasData).length;
  const totalWithData = totalSolidWithData + totalHematologicalWithData;

  return (
    <div className="w-full">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-left font-normal"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="truncate">
              {selectedCount === 0 
                ? placeholder || t("placeholder")
                : t("selectedCount", { selected: selectedCount, total: totalWithData })
              }
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {/* Header with clear all button */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{t("title")}</h4>
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-auto p-1 text-xs"
                >
                  {t("actions.clearAll")}
                </Button>
              )}
            </div>

            {/* Solid Tumors Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={areAllSolidSelected()}
                  onCheckedChange={handleSolidCategoryToggle}
                  id="solid-tumors"
                />
                <label 
                  htmlFor="solid-tumors"
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  {t("sections.solid", { count: totalSolidWithData })}
                </label>
              </div>
              
              <div className="ml-6 space-y-1">
                {solidCategoriesWithData.map((category) => (
                  <div key={category.name} className="flex items-center gap-2">
                    <Checkbox
                      checked={isCategorySelected(category.name)}
                      onCheckedChange={() => handleCategoryToggle(category.name, category.hasData)}
                      id={`solid-${category.name}`}
                      disabled={!category.hasData}
                      className={!category.hasData ? "opacity-50" : ""}
                    />
                    <label 
                      htmlFor={`solid-${category.name}`}
                      className={`text-sm flex-1 ${
                        category.hasData 
                          ? "cursor-pointer" 
                          : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div>
                        <span>{category.name}</span>
                        {category.hasData && category.patientCount > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({category.patientCount})
                          </span>
                        )}
                      </div>
                      {category.icd10 && category.icd10.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ({category.icd10.join('; ')})
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Hematological Tumors Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={areAllHematologicalSelected()}
                  onCheckedChange={handleHematologicalCategoryToggle}
                  id="hematological-tumors"
                />
                <label 
                  htmlFor="hematological-tumors"
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  {t("sections.hematological", { count: totalHematologicalWithData })}
                </label>
              </div>
              
              <div className="ml-6 space-y-1">
                {hematologicalCategoriesWithData.map((category) => (
                  <div key={category.name} className="flex items-center gap-2">
                    <Checkbox
                      checked={isCategorySelected(category.name)}
                      onCheckedChange={() => handleCategoryToggle(category.name, category.hasData)}
                      id={`hematological-${category.name}`}
                      disabled={!category.hasData}
                      className={!category.hasData ? "opacity-50" : ""}
                    />
                    <label 
                      htmlFor={`hematological-${category.name}`}
                      className={`text-sm flex-1 ${
                        category.hasData 
                          ? "cursor-pointer" 
                          : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div>
                        <span>{category.name}</span>
                        {category.hasData && category.patientCount > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({category.patientCount})
                          </span>
                        )}
                      </div>
                      {category.icd10 && category.icd10.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ({category.icd10.join('; ')})
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Categories Display */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedCategories.slice(0, 6).map((categoryName) => {
            const solidCategory = solidCategoriesWithData.find(cat => cat.name === categoryName);
            const hematologicalCategory = hematologicalCategoriesWithData.find(cat => cat.name === categoryName);
            const category = solidCategory || hematologicalCategory;
            
            return (
              <Badge
                key={categoryName}
                variant="secondary"
                className="text-xs px-2 py-1"
              >
                {categoryName}
                {category && category.patientCount > 0 && (
                  <span className="ml-1">({category.patientCount})</span>
                )}
                <button
                  onClick={() => removeCategory(categoryName)}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {selectedCount > 6 && (
            <Badge variant="secondary" className="text-xs px-2 py-1">
              {t("moreCount", { count: selectedCount - 6 })}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}; 