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
  Input,
} from "@/components/ui";
import { ChevronDown, X, Search } from "lucide-react";
import icd10CodesData from "@/data/icd10-codes.json";
import { type Patient } from "./obds-parser-new";
import { useTranslations } from "next-intl";

interface ICD10CodeMultiSelectProps {
  selectedCodes: string[];
  patients: Patient[];
  onSelectionChange: (selectedCodes: string[]) => void;
  placeholder?: string;
}

/**
 * Extract ICD-10 code from tumor type string
 */
function extractICD10Code(tumorType: string): string | null {
  const match = tumorType.match(/^([A-Z]\d{2}(?:\.\d+)?)\b/);
  return match ? match[1] : null;
}

/**
 * Get base ICD-10 code (e.g., "C50.1" -> "C50")
 */
function getBaseICD10Code(code: string): string {
  const match = code.match(/^([A-Z]\d{2})/);
  return match ? match[1] : code;
}

/**
 * Get display name for ICD-10 code (e.g., "C50" -> "C50 Mammakarzinom")
 */
function getICD10DisplayName(icd10Code: string): string {
  const icd10Names: Record<string, string> = {
    'C00': 'Lippenkrebs',
    'C01': 'Zungengrundkarzinom',
    'C02': 'Zungenkrebs',
    'C03': 'Zahnfleischkrebs',
    'C04': 'Mundbodenkrebs',
    'C05': 'Gaumenkrebs',
    'C06': 'Mundkrebs',
    'C07': 'Parotiskarzinom',
    'C08': 'Speicheldrüsenkrebs',
    'C09': 'Tonsillenkarzinom',
    'C10': 'Oropharynxkarzinom',
    'C11': 'Nasopharynxkarzinom',
    'C12': 'Sinus piriformis',
    'C13': 'Hypopharynxkarzinom',
    'C14': 'Rachenkrebs',
    'C15': 'Ösophaguskarzinom',
    'C16': 'Magenkarzinom',
    'C17': 'Dünndarmkrebs',
    'C18': 'Kolonkarzinom',
    'C19': 'Rektosigmoid',
    'C20': 'Rektumkarzinom',
    'C21': 'Analkarzinom',
    'C22': 'Leberzellkarzinom',
    'C23': 'Gallenblasenkarzinom',
    'C24': 'Gallenwegskarzinom',
    'C25': 'Pankreaskarzinom',
    'C26': 'Verdauungstrakt',
    'C30': 'Nasenhöhlenkrebs',
    'C31': 'Nasennebenhöhlenkrebs',
    'C32': 'Larynxkarzinom',
    'C33': 'Trachea',
    'C34': 'Bronchialkarzinom',
    'C37': 'Thymus',
    'C38': 'Herz/Mediastinum',
    'C39': 'Respirationstrakt',
    'C40': 'Knochensarkom',
    'C41': 'Knochensarkom',
    'C43': 'Melanom',
    'C44': 'Hautkrebs',
    'C45': 'Mesotheliom',
    'C46': 'Kaposi-Sarkom',
    'C47': 'Weichteilsarkom',
    'C48': 'Retroperitoneum',
    'C49': 'Weichteilsarkom',
    'C50': 'Mammakarzinom',
    'C51': 'Vulvakarzinom',
    'C52': 'Vaginalkarzinom',
    'C53': 'Zervixkarzinom',
    'C54': 'Corpuskarzinom',
    'C55': 'Uteruskarzinom',
    'C56': 'Ovarialkarzinom',
    'C57': 'Genitale (weibl.)',
    'C58': 'Plazenta',
    'C60': 'Peniskarzinom',
    'C61': 'Prostatakarzinom',
    'C62': 'Hodenkarzinom',
    'C63': 'Genitale (männl.)',
    'C64': 'Nierenzellkarzinom',
    'C65': 'Nierenbecken',
    'C66': 'Ureter',
    'C67': 'Harnblasenkarzinom',
    'C68': 'Harnorgane',
    'C69': 'Augenkrebs',
    'C70': 'Hirnhäute',
    'C71': 'Hirntumor',
    'C72': 'Rückenmark',
    'C73': 'Schilddrüsenkarzinom',
    'C74': 'Nebenniere',
    'C75': 'Endokrine Drüsen',
    'C76': 'Unklare Lokalisation',
    'C77': 'Lymphknoten',
    'C78': 'Metastasen',
    'C79': 'Metastasen',
    'C80': 'Unbekannter Primärtumor',
    'C81': 'Hodgkin-Lymphom',
    'C82': 'Follikuläres Lymphom',
    'C83': 'Non-Hodgkin-Lymphom',
    'C84': 'T-Zell-Lymphom',
    'C85': 'Non-Hodgkin-Lymphom',
    'C88': 'Immunoproliferativ',
    'C90': 'Plasmozytom',
    'C91': 'Lymphatische Leukämie',
    'C92': 'Myeloische Leukämie',
    'C93': 'Monozytenleukämie',
    'C94': 'Leukämie',
    'C95': 'Leukämie',
    'C96': 'Lymphatisches Gewebe',
    'D00': 'Carcinoma in situ',
    'D01': 'Carcinoma in situ',
    'D02': 'Carcinoma in situ',
    'D03': 'Melanoma in situ',
    'D04': 'Carcinoma in situ',
    'D05': 'DCIS',
    'D06': 'CIN',
    'D07': 'Carcinoma in situ',
    'D09': 'Carcinoma in situ',
    'D10': 'Gutartiger Tumor',
    'D45': 'Polycythaemia vera',
    'D46': 'MDS',
    'D47': 'Myeloproliferativ',
    'D48': 'Unklarer Tumor',
    'D76': 'Histiozytose',
    'N87': 'Dysplasie Cervix',
    'N90': 'Dysplasie Vulva',
  };

  const name = icd10Names[icd10Code];
  return name ? `${icd10Code} ${name}` : icd10Code;
}

