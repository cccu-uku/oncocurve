"use client";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import KAPLAN_MEIER_COLORS from "./kaplan-meier-colors";
import { gueltigeZeit } from "./boxkurve";
import type { ZeitEinheit } from "./endpunkte/anwenden";
import { normalizeTOneDigit, normalizeTTwoDigit, T_UNKNOWN } from "./tnm-normalize";
import { getAgeGroup } from "./age-group";
import { BinningPanel } from "./binning-panel";
import {
  BinningConfig,
  ColumnMeta,
  ExtraColumnsState,
  computeBins,
  parseNumberWithUnit,
} from "./extra-columns";
import { Activity, Calendar, Info, TrendingUp, Users, Hash, Tag } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { type Patient } from "./obds-parser-new";
import { findEntityByTumorCategory, getWileyStaging, tnmForStaging, getAllStagesForEntity, type WileyEntity } from "./tnm-wiley-staging";
import { useTranslations } from "next-intl";
import solidTumorCategoriesData from "@/data/solid-tumor-categories.json";
import hematologicalTumorCategoriesData from "@/data/hematological-tumor-categories.json";


export type StratificationCriterion = 
  | "none"
  | "gender" 
  | "ageGroup"
  | "tumorType"
  | "tumorCategory"
  | "staging"
  | "grading"
  | "diagnosisYear"
  | "tCategoryOneDigit"
  | "tCategoryTwoDigit"
  | "tPathologicalOneDigit"
  | "tPathologicalTwoDigit"
  | "tClinicalOneDigit"
  | "tClinicalTwoDigit"
  | "tPathological"
  | "tClinical"
  | "nCategory"
  | "mCategory"
  | "tumorMainCategory"
  | "tumorSubCategory"
  | "spreadCategory"
  | "entityStaging"
  | "cT"
  | "pT"
  | "primaerfall"
  | "lokalisation"
  | "tumorid"
  | "startdatum"
  | "endedatum"
  | `extra:${string}`;

export interface StratificationGroup {
  id: string;
  name: string;
  color: string;
  dash?: import("./curve-palettes").DashPattern;
  enabled: boolean;
}

export interface StratificationConfig {
  criterion: StratificationCriterion;
  groups: StratificationGroup[];
  binning?: BinningConfig;
}

interface StratificationControlProps {
  patients: Patient[];
  config: StratificationConfig;
  onConfigChange: (config: StratificationConfig) => void;
  onBeforeChange?: () => void; // Signalisiert Start einer potentiell teuren Aktualisierung (für Spinner)
  selectedTumorCategories?: string[]; // For entity-specific staging
  selectedICD10Codes?: string[]; // For entity-specific staging with ICD-10 filter
  extraColumns?: ExtraColumnsState;
  /**
   * Einheit der gerade geplotteten Kohorte. Boxkohorten rechnen in Tagen, dort
   * ist eine Zeit von null ein echtes Ereignis am Diagnosetag, kein
   * Rundungsartefakt. Ohne diese Angabe fiele so ein Fall aus der Gruppen-
   * zählung, obwohl die Kurve ihn zeigt.
   */
  zeitEinheit: ZeitEinheit;
}

// Use shared color palette for consistency
const CURVE_COLORS = KAPLAN_MEIER_COLORS;

