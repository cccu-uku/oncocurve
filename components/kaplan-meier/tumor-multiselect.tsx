"use client";

import React, { useState } from "react";
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
import { tumorHierarchy, getAllTypesInHierarchy, getAllTypesInCategory, getHierarchyDisplayName, getCategoryDisplayName } from "./tumor-categories";
import { useTranslations } from "next-intl";

interface TumorMultiSelectProps {
  selectedTypes: string[];
  availableTypes: string[];
  onSelectionChange: (selectedTypes: string[]) => void;
  placeholder?: string;
}

export const TumorMultiSelect: React.FC<TumorMultiSelectProps> = ({
  selectedTypes,
  availableTypes,
  onSelectionChange,
  placeholder = ""
}) => {
  const t = useTranslations("TumorSelect");
  const [isOpen, setIsOpen] = useState(false);
  
  // Helper function to check if a hierarchy is fully selected
  const isHierarchyFullySelected = (hierarchyId: string): boolean => {
    const hierarchyTypes = getAllTypesInHierarchy(hierarchyId);
    const availableHierarchyTypes = hierarchyTypes.filter(type => 
      availableTypes.some(available => 
        available.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(available.toLowerCase())
      )
    );
    return availableHierarchyTypes.every(type => 
      selectedTypes.some(selected => 
        selected.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(selected.toLowerCase())
      )
    );
  };

  // Helper function to check if a category is fully selected
  const isCategoryFullySelected = (hierarchyId: string, categoryId: string): boolean => {
    const categoryTypes = getAllTypesInCategory(hierarchyId, categoryId);
    const availableCategoryTypes = categoryTypes.filter(type => 
      availableTypes.some(available => 
        available.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(available.toLowerCase())
      )
    );
    return availableCategoryTypes.every(type => 
      selectedTypes.some(selected => 
        selected.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(selected.toLowerCase())
      )
    );
  };

  // Helper function to check if a specific type is selected
  const isTypeSelected = (type: string): boolean => {
    return selectedTypes.some(selected => 
      selected.toLowerCase().includes(type.toLowerCase()) ||
      type.toLowerCase().includes(selected.toLowerCase())
    );
  };

  // Handle hierarchy selection
  const handleHierarchyToggle = (hierarchyId: string) => {
    const hierarchyTypes = getAllTypesInHierarchy(hierarchyId);
    const availableHierarchyTypes = hierarchyTypes.filter(type => 
      availableTypes.some(available => 
        available.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(available.toLowerCase())
      )
    );

    if (isHierarchyFullySelected(hierarchyId)) {
      // Deselect all types in this hierarchy
      const newSelection = selectedTypes.filter(selected => 
        !availableHierarchyTypes.some(type => 
          selected.toLowerCase().includes(type.toLowerCase()) ||
          type.toLowerCase().includes(selected.toLowerCase())
        )
      );
      onSelectionChange(newSelection);
    } else {
      // Select all available types in this hierarchy
      const matchingTypes = availableTypes.filter(available => 
        availableHierarchyTypes.some(type => 
          available.toLowerCase().includes(type.toLowerCase()) ||
          type.toLowerCase().includes(available.toLowerCase())
        )
      );
      const newSelection = [...new Set([...selectedTypes, ...matchingTypes])];
      onSelectionChange(newSelection);
    }
  };

  // Handle category selection
  const handleCategoryToggle = (hierarchyId: string, categoryId: string) => {
    const categoryTypes = getAllTypesInCategory(hierarchyId, categoryId);
    const availableCategoryTypes = categoryTypes.filter(type => 
      availableTypes.some(available => 
        available.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(available.toLowerCase())
      )
    );

    if (isCategoryFullySelected(hierarchyId, categoryId)) {
      // Deselect all types in this category
      const newSelection = selectedTypes.filter(selected => 
        !availableCategoryTypes.some(type => 
          selected.toLowerCase().includes(type.toLowerCase()) ||
          type.toLowerCase().includes(selected.toLowerCase())
        )
      );
      onSelectionChange(newSelection);
    } else {
      // Select all available types in this category
      const matchingTypes = availableTypes.filter(available => 
        availableCategoryTypes.some(type => 
          available.toLowerCase().includes(type.toLowerCase()) ||
          type.toLowerCase().includes(available.toLowerCase())
        )
      );
      const newSelection = [...new Set([...selectedTypes, ...matchingTypes])];
      onSelectionChange(newSelection);
    }
  };

  // Handle individual type selection
  const handleTypeToggle = (type: string) => {
    if (isTypeSelected(type)) {
      const newSelection = selectedTypes.filter(selected => 
        !(selected.toLowerCase().includes(type.toLowerCase()) ||
          type.toLowerCase().includes(selected.toLowerCase()))
      );
      onSelectionChange(newSelection);
    } else {
      const matchingType = availableTypes.find(available => 
        available.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(available.toLowerCase())
      );
      if (matchingType) {
        onSelectionChange([...selectedTypes, matchingType]);
      }
    }
  };

  // Clear all selections
  const clearAllSelections = () => {
    onSelectionChange([]);
  };

  // Get display text for button
  const getDisplayText = (): string => {
    if (selectedTypes.length === 0) return placeholder || t("placeholder");
    if (selectedTypes.length === 1) return selectedTypes[0];
    return t("selectedCount", { count: selectedTypes.length });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">{t("title")}</h4>
            {selectedTypes.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllSelections}
                className="h-8 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                {t("actions.clearAll")}
              </Button>
            )}
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {tumorHierarchy.map((hierarchy) => {
              const hasAvailableTypes = hierarchy.categories.some(category =>
                category.types.some(type =>
                  availableTypes.some(available =>
                    available.toLowerCase().includes(type.toLowerCase()) ||
                    type.toLowerCase().includes(available.toLowerCase())
                  )
                )
              );

              if (!hasAvailableTypes) return null;

              return (
                <div key={hierarchy.id} className="space-y-2">
                  {/* Hierarchy level */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`hierarchy-${hierarchy.id}`}
                      checked={isHierarchyFullySelected(hierarchy.id)}
                      onCheckedChange={() => handleHierarchyToggle(hierarchy.id)}
                    />
                    <label
                      htmlFor={`hierarchy-${hierarchy.id}`}
                      className="font-medium text-sm cursor-pointer"
                    >
                      {getHierarchyDisplayName(hierarchy.id)}
                    </label>
                  </div>

                  {/* Category level */}
                  <div className="ml-6 space-y-2">
                    {hierarchy.categories.map((category) => {
                      const hasAvailableCategoryTypes = category.types.some(type =>
                        availableTypes.some(available =>
                          available.toLowerCase().includes(type.toLowerCase()) ||
                          type.toLowerCase().includes(available.toLowerCase())
                        )
                      );

                      if (!hasAvailableCategoryTypes) return null;

                      return (
                        <div key={category.id} className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${hierarchy.id}-${category.id}`}
                              checked={isCategoryFullySelected(hierarchy.id, category.id)}
                              onCheckedChange={() => handleCategoryToggle(hierarchy.id, category.id)}
                            />
                            <label
                              htmlFor={`category-${hierarchy.id}-${category.id}`}
                              className="text-sm cursor-pointer text-muted-foreground"
                            >
                              {getCategoryDisplayName(hierarchy.id, category.id)}
                            </label>
                          </div>

                          {/* Individual types */}
                          <div className="ml-6 space-y-1">
                            {category.types.map((type) => {
                              const isAvailable = availableTypes.some(available =>
                                available.toLowerCase().includes(type.toLowerCase()) ||
                                type.toLowerCase().includes(available.toLowerCase())
                              );

                              if (!isAvailable) return null;

                              return (
                                <div key={type} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`type-${type}`}
                                    checked={isTypeSelected(type)}
                                    onCheckedChange={() => handleTypeToggle(type)}
                                  />
                                  <label
                                    htmlFor={`type-${type}`}
                                    className="text-xs cursor-pointer"
                                  >
                                    {type}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-2" />
                </div>
              );
            })}
          </div>

          {/* Selected items display */}
          {selectedTypes.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">
                {t("selectedLabel", { count: selectedTypes.length })}
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {selectedTypes.map((type) => (
                  <Badge 
                    key={type} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {type.length > 30 ? `${type.substring(0, 30)}...` : type}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => handleTypeToggle(type)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}; 