/**
 * Check if a patient has this ICD-10 code
 */
function patientHasICD10Code(patient: Patient, icd10Code: string): boolean {
  const patientICD10 = extractICD10Code(patient.tumorType || "");
  if (!patientICD10) return false;
  
  const patientBaseCode = getBaseICD10Code(patientICD10);
  return patientBaseCode === icd10Code;
}

export const ICD10CodeMultiSelect: React.FC<ICD10CodeMultiSelectProps> = ({
  selectedCodes,
  patients,
  onSelectionChange,
  placeholder = ""
}) => {
  const t = useTranslations("ICD10Select");
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // All available ICD-10 codes from JSON
  const allICD10Codes: string[] = icd10CodesData.codes;

  // Calculate which codes have data (patients)
  const codesWithData = useMemo(() => {
    return allICD10Codes.map(code => {
      const hasData = patients.some(patient => patientHasICD10Code(patient, code));
      const patientCount = patients.filter(patient => patientHasICD10Code(patient, code)).length;
      return {
        code,
        hasData,
        patientCount
      };
    }).filter(item => item.hasData);
  }, [patients, allICD10Codes]);

  // Filter codes by search query
  const filteredCodes = useMemo(() => {
    if (!searchQuery.trim()) return codesWithData;
    const query = searchQuery.toLowerCase();
    return codesWithData.filter(item => {
      const displayName = getICD10DisplayName(item.code).toLowerCase();
      return displayName.includes(query);
    });
  }, [codesWithData, searchQuery]);

  // Group codes by first character (C, D, N)
  const groupedCodes = useMemo(() => {
    const groups: Record<string, typeof codesWithData> = {};
    filteredCodes.forEach(item => {
      const firstChar = item.code[0];
      if (!groups[firstChar]) {
        groups[firstChar] = [];
      }
      groups[firstChar].push(item);
    });
    return groups;
  }, [filteredCodes]);

  const handleToggle = (code: string) => {
    const newSelection = selectedCodes.includes(code)
      ? selectedCodes.filter(c => c !== code)
      : [...selectedCodes, code];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allCodes = codesWithData.map(item => item.code);
    onSelectionChange(allCodes);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedCodes.length;
  const totalCount = codesWithData.length;

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
            aria-expanded={isOpen}
          >
            <span className="truncate">
              {selectedCount === 0
                ? placeholder || t("placeholder")
                : selectedCount === 1
                ? getICD10DisplayName(selectedCodes[0])
                : t("selectedCount", { count: selectedCount })}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex flex-col max-h-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="text-sm font-semibold">
                {t("title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("selectedCount", { count: selectedCount })} / {totalCount}
              </div>
            </div>

            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs"
              >
                {t("selectAll")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-8 text-xs"
                disabled={selectedCount === 0}
              >
                {t("clearAll")}
              </Button>
            </div>

            {/* Code List */}
            <div className="overflow-y-auto flex-1">
              {Object.keys(groupedCodes).sort().map((groupKey) => (
                <div key={groupKey}>
                  <div className="sticky top-0 bg-muted/50 px-3 py-1.5 text-xs font-semibold border-b">
                    {groupKey === 'C' ? 'Maligne Neubildungen (C)' : 
                     groupKey === 'D' ? 'In-situ & benigne Neubildungen (D)' :
                     'Sonstige (N)'}
                  </div>
                  {groupedCodes[groupKey].map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b"
                      onClick={() => handleToggle(item.code)}
                    >
                      <Checkbox
                        checked={selectedCodes.includes(item.code)}
                        onCheckedChange={() => handleToggle(item.code)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm">{getICD10DisplayName(item.code)}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.patientCount} {item.patientCount === 1 ? 'Patient' : 'Patienten'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {filteredCodes.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {t("empty")}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected codes badges */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCodes.slice(0, 10).map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className="text-xs"
            >
              {getICD10DisplayName(code)}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(code);
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedCount > 10 && (
            <Badge variant="outline" className="text-xs">
              {t("moreCount", { count: selectedCount - 10 })}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