export function StratificationControl({ patients, config, onConfigChange, onBeforeChange, selectedTumorCategories = [], selectedICD10Codes = [], extraColumns, zeitEinheit }: StratificationControlProps) {
  const t = useTranslations("Stratification");
  const tKm = useTranslations("KaplanMeier");

  // Helper function to ensure diagnosisDate is always a Date object
  const getDiagnosisDate = (patient: Patient): Date => {
    if (typeof patient.diagnosisDate === 'string') {
      return new Date(patient.diagnosisDate);
    }
    if (patient.diagnosisDate && typeof patient.diagnosisDate === 'object' && 'getFullYear' in patient.diagnosisDate) {
      return patient.diagnosisDate as Date;
    }
    return new Date(); // fallback
  };

  // Neue Hilfsfunktionen: ICD10-Extraktion aus tumorType und Überprüfung, ob ein Patient KM-daten hat
  const extractIcd10FromTumorType = (tumorType?: string | null): string => {
    if (!tumorType || typeof tumorType !== 'string' || tumorType.trim() === '') return 'Keine Angabe';
    const parts = tumorType.split('-');
    const code = parts[0].trim();
    return code === '' ? 'Keine Angabe' : code;
  };

  // ICD-10 Code zu lesbarem Namen (z.B. "C50" -> "C50 Mammakarzinom")
  const getICD10DisplayName = (icd10Code: string): string => {
    // Mapping der häufigsten ICD-10 Codes zu deutschen Namen
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
  };

  const patientHasKaplanMeierData = (p: Patient): boolean => {
    // Spiegelt kaplan-meier.worker.ts: gültig, wenn survivalTime eine Zahl ist
    // und gueltigeZeit sie für die Einheit der Kohorte zulässt. In Tagen ist
    // eine Null ein echtes Ereignis am Diagnosetag und zählt mit, sonst würde
    // die hier angezeigte Gruppengrösse kleiner sein als die tatsächlich
    // geplottete Kohorte.
    let survivalTime = (p as any).survivalTime;
    if (typeof survivalTime !== 'number' || isNaN(survivalTime)) {
      const anyP = p as any;
      if (anyP.birthDate && (anyP.deathDate || anyP.followupDate)) {
        const birth = new Date(anyP.birthDate as any);
        const end = new Date((anyP.deathDate || anyP.followupDate) as any);
        if (!isNaN(birth.getTime()) && !isNaN(end.getTime())) {
          survivalTime = (end.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
        }
      }
    }
    return typeof survivalTime === 'number' && !isNaN(survivalTime) && gueltigeZeit(survivalTime, zeitEinheit);
  };

  // Natürliche Sortierung (alphanumerisch, z. B. G1 < G2 < G10)
  const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });
  // Für die Anzeige in Auswahllisten/Badges Präfixe beibehalten; Sortierung alphanumerisch
  const naturalSort = <T extends { name: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => collator.compare(a.name, b.name));
  // T-Kategorie normalisieren (T1a, T1b, T1mic, c1, p2, 1, 2, etc. -> T1, T2, ...; leer -> "Keine Angabe")
  const normalizeTNCategory = (val: string | null | undefined, designator: "N" | "M"): string | null => {
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (trimmed === '') return null;
    const upper = trimmed.toUpperCase();
    const directMatch = upper.match(new RegExp(`${designator}[0-9A-Z]*`));
    if (directMatch && directMatch[0]) return directMatch[0];
    const stripped = upper.replace(/^[CPU]\s*/, '');
    const strippedMatch = stripped.match(new RegExp(`${designator}[0-9A-Z]*`));
    if (strippedMatch && strippedMatch[0]) return strippedMatch[0];
    if (/^[0-9A-Z]+$/.test(stripped)) {
      return `${designator}${stripped}`;
    }
    return null;
  };
  
  const generateGroupsForCriterion = (criterion: StratificationCriterion, binningOverride?: BinningConfig): StratificationGroup[] => {
    const groups: StratificationGroup[] = [];
    let colorIndex = 0;
    const effectiveBinning = binningOverride ?? config.binning;

    switch (criterion) {
      case "cT": {
        const cTSet = new Set(patients.map(p => p.cT).filter((v): v is string => Boolean(v)));
        cTSet.forEach(val => {
          groups.push({
            id: val,
            name: `${val}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }
      case "pT": {
        const pTSet = new Set(patients.map(p => p.pT).filter((v): v is string => Boolean(v)));
        pTSet.forEach(val => {
          groups.push({
            id: val,
            name: `${val}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }
      case "primaerfall": {
        const pfSet = new Set(patients.map(p => p.primaerfall).filter((v): v is string => Boolean(v)));
        pfSet.forEach(val => {
          groups.push({
            id: val,
            name: t("labels.primaryCase", { value: val }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }
      case "lokalisation": {
        const locSet = new Set(patients.map(p => p.lokalisation).filter((v): v is string => Boolean(v)));
        locSet.forEach(val => {
          groups.push({
            id: val,
            name: t("labels.location", { value: val }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }
      case "tumorid": {
        // Erst filtern, dann in eine Zeichenkette wandeln: String(undefined)
        // ergibt "undefined", überlebt jeden Boolean-Filter und bot das
        // Kriterium mit einer einzigen Gruppe "Tumor-ID: undefined" an.
        const tidSet = new Set(patients.filter(p => p.tumorid != null).map(p => String(p.tumorid)).filter(Boolean));
        tidSet.forEach(val => {
          groups.push({
            id: val,
            name: t("labels.tumorId", { value: val }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }
      case "startdatum": {
        const sdSet = new Set(patients.map(p => p.startdatum).filter((v): v is string => Boolean(v)));
        sdSet.forEach(val => {
          groups.push({
            id: val,
            name: t("labels.startDate", { value: val }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }
      case "endedatum": {
        const edSet = new Set(patients.map(p => p.endedatum).filter((v): v is string => Boolean(v)));
        edSet.forEach(val => {
          groups.push({
            id: val,
            name: t("labels.endDate", { value: val }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }
      case "none":
        groups.push({
          id: "all",
          name: t("groups.allPatients"),
          color: CURVE_COLORS[0],
          enabled: true,
        });
        break;

      case "gender":
        const genders = new Set(patients.map(p => p.gender));
        genders.forEach(gender => {
          groups.push({
            id: gender,
            // Dritter Zweig nötig: Darm 2.0 führt D und X, und jede Quelle
            // kann Unbekanntes liefern. Vorher trug jede Gruppe ausser der
            // männlichen die Beschriftung Weiblich, auch die unbekannte.
            name: gender === "male" ? tKm("male") : gender === "female" ? tKm("female") : tKm("genderUnknown"),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;

      case "ageGroup": {
        // Always use fixed order for age groups to ensure color consistency
        const present = { child: false, adult: false, senior: false };
        patients.forEach(patient => {
          const group = getAgeGroup(patient.age);
          if (group !== "unknown") present[group] = true;
        });
        const order = [
          { id: "child", name: tKm("ageGroupChild") },
          { id: "adult", name: tKm("ageGroupAdult") },
          { id: "senior", name: tKm("ageGroupSenior") },
        ];
        order.forEach(({ id, name }) => {
          if (present[id as keyof typeof present]) {
            groups.push({
              id,
              name,
              color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
              enabled: true,
            });
            colorIndex++;
          }
        });
        break;
      }

      case "tumorType": {
        // Verwende nur den ICD10-Code (Teil vor '-') und nur Codes, für die es KM-geeignete Patienten gibt
        const icdCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return; // nur Patienten mit KM-Daten berücksichtigen
          const code = extractIcd10FromTumorType(p.tumorType);
          if (!code) return;
          icdCounts[code] = (icdCounts[code] || 0) + 1;
        });
        const icdList = Object.keys(icdCounts).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));

        // Wenn es viele Codes gibt, standardmäßig nur die Top-N (nach Patientenzahl) aktivieren
        const TOTAL_LIMIT = 10;
        const INITIAL_VISIBLE = 5;
        let initiallyEnabled = new Set<string>(icdList);
        if (icdList.length > TOTAL_LIMIT) {
          const sortedByCount = Object.entries(icdCounts).sort(([, aCount], [, bCount]) => bCount - aCount).map(([code]) => code);
          initiallyEnabled = new Set(sortedByCount.slice(0, INITIAL_VISIBLE));
        }

        icdList.forEach(code => {
          groups.push({
            id: code,
            // Nur den Code als Label anzeigen; die Kennung selbst bleibt
            // "Keine Angabe" (Gruppenidentität für den Bucket-Abgleich),
            // nur die Anzeige wird übersetzt.
            name: code === 'Keine Angabe' ? t("labels.notReported") : code,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: initiallyEnabled.has(code),
          });
          colorIndex++;
        });
        break;
      }

      case "tumorCategory": {
        // Only include tumor categories that have KM-eligible patients
        const counts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return; // only consider patients with KM data
          const category = (p as any).tumorCategory ?? (p as any).tumorCategorie;
          if (!category) return;
          counts[category] = (counts[category] || 0) + 1;
        });
        const catList = Object.keys(counts).sort((a, b) => collator.compare(a, b));

        // If there are many categories, enable only top-N by patient count initially
        const TOTAL_LIMIT = 10;
        const INITIAL_VISIBLE = 5;
        let initiallyEnabled = new Set<string>(catList);
        if (catList.length > TOTAL_LIMIT) {
          const sortedByCount = Object.entries(counts).sort(([, aCount], [, bCount]) => bCount - aCount).map(([cat]) => cat);
          initiallyEnabled = new Set(sortedByCount.slice(0, INITIAL_VISIBLE));
        }

        // Combine all tumor categories to get ICD-10 codes
        const allTumorCategories = [
          ...solidTumorCategoriesData.categories,
          ...hematologicalTumorCategoriesData.categories
        ];
        const categoryToICD10 = new Map(
          allTumorCategories.map(cat => [cat.name, Array.isArray(cat.icd10) ? cat.icd10 : [cat.icd10]])
        );

        catList.forEach(category => {
          const icd10Codes = categoryToICD10.get(category) || [];
          const icd10Text = icd10Codes.length > 0 ? ` (${icd10Codes.join('; ')})` : '';
          groups.push({
            id: category,
            name: `${category}${icd10Text}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: initiallyEnabled.has(category),
          });
          colorIndex++;
        });
        break;
      }

      case "staging":
        const stagings = new Set(patients.map(p => p.staging?.uicc).filter((s): s is string => Boolean(s)));
        stagings.forEach(staging => {
          groups.push({
            id: staging,
            name: t("labels.uicc", { value: staging }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;

      case "grading":
        const gradings = new Set(patients.map(p => p.grading).filter((g): g is string => Boolean(g)));
        gradings.forEach(grading => {
          groups.push({
            id: grading,
            name: t("labels.grading", { value: grading }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;

      case "diagnosisYear": {
        // One group per calendar year, sorted ascending — matching both the
        // worker (which always emits one curve per year, never year ranges)
        // and this file's own per-patient group assignment further below.
        // This used to bucket spans > 5 years into ranges ("2018-2020"), which
        // no other code path knew about: the resulting group ids matched
        // neither the worker's per-year curve ids nor the patient counts, so
        // the palette lookup fell through to a hardcoded fallback colour (the
        // colour scale appeared to have no effect) and toggling a group did
        // nothing.
        const years = Array.from(new Set(patients.map(p => getDiagnosisDate(p).getFullYear())))
          .sort((a, b) => a - b);
        years.forEach(year => {
          groups.push({
            id: year.toString(),
            name: year.toString(),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tCategoryOneDigit": {
        // Only include normalized T categories for patients with KM data
        const tCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const raw = p.staging?.tOneDigit || p.staging?.tCategory || null;
          const norm = normalizeTOneDigit(raw);
          if (!norm) return;
          tCounts[norm] = (tCounts[norm] || 0) + 1;
        });
        Object.keys(tCounts).forEach(tCategory => {
          groups.push({
            id: tCategory,
            name: t("labels.tCategory", { value: tCategory === T_UNKNOWN ? t("labels.notReported") : tCategory }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tCategoryTwoDigit": {
        // Only include detailed T categories (2-digit) for patients with KM data
        const tCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const raw = p.staging?.tTwoDigit || p.staging?.tCategory || null;
          const detailed = normalizeTTwoDigit(raw);
          if (!detailed) return;
          tCounts[detailed] = (tCounts[detailed] || 0) + 1;
        });
        Object.keys(tCounts).forEach(tCategory => {
          groups.push({
            id: tCategory,
            name: t("labels.tCategory", { value: tCategory === T_UNKNOWN ? t("labels.notReported") : tCategory }),
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tPathological": {
        const tCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const val = p.staging?.tPathological;
          if (!val) return;
          tCounts[val] = (tCounts[val] || 0) + 1;
        });
        Object.keys(tCounts).forEach(tCategory => {
          groups.push({
            id: tCategory,
            name: `${tCategory}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tPathologicalOneDigit": {
        const tCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const raw = p.staging?.tPathological || null;
          const norm = normalizeTOneDigit(raw, "pathological");
          if (!norm) return;
          tCounts[norm] = (tCounts[norm] || 0) + 1;
        });
        Object.keys(tCounts).forEach(tCategory => {
          groups.push({
            id: tCategory,
            name: `${tCategory}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tPathologicalTwoDigit": {
        const tCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const raw = p.staging?.tPathological || null;
          const detailed = normalizeTTwoDigit(raw, "pathological");
          if (!detailed) return;
          tCounts[detailed] = (tCounts[detailed] || 0) + 1;
        });
        Object.keys(tCounts).forEach(tCategory => {
          groups.push({
            id: tCategory,
            name: `${tCategory}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tClinical": {
        const tCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const val = p.staging?.tClinical;
          if (!val) return;
          tCounts[val] = (tCounts[val] || 0) + 1;
        });
        Object.keys(tCounts).forEach(tCategory => {
          groups.push({
            id: tCategory,
            name: `${tCategory}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tClinicalOneDigit": {
        const tCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const raw = p.staging?.tClinical || null;
          const norm = normalizeTOneDigit(raw, "clinical");
          if (!norm) return;
          tCounts[norm] = (tCounts[norm] || 0) + 1;
        });
        Object.keys(tCounts).forEach(tCategory => {
          groups.push({
            id: tCategory,
            name: `${tCategory}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tClinicalTwoDigit": {
        const tCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const raw = p.staging?.tClinical || null;
          const detailed = normalizeTTwoDigit(raw, "clinical");
          if (!detailed) return;
          tCounts[detailed] = (tCounts[detailed] || 0) + 1;
        });
        Object.keys(tCounts).forEach(tCategory => {
          groups.push({
            id: tCategory,
            name: `${tCategory}`,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "nCategory": {
        const nCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const raw = p.staging?.nCategory ?? p.staging?.tnm?.pN ?? p.staging?.tnm?.cN ?? null;
          const normalized = normalizeTNCategory(raw, "N");
          if (!normalized) return;
          nCounts[normalized] = (nCounts[normalized] || 0) + 1;
        });
        Object.keys(nCounts).forEach(nCategory => {
          groups.push({
            id: nCategory,
            name: nCategory,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "mCategory": {
        const mCounts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const raw = p.staging?.mCategory ?? p.staging?.tnm?.pM ?? p.staging?.tnm?.cM ?? null;
          const normalized = normalizeTNCategory(raw, "M");
          if (!normalized) return;
          mCounts[normalized] = (mCounts[normalized] || 0) + 1;
        });
        Object.keys(mCounts).forEach(mCategory => {
          groups.push({
            id: mCategory,
            name: mCategory,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tumorMainCategory": {
        const counts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const val = p.tumorMainCategory;
          if (!val) return;
          counts[val] = (counts[val] || 0) + 1;
        });
        Object.keys(counts).forEach(category => {
          groups.push({
            id: category,
            name: category,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "tumorSubCategory": {
        const counts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const val = p.tumorSubCategory;
          if (!val) return;
          counts[val] = (counts[val] || 0) + 1;
        });
        Object.keys(counts).forEach(category => {
          groups.push({
            id: category,
            name: category,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "spreadCategory": {
        const counts: Record<string, number> = {};
        patients.forEach(p => {
          if (!patientHasKaplanMeierData(p)) return;
          const val = p.spreadCategory;
          if (!val) return;
          counts[val] = (counts[val] || 0) + 1;
        });
        Object.keys(counts).forEach(category => {
          groups.push({
            id: category,
            name: category,
            color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
            enabled: true,
          });
          colorIndex++;
        });
        break;
      }

      case "entityStaging": {
        // Build ICD10 → WileyEntity map for selected tumor categories OR ICD-10 codes
        const icd10ToEntity = new Map<string, WileyEntity>();
        
        // Combine all tumor categories
        const allTumorCategories = [
          ...solidTumorCategoriesData.categories,
          ...hematologicalTumorCategoriesData.categories
        ];
        
        // Create a lookup map: category name → category object
        const categoryByName = new Map(
          allTumorCategories.map(cat => [cat.name, cat])
        );
        
        if (selectedTumorCategories.length > 0) {
          // For each selected tumor category name, find the category object and Wiley entity
          selectedTumorCategories.forEach(categoryName => {
            const cat = categoryByName.get(categoryName);
            if (!cat) return;
            
            // Get ICD10 codes from category
            const icd10Codes = Array.isArray(cat.icd10) ? cat.icd10 : [cat.icd10];
            
            // Find Wiley entity by category name and ICD10
            const sampleICD10 = icd10Codes[0];
            const wileyEntity = findEntityByTumorCategory(cat.name, sampleICD10);
            
            if (wileyEntity) {
              // Map all ICD10 codes of this category to the entity
              icd10Codes.forEach(icd => {
                if (icd) {
                  const baseCode = icd.match(/^[A-Z]\d{2}/)?.[0];
                  if (baseCode) {
                    icd10ToEntity.set(baseCode, wileyEntity);
                  }
                }
              });
            }
          });
        } else if (selectedICD10Codes.length > 0) {
          // Use selected ICD-10 codes directly (without tumor categories)
          selectedICD10Codes.forEach(icd10 => {
            // Find Wiley entity for this ICD-10 code
            const wileyEntity = findEntityByTumorCategory("", icd10);
            if (wileyEntity) {
              icd10ToEntity.set(icd10, wileyEntity);
            }
          });
        }
        
        if (icd10ToEntity.size > 0) {
          
          // NEW: Multi-entity Wiley staging with ICD10 prefix
          const icdStageSet = new Set<string>();

          patients.forEach(p => {
            if (!patientHasKaplanMeierData(p)) return;

            // Extract ICD10 from patient
            const patientICD10 = p.tumorType?.match(/^([CDZ]\d{2})/)?.[1];
            if (!patientICD10) return;

            // Find corresponding Wiley entity
            const wileyEntity = icd10ToEntity.get(patientICD10);
            if (!wileyEntity) return;

            // Get TNM values
            const { t, n, m } = tnmForStaging(p.staging);

            // Determine stage
            const stage = getWileyStaging(wileyEntity, t, n, m);
            if (stage) icdStageSet.add(`${patientICD10}__${stage}`);
          });
          
          
          // Create groups with ICD10__Stage as ID, always show ICD10 + name + stage in legend
          Array.from(icdStageSet).sort().forEach(key => {
            const [icd, stage] = key.split("__");
            groups.push({
              id: key, // Always use ICD10__Stage format for ID matching
              name: `${getICD10DisplayName(icd)} ${t("labels.stageSingle", { stage })}`, // Show ICD10 + name + stage
              color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
              enabled: true,
            });
            colorIndex++;
          });
          
          // Add "No Match" group for patients without valid staging
          groups.push({
            id: "no_match",
            name: t("labels.noMatch"),
            color: "#9ca3af", // Gray color
            enabled: true,
          });
          
        } else {
          // Fallback: No Wiley entities found
        }
        break;
      }

      default: {
        if (typeof criterion === 'string' && criterion.startsWith('extra:')) {
          const colName = criterion.slice('extra:'.length);
          const meta: ColumnMeta | undefined = extraColumns?.columns[colName];
          if (!meta) break;

          if (meta.type === 'categorical') {
            meta.distinctValues.forEach(val => {
              groups.push({
                id: val,
                name: val,
                color: CURVE_COLORS[colorIndex % CURVE_COLORS.length],
                enabled: true,
              });
              colorIndex++;
            });
          } else {
            // numeric → bins from binning config (default quartiles if not set)
            const sortedValues: number[] = [];
            for (const p of patients) {
              const raw = (p as any).extras?.[colName];
              if (!raw) continue;
              const parsed = parseNumberWithUnit(raw);
              if (!parsed) continue;
              const factor = meta.conversionFactors?.[parsed.unit ?? '']
                ?? (parsed.unit == null || parsed.unit === '' ? 1 : NaN);
              if (!isFinite(factor)) continue;
              sortedValues.push(parsed.number * factor);
            }
            sortedValues.sort((a, b) => a - b);
            const bins = computeBins(meta, sortedValues, effectiveBinning);
            bins.forEach((bin, idx) => {
              groups.push({
                id: bin.id,
                name: bin.label,
                color: CURVE_COLORS[idx % CURVE_COLORS.length],
                enabled: true,
              });
            });
          }
          if (meta.nMissing > 0) {
            groups.push({
              id: '__missing__',
              name: t("labels.notAvailable"),
              color: '#9ca3af',
              enabled: true,
            });
          }
          break;
        }
        break;
      }
    }

    // Gruppen nach Label natürlich sortieren
    return naturalSort(groups);
  };

   const handleCriterionChange = (newCriterion: StratificationCriterion) => {
     onBeforeChange && onBeforeChange();
     const newGroups = generateGroupsForCriterion(newCriterion);
     const newConfig: StratificationConfig = {
       criterion: newCriterion,
       groups: newGroups,
     };
     onConfigChange(newConfig);
   };

   const handleGroupToggle = (groupId: string) => {
     onBeforeChange && onBeforeChange();
     const newGroups = config.groups.map(group => 
       group.id === groupId ? { ...group, enabled: !group.enabled } : group
     );
     onConfigChange({
       ...config,
       groups: newGroups,
     });
   };

   const getEnabledGroupsCount = () => config.groups.filter(g => g.enabled).length;

  // Hilfsfunktion: Nur Gruppen mit mindestens einem Patienten anzeigen
  const getNonEmptyGroups = () => {
    const groupPatientCount: Record<string, number> = {};
    config.groups.forEach(group => {
      groupPatientCount[group.id] = patients.filter(p => {
        // Die gleiche Logik wie in getPatientGroup in results/page.tsx
        // (Hier vereinfacht: entityStaging und andere Kriterien)
        let groupId = "unknown";
        switch (config.criterion) {
          case "entityStaging": {
            // Extract patient's ICD10 code
            const patientICD10 = p.tumorType?.match(/^([CDZ]\d{2})/)?.[1];
            if (!patientICD10) {
              groupId = "no_match";
              break;
            }
            
            // Find Wiley entity for this ICD10 code (with age for Thyroid)
            const patientAge = typeof p.age === 'number' ? p.age : undefined;
            const wileyEntity = findEntityByTumorCategory("", patientICD10, patientAge);
            if (!wileyEntity) {
              groupId = "no_match";
              break;
            }
            
            // Get TNM values and determine stage
            const { t, n, m } = tnmForStaging(p.staging);
            const stage = getWileyStaging(wileyEntity, t, n, m);
            
            if (stage) {
              // Always return ICD10__Stage format for consistent grouping
              groupId = `${patientICD10}__${stage}`;
            } else {
              groupId = "no_match";
            }
            break;
          }
          case "gender": groupId = p.gender; break;
          case "ageGroup": {
            groupId = getAgeGroup(p.age);
            break;
          }
          case "tumorType": {
            if (!patientHasKaplanMeierData(p)) {
              groupId = "unknown";
            } else {
              groupId = extractIcd10FromTumorType(p.tumorType);
            }
            break;
          }
          case "tumorCategory": groupId = (patientHasKaplanMeierData(p) ? ((p as any).tumorCategory ?? (p as any).tumorCategorie ?? "unknown") : "unknown"); break;
          case "staging": groupId = p.staging?.uicc || "unknown"; break;
          case "grading": groupId = p.grading || "unknown"; break;
          case "diagnosisYear": groupId = getDiagnosisDate(p).getFullYear().toString(); break;
          case "tCategoryOneDigit": {
            const rawT = p.staging?.tOneDigit || p.staging?.tCategory || null;
            groupId = normalizeTOneDigit(rawT);
            break;
          }
          case "tCategoryTwoDigit": {
            const rawT = p.staging?.tTwoDigit || p.staging?.tCategory || null;
            groupId = normalizeTTwoDigit(rawT);
            break;
          }
          case "tPathological": groupId = p.staging?.tPathological || "unknown"; break;
          case "tPathologicalOneDigit": {
            groupId = normalizeTOneDigit(p.staging?.tPathological || null, "pathological") ?? "no_match";
            break;
          }
          case "tPathologicalTwoDigit": {
            groupId = normalizeTTwoDigit(p.staging?.tPathological || null, "pathological") ?? "no_match";
            break;
          }
          case "tClinical": groupId = p.staging?.tClinical || "unknown"; break;
          case "tClinicalOneDigit": {
            groupId = normalizeTOneDigit(p.staging?.tClinical || null, "clinical") ?? "no_match";
            break;
          }
          case "tClinicalTwoDigit": {
            groupId = normalizeTTwoDigit(p.staging?.tClinical || null, "clinical") ?? "no_match";
            break;
          }
          case "nCategory": groupId = p.staging?.nCategory || "unknown"; break;
          case "mCategory": groupId = p.staging?.mCategory || "unknown"; break;
          case "tumorMainCategory": groupId = p.tumorMainCategory; break;
          case "tumorSubCategory": groupId = p.tumorSubCategory || "unknown"; break;
          case "spreadCategory": groupId = p.spreadCategory; break;
          default: groupId = "unknown";
        }
        return groupId === group.id;
      }).length;
    });
    const nonEmpty = config.groups.filter(g => groupPatientCount[g.id] > 0);
    return naturalSort(nonEmpty);
  };

  const nonEmptyGroups = getNonEmptyGroups();

  // Which criteria actually have data in the current cohort. A criterion is
  // available when it yields at least one real group; generateGroupsForCriterion
  // returns [] when no patient has a usable value (e.g. UICC stage in METABRIC).
  // The cache resets whenever the cohort or its columns change; entries are
  // filled lazily the first time an option is rendered.
  const availabilityCache = useMemo<Record<string, boolean>>(
    () => ({}),
    [patients, extraColumns, config.binning],
  );

  const isCriterionAvailable = (criterion: string): boolean => {
    if (criterion === "none") return true;
    if (criterion in availabilityCache) return availabilityCache[criterion];
    let available = true;
    try {
      available = generateGroupsForCriterion(criterion as StratificationCriterion).length > 0;
    } catch {
      available = true; // never hide a criterion because probing threw
    }
    availabilityCache[criterion] = available;
    return available;
  };

  // Render a criterion option that greys itself out (with a "no data" hover
  // hint) when the current cohort has no data for it, so the user cannot pick a
  // variable that would produce an empty, endlessly-loading plot. The
  // pointer-events override keeps the native title tooltip working even though
  // Radix sets pointer-events:none on disabled items.
  const critItem = (value: string, icon: ReactNode, label: ReactNode, extra?: ReactNode) => {
    const available = isCriterionAvailable(value);
    const unavailableHint = t("noData");
    return (
      <SelectItem
        key={value}
        value={value}
        disabled={!available}
        title={available ? undefined : unavailableHint}
        className={available ? undefined : "data-[disabled]:pointer-events-auto data-[disabled]:cursor-not-allowed"}
      >
        <div className="flex items-center gap-2">
          {icon}
          {label}
          {extra}
        </div>
      </SelectItem>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stratification Criterion Selection */}
        <div className="space-y-2">
          <Label>{t("criterionLabel")}</Label>
          <Select value={config.criterion} onValueChange={handleCriterionChange}>
            <SelectTrigger className="w-full whitespace-normal text-left min-h-[40px]">
              <SelectValue className="whitespace-normal" />
            </SelectTrigger>
            <SelectContent>
              {critItem("none", <Users className="h-4 w-4" />, tKm("overallSurvival"))}
              {critItem("gender", <Users className="h-4 w-4" />, tKm("gender"))}
              {critItem("ageGroup", <Calendar className="h-4 w-4" />, tKm("ageGroup"))}
              {critItem("tumorType", <Activity className="h-4 w-4" />, t("criteria.icd10"))}
              {critItem("tumorCategory", <Activity className="h-4 w-4" />, tKm("tumorCategory"))}
              {critItem("staging", <Activity className="h-4 w-4" />, tKm("staging"))}
              {critItem("grading", <Activity className="h-4 w-4" />, tKm("grading"))}
              {critItem("diagnosisYear", <Calendar className="h-4 w-4" />, tKm("diagnosisYear"))}
              {critItem("tCategoryOneDigit", <Activity className="h-4 w-4" />, tKm("tCategoryOneDigit"))}
              {critItem("tCategoryTwoDigit", <Activity className="h-4 w-4" />, tKm("tCategoryTwoDigit"))}
              {critItem("tPathologicalOneDigit", <Activity className="h-4 w-4" />, tKm("tPathologicalOneDigit"))}
              {critItem("tPathologicalTwoDigit", <Activity className="h-4 w-4" />, tKm("tPathologicalTwoDigit"))}
              {critItem("tClinicalOneDigit", <Activity className="h-4 w-4" />, tKm("tClinicalOneDigit"))}
              {critItem("tClinicalTwoDigit", <Activity className="h-4 w-4" />, tKm("tClinicalTwoDigit"))}
              {critItem("tPathological", <Activity className="h-4 w-4" />, tKm("tPathological"))}
              {critItem("tClinical", <Activity className="h-4 w-4" />, tKm("tClinical"))}
              {critItem("nCategory", <Activity className="h-4 w-4" />, tKm("nCategory"))}
              {critItem("mCategory", <Activity className="h-4 w-4" />, tKm("mCategory"))}
              {critItem("tumorMainCategory", <Activity className="h-4 w-4" />, tKm("tumorMainCategory"))}
              {critItem("tumorSubCategory", <Activity className="h-4 w-4" />, tKm("tumorSubCategory"))}
              {critItem("spreadCategory", <Activity className="h-4 w-4" />, tKm("spreadCategory"))}
              {critItem("entityStaging", <Activity className="h-4 w-4" />, t("criteria.entityStaging"),
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 cursor-pointer text-muted-foreground" onClick={(e) => e.stopPropagation()}><Info className="h-4 w-4" /></span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-sm bg-white text-foreground border shadow-md">
                      <div className="font-semibold mb-1">{t("entityStaging.title")}</div>
                      <div>{t.rich("entityStaging.body", { italic: (chunks) => <i>{chunks}</i> })}</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {extraColumns && Object.keys(extraColumns.columns).length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    - {t("criteria.fromFile")} -
                  </div>
                  {Object.entries(extraColumns.columns).map(([colName, meta]) => {
                    const isNumeric = meta.type === 'numeric';
                    const unitSuffix = isNumeric && meta.unit ? ` (${meta.unit})` : '';
                    return critItem(
                      `extra:${colName}`,
                      isNumeric ? <Hash className="h-4 w-4" /> : <Tag className="h-4 w-4" />,
                      <span>{colName}{unitSuffix}</span>,
                    );
                  })}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Entity-Specific Staging Info */}
        {config.criterion === "entityStaging" && (
          <Card className={(selectedTumorCategories.length > 0 || selectedICD10Codes.length > 0)
            ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 p-4"
            : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 p-4"
          }>
            <div className="flex items-start gap-3">
              <Info className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                (selectedTumorCategories.length > 0 || selectedICD10Codes.length > 0)
                  ? "text-green-600 dark:text-green-400"
                  : "text-yellow-600 dark:text-yellow-400"
              }`} />
              <div>
                <div className={`font-semibold text-sm mb-1 ${
                  (selectedTumorCategories.length > 0 || selectedICD10Codes.length > 0)
                    ? "text-green-900 dark:text-green-100"
                    : "text-yellow-900 dark:text-yellow-100"
                }`}>
                  {selectedTumorCategories.length === 1
                    ? t("entityStaging.entityLabel", { value: selectedTumorCategories[0] })
                    : selectedTumorCategories.length > 1
                      ? t("entityStaging.entityPlural", { count: selectedTumorCategories.length })
                      : selectedICD10Codes.length === 1
                        ? t("entityStaging.icdLabel", { value: selectedICD10Codes[0] })
                        : selectedICD10Codes.length > 1
                          ? t("entityStaging.icdPlural", { count: selectedICD10Codes.length })
                          : t("entityStaging.noneSelected")}
                </div>
                <div className={`text-sm ${
                  (selectedTumorCategories.length > 0 || selectedICD10Codes.length > 0)
                    ? "text-green-800 dark:text-green-200"
                    : "text-yellow-800 dark:text-yellow-200"
                }`}>
                  {selectedTumorCategories.length === 1
                    ? t("entityStaging.descriptionSingle")
                    : selectedTumorCategories.length > 1
                      ? t("entityStaging.descriptionPlural")
                      : selectedICD10Codes.length > 0
                        ? t("entityStaging.descriptionIcd")
                        : t("entityStaging.selectPrompt")}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Binning Panel for numeric extra columns */}
        {config.criterion.startsWith("extra:") && extraColumns && (() => {
          const colName = config.criterion.slice("extra:".length);
          const meta = extraColumns.columns[colName];
          if (!meta || meta.type !== "numeric") return null;
          return (
            <BinningPanel
              columnName={colName}
              meta={meta}
              patients={patients}
              initialConfig={config.binning}
              onApply={(binning) => {
                onBeforeChange && onBeforeChange();
                const newGroups = generateGroupsForCriterion(config.criterion, binning);
                onConfigChange({ ...config, binning, groups: newGroups });
              }}
            />
          );
        })()}

        {/* Cardinality warning for over-cap categorical extra columns */}
        {config.criterion.startsWith("extra:") && extraColumns && (() => {
          const colName = config.criterion.slice("extra:".length);
          const meta = extraColumns.columns[colName];
          if (!meta || meta.type !== "categorical" || !meta.cardinalityWarning) return null;
          return (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold mb-1">{t("cardinality.title")}</div>
                  <p>{t("cardinality.body", { column: colName, n: meta.cardinality })}</p>
                </div>
              </div>
            </Card>
          );
        })()}

        {/* Group Selection */}
        {config.criterion !== "none"
          && nonEmptyGroups.length > 0
          && !(
            config.criterion.startsWith("extra:")
            && extraColumns?.columns[config.criterion.slice("extra:".length)]?.type === "numeric"
            && !config.binning?.appliedAt
          ) && (
          <div className="space-y-2">
            <Label>
              {t("groupSelection", { enabled: getEnabledGroupsCount(), total: nonEmptyGroups.length })}
            </Label>
            <div className="flex flex-wrap gap-2">
              {nonEmptyGroups.map(group => (
                <Badge
                  key={group.id}
                  variant={group.enabled ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105"
                  style={{
                    backgroundColor: group.enabled ? group.color : "transparent",
                    borderColor: group.color,
                    color: group.enabled ? "white" : group.color,
                  }}
                  onClick={() => handleGroupToggle(group.id)}
                >
                  {group.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
