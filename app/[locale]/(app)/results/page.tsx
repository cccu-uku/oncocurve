"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { AnomalyPanel } from "@/components/kaplan-meier/anomaly-panel";
import { detectAnomalies } from "@/components/kaplan-meier/anomaly-detection";
import { hatAuswertbareZeit } from "@/components/kaplan-meier/auswertbare-faelle";
import { patientGruppe } from "@/components/kaplan-meier/patient-gruppe";
import { istPrimaerfall } from "@/components/kaplan-meier/primaerfall";
import { spaltenbreiten, type SpaltenBedarf } from "@/components/kaplan-meier/pdf-tabellenspalten";
import { loadExclusions, saveExclusions } from "@/components/kaplan-meier/anomaly-exclusions";
import { CoxAnalysis } from "@/components/kaplan-meier/cox-analysis";
import { getKaplanMeierStatistics } from "@/components/kaplan-meier/kaplan-meier-plotly";
import {
  type PlotDisplayConfig,
  type PlotDisplayToggleKey,
  DEFAULT_PLOT_DISPLAY,
  loadPlotDisplay,
  savePlotDisplay,
} from "@/components/kaplan-meier/plot-display-config";
import { PlotDisplayControl } from "@/components/kaplan-meier/plot-display-control";
import { paletteEntry, type PaletteId } from "@/components/kaplan-meier/curve-palettes";
import { wendeScreenshotModusAn } from "@/components/kaplan-meier/screenshot-modus";
import { normalizeTOneDigit, normalizeTTwoDigit } from "@/components/kaplan-meier/tnm-normalize";
import { getAgeGroup } from "@/components/kaplan-meier/age-group";
import { LandmarkSurvivalTable } from "@/components/kaplan-meier/landmark-survival-table";
import KennzahlenZeile from "@/components/kaplan-meier/kennzahlen-zeile";
import ProportionBar from "@/components/kaplan-meier/proportion-bar";
import Boxkennzahlen from "@/components/kaplan-meier/boxkennzahlen";
import { fallKennung, zeilenSchluessel } from "@/components/kaplan-meier/fall-kennung";
import { kohortenaufstellung } from "@/components/kaplan-meier/endpunkte/boxregeln/kohortenaufstellung";
import type { OncoBoxCase } from "@/components/kaplan-meier/oncobox/types";
import { useDatensatzTitel } from "@/components/kaplan-meier/use-datensatz-titel";
import { aktiveFilterEintraege, entferneFilterTag } from "@/components/kaplan-meier/filters/aktive-filter";
import { FilterTagListe } from "@/components/kaplan-meier/filters/filter-tag-liste";
import { MultiSelect } from "@/components/kaplan-meier/multi-select";
import { type Patient } from "@/components/kaplan-meier/obds-parser-new";
import { calculateDFSFromOBDS } from "@/components/kaplan-meier/endpunkte/dfs";
import { migriereStratifizierung } from "@/components/kaplan-meier/endpunkte/migration";
import { EndpointControl } from "@/components/kaplan-meier/endpoint-control";
import { zentrumsTypAusKohorte } from "@/components/kaplan-meier/endpunkte/zentrumstyp";
import { endpunktById } from "@/components/kaplan-meier/endpunkte/registry";
import { kohorteFuerEndpunkt, zeitEinheitDerKohorte, schaetzerFuer } from "@/components/kaplan-meier/endpunkte/anwenden";
import { kennzahlenFuerKurve } from "@/components/kaplan-meier/endpunkte/boxregeln/kennzahlen-kohorte";
import type { KurvenSchaetzer } from "@/components/kaplan-meier/boxkurve";
import { boxRegelFuer } from "@/components/kaplan-meier/endpunkte/boxregeln";
import type { EndpunktId, ZentrumsTyp } from "@/components/kaplan-meier/endpunkte/typen";
import { gepruefterEndpunkt } from "@/components/kaplan-meier/endpunkte/auswahl";
import { normalisiereDfsEligible } from "@/components/kaplan-meier/endpunkte/verfuegbarkeit";
import {
	StratificationControl,
	type StratificationConfig,
	type StratificationCriterion
} from "@/components/kaplan-meier/stratification-control";
import type { ExtraColumnsState } from "@/components/kaplan-meier/extra-columns";
import { computeBins, parseNumberWithUnit } from "@/components/kaplan-meier/extra-columns";
import { findEntityByTumorCategory, getWileyStaging } from "@/components/kaplan-meier/tnm-wiley-staging";
import { generateStagingExport, exportToCSV, downloadCSV } from "@/components/kaplan-meier/staging-export";
import { TumorCategoryMultiSelect } from "@/components/kaplan-meier/tumor-category-multiselect";
import { ICD10CodeMultiSelect } from "@/components/kaplan-meier/icd10-code-multiselect";
import { YearRangePicker } from "@/components/kaplan-meier/year-range-picker";
import { pseudonymizeTableRows, type ExportMode, type RawPatientDates } from "@/components/kaplan-meier/export-anonymization";
import { ExportModePicker } from "@/components/kaplan-meier/export-mode-picker";
import { normalizeIsoDate } from "@/components/kaplan-meier/date-utils";
import { UnitConversionBanner } from "@/components/unit-conversion-banner";
import hematologicalTumorCategoriesData from "@/data/hematological-tumor-categories.json";
import solidTumorCategoriesData from "@/data/solid-tumor-categories.json";
import { SHOW_GLOBAL_RESULTS_SPINNER } from "@/lib/config";
import {
  logRankTest,
  pairwiseLogRank,
  computeKaplanMeierCI,
  computeKMAtTimepoints,
  computeKMPercentile,
  computeReverseKMFollowUp,
  niceTimeTicks,
  convertTimeUnit,
  fixedFiveYearTicks,
  sequentiellerSchaetzer,
  type SurvivalDataPoint,
  type SurvivalDataPointWithCI,
  type LogRankMethod,
  type TimeUnit,
} from "@/utils/kaplan-meier";
import type { CoxSummary } from "@/utils/cox-regression";
import {
	Alert,
	AlertDescription,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Label,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@/components/ui";
import { ArrowLeft, AlertTriangle, CalendarDays, Camera, ChevronDown, Download, Filter, Info, PanelLeftClose, PanelLeftOpen, FileSpreadsheet } from "lucide-react";
import { TourLayer, useTourStep } from "@/components/guided-tour";

const PatientsAtRiskPlot = dynamic(() => import("@/components/kaplan-meier/patients-at-risk-plot"), { ssr: false });

// dom-to-image-more exposes its API as the DEFAULT export (a CJS object with
// toPng/toSvg/...). Destructuring `{ domtoimage }` yields undefined; under
// dynamic import the object can sit on `.default` or directly on the namespace.
async function loadDomToImage(): Promise<any> {
  const m: any = await import("dom-to-image-more");
  return m?.default ?? m;
}

// Capture a DOM node as PNG/SVG without the grey card outlines/shadows that
// otherwise frame every element in the export. Rather than mutate each node, we
// inject one scoped !important stylesheet that makes all borders transparent and
// removes shadows; this beats Tailwind's utilities (and its preflight, which
// sets `border-style: solid` on every element) regardless of how dom-to-image
// reads styles. Transparent border colour hides the line whatever its width.
async function captureCleanNode(node: HTMLElement, format: "png" | "svg"): Promise<string> {
  const domtoimage = await loadDomToImage();
  const MARK = "data-clean-capture";
  node.setAttribute(MARK, "1");
  const style = document.createElement("style");
  style.textContent =
    `[${MARK}], [${MARK}] * { box-shadow: none !important; border-color: transparent !important; outline-color: transparent !important; }`;
  document.head.appendChild(style);
  try {
    return format === "png"
      ? await domtoimage.toPng(node, { bgcolor: "#ffffff", quality: 1 })
      : await domtoimage.toSvg(node, { bgcolor: "#ffffff" });
  } finally {
    document.head.removeChild(style);
    node.removeAttribute(MARK);
  }
}

/**
 * Helper functions for ICD-10 code matching
 */
function extractICD10Code(tumorType: string): string | null {
  const match = tumorType.match(/^([CDZ]\d{2}(?:\.\d+)?)\b/);
  return match ? match[1] : null;
}

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

function patientMatchesCategory(patient: Patient, categoryName: string): boolean {
  const patientICD10 = extractICD10Code(patient.tumorType || "");
  if (!patientICD10) return false;
  
  // Find the category in solid tumor categories
  const solidCategory = solidTumorCategoriesData.categories.find(cat => cat.name === categoryName);
  if (solidCategory) {
    return solidCategory.icd10.some(pattern => matchesICD10Pattern(patientICD10, pattern));
  }
  
  // Find the category in hematological tumor categories
  const hematologicalCategory = hematologicalTumorCategoriesData.categories.find(cat => cat.name === categoryName);
  if (hematologicalCategory) {
    return hematologicalCategory.icd10.some(pattern => matchesICD10Pattern(patientICD10, pattern));
  }
  
  return false;
}

interface SurvivalData {
  time: number;
  probability: number;
  atRisk: number;
  events: number;
  tCategory?: string;
  primaryCase?: boolean;
  icd10?: string;
  diagnosisDate?: string;
  vitalDate?: string;
  patientId?: string; // Added patientId for table
}

// Add index signature for dynamic table row access
type SurvivalTableRow = {
  [key: string]: string | number | undefined;
};

interface SurvivalCurve {
  id: string;
  name: string;
  data: SurvivalData[];
  color: string;
}

// Helpers to safely handle dates from mixed sources (string | Date | null)
const toDateSafe = (value: unknown): Date | undefined => {
  if (!value) return undefined;

  const parseStringDate = (input: string): Date | undefined => {
    const trimmed = input.trim();

    const dotMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dotMatch) {
      const [, d, m, y] = dotMatch;
      const parsed = new Date(Number(y), Number(m) - 1, Number(d));
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }

    const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, d, m, y] = slashMatch;
      const parsed = new Date(Number(y), Number(m) - 1, Number(d));
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }

    return undefined;
  };

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "string") {
    const parsed = parseStringDate(value);
    if (parsed) return parsed;
  }

  const d = new Date(value as any);
  return isNaN(d.getTime()) ? undefined : d;
};

const toISOStringSafe = (value: unknown): string | undefined => {
  const d = toDateSafe(value);
  return d ? d.toISOString() : undefined;
};

// Reads a JSON value the app itself wrote to sessionStorage earlier in this
// tab (client-only, nothing ever leaves the browser). Falls back silently on
// SSR, a missing key, or a corrupt/foreign value.
function readSessionJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface FilterState {
  selectedGender: string[];
  selectedAgeGroup: string[];
  selectedICD10Codes: string[]; // ICD-10 codes filter
  selectedTumorCategories: string[]; // Tumor categories instead of individual types
  selectedStaging: string[];
  selectedGrading: string[];
  selectedYearRange: { start: number | null; end: number | null };
  selectedPrimaryCase: string[];
  selectedSpreadCategory: string[];
}

const CURVE_COLORS = [
    "#FF00FF",  // Knalliges Magenta
    "#FF1493", // Intensives Deep Pink
    "#00FF00",  // Reines Gr├╝n
    "#48EDDD",  // Pastelliges Mint (statt kr├ñftigem T├╝rkis)    
    "#FF0000",  // Kr├ñftiges Rot
    "#FF7F00",  // Kr├ñftiges Orange
    "#FFFF00",  // Strahlendes Gelb
    "#1A4C39",  // Leuchtendes Chartreuse-Gr├╝n
    "#0000FF",  // Reines Blau
    "#B0E0E6",  // Pastelliges Hellblau (statt ├ñhnlich zu T├╝rkis)
    "#9277AC",  // Kr├ñftiges BlueViolet
    "#0094FB",  // Zartes Pastell-Lavendel
    "#A52A2A",  // Kr├ñftiges Braun
    "#FFDAB9",  // Sanftes Pastell-Pfirsich
    "#FF4500",  // Leuchtendes OrangeRed
    "#9400D3",  // Dunkles Violett
    "#4B0082",  // Tiefes Indigo
    "#FFD700",  // Strahlendes Gold
    "#FFA07A",   // Sanftes Pastell-Lachs
    "#000000"  // Schwarz
];



export default function ResultsPage() {

  const t = useTranslations("KaplanMeier");
  const tr = useTranslations("Results");
  const tLm = useTranslations("LandmarkTable");
  const tCox = useTranslations("CoxAnalysis");
  const tEp = useTranslations("Endpoint");
  const tBox = useTranslations("OncoBox.metrics");
  const datensatz = useDatensatzTitel();
  const locale = useLocale();
  const router = useRouter();
  const KaplanMeierPlotly = useMemo(
    () =>
      dynamic(() => import("@/components/kaplan-meier/kaplan-meier-plotly"), {
        ssr: false,
        loading: () => (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {tr("loadingPlot")}
          </div>
        ),
      }),
    [tr]
  );

  // Patienten mit diagnosisYear erg├ñnzen
  const [patients, setPatients] = useState<Patient[]>([]);
  // Note: diagnosisYear is now precomputed inside hydratePatients (a single
  // full-cohort iteration). The old useEffect here ran a SECOND map-and-setState
  // after the initial hydrate, doubling the post-upload render cost — removed.

  // Endpunkt der Auswertung. Eigene Dimension neben der Stratifizierung: der
  // Endpunkt sagt, was gemessen wird, die Stratifizierung, wie geteilt wird.
  const [endpunkt, setEndpunkt] = useState<EndpunktId>("oas");
  const [zentrumsTyp, setZentrumsTyp] = useState<ZentrumsTyp | null>(null);

  // Der gespeicherte Endpunkt stammt aus einer früher geladenen Datei und wird
  // deshalb gegen Registry, Zentrumstyp und Kohorte geprüft. Ohne die Prüfung
  // rechnete die Seite einen Endpunkt, den kein Radio anzeigt.
  useEffect(() => {
    if (patients.length === 0) return;

    const gespeichert = readSessionJSON<unknown>("km-endpunkt", null);
    setEndpunkt(gepruefterEndpunkt(gespeichert, patients, zentrumsTyp));
  }, [patients, zentrumsTyp]);

  const setEndpunktPersisted = useCallback((naechster: EndpunktId) => {
    setEndpunkt(naechster);
    try {
      sessionStorage.setItem("km-endpunkt", JSON.stringify(naechster));
    } catch {
      // sessionStorage voll oder gesperrt: die Auswahl übersteht dann kein Neuladen
    }
  }, []);

  // Der Zentrumstyp folgt der Kohorte, solange ihn niemand von Hand gesetzt
  // hat. Ein Wechsel der Datei soll ihn also mitnehmen.
  //
  // Liefert die Kohorte gar keinen Zentrumstyp, ist das die freie Analyse. Dann
  // muss auch ein gespeicherter Wert aus einer früher geladenen OncoBox-Datei
  // verschwinden, sonst liefe eine CSV-Kohorte im Zertifizierungsmodus mit
  // einem Zentrumstyp, der für sie nicht gilt, und bekäme dessen Pflichtliste
  // vorgesetzt.
  useEffect(() => {
    // Leere Kohorte heißt nicht "freie Analyse", sondern "noch nichts geladen".
    // Der Effekt läuft beim Seitenaufbau einmal vor der Hydratisierung; ohne
    // diese Sperre löschte er dabei die Korrektur des Anwenders aus der Sitzung.
    if (patients.length === 0) return;

    const ausKohorte = zentrumsTypAusKohorte(patients);
    if (!ausKohorte) {
      setZentrumsTyp(null);
      try {
        sessionStorage.removeItem("km-zentrumstyp");
      } catch {
        // sessionStorage gesperrt: dann bleibt der Wert stehen, mehr geht nicht
      }
      return;
    }
    const gespeichert = readSessionJSON<ZentrumsTyp | null>("km-zentrumstyp", null);
    setZentrumsTyp(gespeichert ?? ausKohorte);
  }, [patients]);

  const setZentrumsTypPersisted = useCallback((naechster: ZentrumsTyp) => {
    setZentrumsTyp(naechster);
    try {
      sessionStorage.setItem("km-zentrumstyp", JSON.stringify(naechster));
    } catch {
      // siehe oben
    }
  }, []);

  // Helper function to ensure diagnosisDate is always a Date object
  const getDiagnosisDate = (patient: Patient): Date => {
    const parsed = toDateSafe(patient.diagnosisDate);
    return parsed ?? new Date(); // fallback to current date if unparseable
  };
  const [survivalData, setSurvivalData] = useState<SurvivalData[]>([]);
  const [survivalCurves, setSurvivalCurves] = useState<SurvivalCurve[]>([]);
  const [isLoadingPlots, setIsLoadingPlots] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  // Filter panel starts collapsed: the sidebar's most-used control
  // (stratification) sits right below it and should not require scrolling
  // past nine multi-selects to reach. Not persisted on purpose.
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  const resetAll = () => {
    setFiltersPersisted({
      selectedGender: [],
      selectedAgeGroup: [],
      selectedICD10Codes: [],
      selectedTumorCategories: [],
      selectedStaging: [],
      selectedGrading: [],
      selectedYearRange: { start: null, end: null },
      selectedPrimaryCase: [],
      selectedSpreadCategory: []
    });
  };
  const [isGlobalLoading, setIsGlobalLoading] = useState<boolean>(false);
  const [coxSummary, setCoxSummary] = useState<CoxSummary | null>(null);
  const [extraColumns, setExtraColumns] = useState<ExtraColumnsState | null>(null);
  const [toggleLeft, setToggleLeft] = useState<number>(12);

  const [plotDisplay, setPlotDisplay] = useState<PlotDisplayConfig>(DEFAULT_PLOT_DISPLAY);

  useEffect(() => {
    setPlotDisplay(loadPlotDisplay());
  }, []);

  useEffect(() => {
    wendeScreenshotModusAn(plotDisplay.screenshotMode);
  }, [plotDisplay.screenshotMode]);

  const updatePlotToggle = (
    key: PlotDisplayToggleKey,
    value: boolean,
  ) => {
    setPlotDisplay((prev) => {
      if (prev[key] === value) return prev; // identity bail-out — render-loop protection
      const next = { ...prev, [key]: value };
      savePlotDisplay(next);
      return next;
    });
  };

  const updateLogRankMethod = (method: LogRankMethod) => {
    setPlotDisplay((prev) => {
      if (prev.logRankMethod === method) return prev;
      const next = { ...prev, logRankMethod: method };
      savePlotDisplay(next);
      return next;
    });
  };

  const updatePalette = (palette: PaletteId) => {
    setPlotDisplay((prev) => {
      if (prev.palette === palette) return prev;
      const next = { ...prev, palette };
      savePlotDisplay(next);
      return next;
    });
  };

  // Refs for chart download
  const chartRef = useRef<HTMLDivElement>(null);
  const statisticsRef = useRef<HTMLDivElement>(null);
  const cohortKpiRef = useRef<HTMLDivElement>(null);
  const cohortPieRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // PDF-Export-Optionen (Popover am PDF-Button)
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfMode, setPdfMode] = useState<ExportMode>("full");

  // Export modes for sharing. Excel and PDF are configured independently on
  // purpose: sharing the report pseudonymised while keeping the spreadsheet
  // complete is a normal thing to want.
  const [excelMode, setExcelMode] = useState<ExportMode>("full");
  const [excelOpen, setExcelOpen] = useState(false);

  // Hilfsfunktion: oklch/oklab-Farben tempor├ñr ersetzen (Workaround f├╝r html2canvas)
  function replaceModernColorFunctions(root: HTMLElement, replacement = 'rgb(255,255,255)') {
    const changed: Array<{el: HTMLElement, prop: string, old: string}> = [];
    const walk = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      for (const prop of ['backgroundColor', 'color', 'borderColor']) {
        const val = style.getPropertyValue(prop);
        if (val && (val.includes('oklch') || val.includes('oklab'))) {
          const old = el.style.getPropertyValue(prop);
          el.style.setProperty(prop, replacement, 'important');
          changed.push({el, prop, old});
        }
      }
      for (const child of Array.from(el.children)) {
        if (child instanceof HTMLElement) walk(child);
      }
    };
    walk(root);
    return () => {
      for (const {el, prop, old} of changed) {
        if (old) el.style.setProperty(prop, old);
        else el.style.removeProperty(prop);
      }
    };
  }

  // PDF-Export nutzt PNGs der Plots
  const exportPageAsPDF = async ({ mode = "full" as ExportMode }: { mode?: ExportMode } = {}) => {
    const incPatientTable = mode !== "noPatients";
    const { jsPDF } = await import("jspdf");
    const { buildCoxForestSvg, svgToPngDataUrl } = await import("@/components/kaplan-meier/cox-forest-svg");
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - 2 * margin;
    // Branding palette - matches the theme primary (hsl(199 100% 33%), styles/theme.css)
    const BRAND: [number, number, number] = [0, 116, 168];
    // Blaugrau statt Neutralgrau, derselbe Ton wie --muted-foreground auf
    // dem Bildschirm (hsl(205 20% 34%)). Das bisherige 120/120/120 lag bei
    // 3,54:1 gegen Weiss und war damit unter der Textstufe AA, ausgerechnet
    // im Bericht, der ausgedruckt und in die Zertifizierungsakte gelegt
    // wird. Der neue Wert liegt bei 7,20:1.
    const MUTED: [number, number, number] = [69, 90, 104];
    const RULE: [number, number, number] = [220, 220, 220];

    // No logo in the report (removed on request). Kept as null so the existing
    // "if (onconnectLogo)" branches simply skip.
    const onconnectLogo: string | null = null;
    let y = margin;

    const drawPageHeader = () => {
      const headerY = 24;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...BRAND);
      pdf.text('ONCOcurve', margin, headerY);
      // ONCOnnect logo, right-aligned, scaled to a 14pt height band
      if (onconnectLogo) {
        try {
          const props = pdf.getImageProperties(onconnectLogo);
          const logoH = 14;
          const logoW = (props.width / props.height) * logoH;
          pdf.addImage(onconnectLogo, 'PNG', pageWidth - margin - logoW, headerY - 11, logoW, logoH);
        } catch {}
      }
      pdf.setDrawColor(...RULE);
      pdf.setLineWidth(0.5);
      pdf.line(margin, headerY + 6, pageWidth - margin, headerY + 6);
      pdf.setTextColor(0, 0, 0);
    };

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (y + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        y = margin + 24; // leave room for page header
        drawPageHeader();
        return true;
      }
      return false;
    };

    // Helper function to add a section title with colored underline
    const addSectionTitle = (title: string, size = 14) => {
      y += 10; // breathing room before each section
      checkPageBreak(size + 22);
      pdf.setFontSize(size);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...BRAND);
      pdf.text(title, margin, y);
      pdf.setTextColor(0, 0, 0);
      y += size - 2;
      pdf.setDrawColor(...BRAND);
      pdf.setLineWidth(1);
      pdf.line(margin, y, margin + 40, y);
      y += 14;
    };

    // Helper: a bordered key/value summary box (clean, aligned two columns).
    const addKeyValueBox = (rows: [string, string][]) => {
      const lineH = 16;
      const padV = 9;
      const boxH = rows.length * lineH + padV * 2;
      checkPageBreak(boxH + 8);
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(...RULE);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, y, contentWidth, boxH, 4, 4, 'FD');
      const labelX = margin + 14;
      const valueX = margin + 175;
      let ry = y + padV + 8;
      for (const [label, value] of rows) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...MUTED);
        pdf.text(label, labelX, ry);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const v = pdf.splitTextToSize(String(value), contentWidth - (valueX - margin) - 14);
        pdf.text(v[0], valueX, ry);
        ry += lineH;
      }
      pdf.setFont('helvetica', 'normal');
      y += boxH + 6;
    };

    // Helper: a light-blue band with horizontally-centred label/value cells
    // (same style as the analysis-parameter box / KM header band).
    const addInfoBand = (items: [string, string][]) => {
      if (items.length === 0) return;
      const bandH = 38;
      checkPageBreak(bandH + 10);
      pdf.setFillColor(240, 246, 252);
      pdf.setDrawColor(...RULE);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, y, contentWidth, bandH, 4, 4, 'FD');
      const cellW = contentWidth / items.length;
      items.forEach(([label, val], i) => {
        const cx = margin + i * cellW + cellW / 2;
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...MUTED);
        pdf.text(pdf.splitTextToSize(label, cellW - 12)[0], cx, y + 15, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(pdf.splitTextToSize(val, cellW - 12)[0], cx, y + 28, { align: 'center' });
      });
      pdf.setFont('helvetica', 'normal');
      y += bandH + 12;
    };

    // Helper: place a captured image together with its section title, keeping
    // them on one page and scaling down so the image never overflows a page.
    // (Previously each section added its title, then re-added it after a page
    // break, so headings appeared twice across pages.)
    const placeImage = async (dataUrl: string, title: string, maxHeightOverride?: number) => {
      const im = new window.Image();
      im.src = dataUrl;
      await new Promise(res => { im.onload = res; });
      const maxH = Math.min(maxHeightOverride ?? Infinity, pageHeight - 2 * margin - 44);
      let imgW = contentWidth;
      let imgH = (im.height / im.width) * imgW;
      if (imgH > maxH) { imgH = maxH; imgW = (im.width / im.height) * imgH; }
      checkPageBreak(imgH + 42);
      addSectionTitle(title);
      pdf.addImage(dataUrl, 'PNG', margin + (contentWidth - imgW) / 2, y, imgW, imgH);
      y += imgH + 16;
    };

    // Place several captured images side by side in equal columns, each under a
    // small column title, on one row (used for the cohort KPIs + pie chart).
    const placeImagesRow = async (items: { dataUrl: string; title: string }[], maxHeightOverride?: number) => {
      const dims = await Promise.all(items.map(it => new Promise<{ w: number; h: number }>(res => {
        const im = new window.Image();
        im.onload = () => res({ w: im.width, h: im.height });
        im.src = it.dataUrl;
      })));
      const gap = 24;
      const n = items.length;
      const colW = (contentWidth - gap * (n - 1)) / n;
      const maxH = Math.min(maxHeightOverride ?? Infinity, pageHeight - 2 * margin - 60);
      const sized = dims.map(d => {
        let w = colW;
        let h = (d.h / d.w) * w;
        if (h > maxH) { h = maxH; w = (d.w / d.h) * h; }
        return { w, h };
      });
      const rowH = Math.max(...sized.map(s => s.h));
      const titleH = 20;
      checkPageBreak(rowH + titleH + 24);
      const rowTop = y;
      items.forEach((it, i) => {
        const colX = margin + i * (colW + gap);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...BRAND);
        pdf.text(it.title, colX, rowTop + 12);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        const imgX = colX + (colW - sized[i].w) / 2;
        pdf.addImage(it.dataUrl, 'PNG', imgX, rowTop + titleH, sized[i].w, sized[i].h);
      });
      y = rowTop + titleH + rowH + 16;
    };

    // Helper function to add regular text
    const addText = (text: string, size = 10, indent = 0) => {
      checkPageBreak(20);
      pdf.setFontSize(size);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(text, contentWidth - indent);
      pdf.text(lines, margin + indent, y);
      y += (lines.length * size * 1.2) + 5;
    };

    // Helper function to add spacing
    const addSpacing = (space: number) => {
      y += space;
    };

    // 1. COVER-BAND + TITEL
    pdf.setFillColor(...BRAND);
    pdf.rect(0, 0, pageWidth, 80, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('pdf.title'), margin, 42);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    pdf.text(tr('pdf.createdAt', { date: dateStr }), margin, 64);
    // ONCOnnect logo on the right of the cover band
    if (onconnectLogo) {
      try {
        const props = pdf.getImageProperties(onconnectLogo);
        const logoH = 36;
        const logoW = (props.width / props.height) * logoH;
        pdf.addImage(onconnectLogo, 'PNG', pageWidth - margin - logoW, 22, logoW, logoH);
      } catch {}
    }
    pdf.setTextColor(0, 0, 0);
    y = 100;

    // 2. FILTER UND DIAGNOSE-ZUSAMMENFASSUNG
    addSectionTitle(tr('pdf.analysisParams'), 12);
    
    {
      const stratLabel = stratificationConfig.criterion === 'none'
        ? tr('pdf.noStratification')
        : stratificationConfig.criterion.startsWith('extra:')
          ? stratificationConfig.criterion.slice('extra:'.length)
          : (t.has(stratificationConfig.criterion) ? t(stratificationConfig.criterion) : stratificationConfig.criterion);
      const metaRows: [string, string][] = [
        [tr('summary.diagnosis'), String(diagnose)],
        [tr('summary.timeRange'), String(zeitraum)],
        [tr('summary.stratification'), String(stratLabel)],
        [tr('pdf.stats.n'), String(endpunktKohorte.length)],
        [tr('pdf.stats.events'), String(endpunktKohorte.filter(p => p.event).length)],
      ];
      if (pValue !== null) metaRows.push([tr('summary.pValue'), pValue > 0.001 ? pValue.toFixed(4) : '<0.001']);
      addKeyValueBox(metaRows);
    }

    // Angewendete Filter
    if (hasActiveFilters) {
      addSectionTitle(tr('pdf.appliedFilters'), 11);
      
      buildActiveFilterLines(yearRange).forEach(line => addText(line, 9, 10));

      y += 10;
    }

    // 2b. SURVIVAL STATISTICS (text-based, independent of DOM)
    if (survivalCurves.length > 0) {
      addSectionTitle(tr(kurvenSchaetzer === "kumulativeInzidenz" ? 'pdf.statsTitleIncidence' : 'pdf.statsTitle'), 12);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const statCols = [
        { key: 'group',  label: tr('pdf.stats.group'),  width: 160 },
        { key: 'n',      label: tr('pdf.stats.n'),      width: 50,  align: 'right' as const },
        { key: 'events', label: tr('pdf.stats.events'), width: 70,  align: 'right' as const },
        { key: 'median', label: tr(kurvenSchaetzer === "kumulativeInzidenz" ? 'pdf.stats.medianIncidence' : 'pdf.stats.median'), width: 90,  align: 'right' as const },
      ];
      const statTableWidth = statCols.reduce((s, c) => s + c.width, 0);
      const statStartX = margin + (contentWidth - statTableWidth) / 2;
      let sx = statStartX;
      statCols.forEach(c => {
        pdf.text(c.label, c.align === 'right' ? sx + c.width - 4 : sx + 4, y, c.align ? { align: c.align } : undefined);
        sx += c.width;
      });
      y += 10;
      pdf.setDrawColor(...RULE);
      pdf.line(statStartX, y, statStartX + statTableWidth, y);
      y += 16; // more breathing room between header rule and the numbers
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      for (const curve of survivalCurves) {
        checkPageBreak(15);
        const data = curve.data ?? [];
        const n = (curveCounts as any)?.[curve.name]?.n ?? data.length;
        const events = (curveCounts as any)?.[curve.name]?.events ?? 0;
        // Bei der kumulativen Inzidenz steigt die Kurve von null: der erste
        // Punkt läge unter 0,5 und stünde hier als Median. Eine Rate hat keinen.
        const medianPoint = (data[0] as any)?.cumulativeIncidence
          ? undefined
          : data.find((d: any) => d.probability <= 0.5);
        const medianStr = medianPoint ? `${medianPoint.time.toFixed(1)} ${zeitLabel}` : tr('pdf.medianNotReached');
        sx = statStartX;
        const cells = [curve.name, String(n), String(events), medianStr];
        statCols.forEach((c, i) => {
          const txt = pdf.splitTextToSize(cells[i] ?? '-', c.width - 8)[0];
          pdf.text(txt, c.align === 'right' ? sx + c.width - 4 : sx + 4, y, c.align ? { align: c.align } : undefined);
          sx += c.width;
        });
        y += 15;
      }
      // Log-rank p and median follow-up in a centred blue band
      y += 14;
      {
        const band: [string, string][] = [];
        if (pValue !== null) band.push([tr('pdf.logRankLabel'), pValue > 0.001 ? pValue.toFixed(4) : '<0.001']);
        if (reverseKM.median !== null) band.push([tr('pdf.medianFollowUpLabel'), `${reverseKM.median.toFixed(1)} ${zeitLabel}`]);
        // Nachbeobachtung und mediane ereignisfreie Zeit nach der Boxvorschrift,
        // auf derselben Kohorte wie die Kurve und Kurventabelle darüber.
        const kennzahlen = kennzahlenFuerKurve(endpunktKohorte, zeitEinheit, kurvenSchaetzer);
        if (kennzahlen.nachbeobachtung) {
          band.push([
            `${tr('followUp.durationLabel')} (${tr('followUp.medianAbbr')})`,
            `${kennzahlen.nachbeobachtung.median.toFixed(1)} ${zeitLabel}`,
          ]);
          band.push([
            tr('followUp.eventFreeLabel'),
            kennzahlen.medianOhneEreignis !== null
              ? `${kennzahlen.medianOhneEreignis.toFixed(1)} ${zeitLabel}`
              : tr('pdf.medianNotReached'),
          ]);
        }
        addInfoBand(band);
      }

      // Kennzahlen der Box: die Aufstellung, die das Auswertungsblatt neben
      // der Kurve verlangt. Nur bei einer OncoBox-Kohorte, und nur dann mit
      // Zahlen, wenn es für dieses Paar aus Box und Endpunkt ein Blatt gibt.
      if (oncoBoxProfileId) {
        addSectionTitle(tBox('title'), 12);
        if (!boxAufstellung) {
          addText(tBox('noSpec'), 9);
        } else {
          const a = boxAufstellung;
          const anteil = (wert: number): string =>
            a.primaerfaelle > 0 ? `${((wert / a.primaerfaelle) * 100).toFixed(1)}%` : '0.0%';
          const zeilen: string[] = [
            `${tBox('primaryCases')}: ${a.primaerfaelle} (100.0%)`,
            ...a.ausschluesse.map((aus) =>
              `- ${tBox(`exclusion.${aus.grund}`)}: ${aus.anzahl} (${anteil(aus.anzahl)})`),
            `= ${tBox('atRisk')}: ${a.unterRisiko} (${anteil(a.unterRisiko)})`,
            `${tBox('withEvent')}: ${a.mitEreignis} (${anteil(a.mitEreignis)})`,
          ];
          if (a.konkurrenzereignis > 0) {
            zeilen.push(`${tBox('competingEvent')}: ${a.konkurrenzereignis} (${anteil(a.konkurrenzereignis)})`);
          }
          zeilen.push(`${tBox('censoredAlive')}: ${a.zensiertLebend} (${anteil(a.zensiertLebend)})`);
          if (a.zensiertVerstorben > 0) {
            zeilen.push(`${tBox('censoredDeceased')}: ${a.zensiertVerstorben} (${anteil(a.zensiertVerstorben)})`);
          }
          if (a.ohneBewertung > 0) {
            zeilen.push(`${tBox('unrated')}: ${a.ohneBewertung} (${anteil(a.ohneBewertung)})`);
          }
          for (const zeile of zeilen) addText(zeile, 9, 4);
          addText(tBox('cohortNote'), 8, 4);
        }
      }

      // Patient table is omitted entirely for the "noPatients" export mode, so the
      // patient-table section below never renders. Explain the omission here instead.
      if (mode === 'noPatients') {
        addText(tr('export.noteNoPatients'), 8, 4);
      }

      // 2b-2. POST-HOC PAIRWISE COMPARISONS
      // The global p-value above only says that some group differs. Without the
      // pairwise breakdown a report reader cannot tell which groups that is.
      if (pairwiseResults.length > 0) {
        checkPageBreak(60);
        y += 6;
        addSectionTitle(tr('pairwise.title'), 11);
        const pwCols = [
          { key: 'a',    label: tr('pairwise.groupA'),    width: 150 },
          { key: 'b',    label: tr('pairwise.groupB'),    width: 150 },
          { key: 'p',    label: tr('pairwise.pRaw'),      width: 80, align: 'right' as const },
          { key: 'padj', label: tr('pairwise.pAdjusted'), width: 80, align: 'right' as const },
        ];
        const pwWidth = pwCols.reduce((s, c) => s + c.width, 0);
        const pwStartX = margin + (contentWidth - pwWidth) / 2;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        let px = pwStartX;
        pwCols.forEach(c => {
          pdf.text(c.label, c.align === 'right' ? px + c.width - 4 : px + 4, y, c.align ? { align: c.align } : undefined);
          px += c.width;
        });
        y += 10;
        pdf.setDrawColor(...RULE);
        pdf.line(pwStartX, y, pwStartX + pwWidth, y);
        y += 16;
        pdf.setFont('helvetica', 'normal');
        const fmtP = (v: number) => (v > 0.001 ? v.toFixed(4) : '<0.001');
        for (const row of pairwiseResults) {
          checkPageBreak(15);
          px = pwStartX;
          const cells = [row.groupA, row.groupB, fmtP(row.pValue), fmtP(row.pValueAdjusted)];
          pwCols.forEach((c, i) => {
            const txt = pdf.splitTextToSize(cells[i] ?? '-', c.width - 8)[0];
            pdf.text(txt, c.align === 'right' ? px + c.width - 4 : px + 4, y, c.align ? { align: c.align } : undefined);
            px += c.width;
          });
          y += 15;
        }
        addText(tr('pairwise.caption', { count: pairwiseResults.length }), 8, 4);
      }
    }

    // 2c. COX MODEL SUMMARY (text-based, independent of DOM)
    //
    // Anzeigename statt technischer Kennung, wie in den übrigen Abschnitten:
    // der Cox-Teil trug bisher "adult", wo die Kurventabelle darüber
    // "Erwachsen" schrieb.
    const coxGruppenName = (id: string) =>
      cleanLabel(activeGroups.find(g => g.id === id)?.name ?? id);
    if (coxSummary && coxSummary.results.length > 0) {
      checkPageBreak(80);
      addSectionTitle(tr('pdf.coxSummaryTitle'), 12);
      const lrP = coxSummary.modelStats.likelihoodRatioTest.pValue;
      const lrPStr = lrP > 0.001 ? lrP.toFixed(4) : '<0.001';
      addInfoBand([
        // Anzeigename wie in den übrigen Abschnitten, nicht die technische
        // Kennung der Stratifizierung.
        [tCox('stats.reference'), coxGruppenName(coxSummary.referenceGroup)],
        [tCox('stats.ties'), coxSummary.modelStats.tiesMethod],
        [tCox('stats.concordance'), coxSummary.modelStats.concordance.toFixed(3)],
        [tCox('stats.likelihoodRatio'), lrPStr],
      ]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      const coxCols = [
        { key: 'group', label: tr('pdf.cox.group'), width: 140 },
        { key: 'hr',    label: tr('pdf.cox.hr'),    width: 70,  align: 'right' as const },
        { key: 'ci',    label: tr('pdf.cox.ci'),    width: 120, align: 'right' as const },
        { key: 'p',     label: tr('pdf.cox.p'),     width: 60,  align: 'right' as const },
      ];
      const coxTableWidth = coxCols.reduce((s, c) => s + c.width, 0);
      const coxStartX = margin + (contentWidth - coxTableWidth) / 2;
      let cx = coxStartX;
      coxCols.forEach(c => {
        pdf.text(c.label, c.align === 'right' ? cx + c.width - 4 : cx + 4, y, c.align ? { align: c.align } : undefined);
        cx += c.width;
      });
      y += 10;
      pdf.setDrawColor(...RULE);
      pdf.line(coxStartX, y, coxStartX + coxTableWidth, y);
      y += 16;
      pdf.setFont('helvetica', 'normal');
      for (const r of coxSummary.results) {
        checkPageBreak(15);
        // Zero-event group: HR/CI/p are not identifiable (complete separation) -
        // print the "not estimable" text instead of the optimiser's arbitrary
        // stopping point.
        const hrStr = r.notEstimable ? tCox('notEstimable') : (r.hazardRatio === 1 ? '1 (Ref.)' : r.hazardRatio.toFixed(3));
        const ciStr = r.notEstimable ? tCox('notEstimable') : (r.hazardRatio === 1 ? '-' : `${r.ciLower.toFixed(2)} - ${r.ciUpper.toFixed(2)}`);
        const pStr = r.notEstimable ? tCox('notEstimable') : (r.hazardRatio === 1 ? '-' : (r.pValue > 0.001 ? r.pValue.toFixed(4) : '<0.001'));
        cx = coxStartX;
        const cells = [coxGruppenName(r.group), hrStr, ciStr, pStr];
        coxCols.forEach((c, i) => {
          const txt = pdf.splitTextToSize(cells[i] ?? '-', c.width - 8)[0];
          pdf.text(txt, c.align === 'right' ? cx + c.width - 4 : cx + 4, y, c.align ? { align: c.align } : undefined);
          cx += c.width;
        });
        y += 15;
      }
      y += 12;
    }

    // 3. KAPLAN-MEIER-PLOT (Plotly toImage)
    checkPageBreak(440); // keep title + header band + plot together
    addSectionTitle(tr('pdf.kmCurveTitle'));

    // KM-Header-Band: spiegelt die Info-Karte ueber dem Plot (Diagnose,
    // Zeitraum, Stratifizierung, p-Wert, Report-Datum) als kompakte Leiste.
    {
      const stratLabel = stratificationConfig.criterion === 'none'
        ? tr('notAvailableShort')
        : stratificationConfig.criterion.startsWith('extra:')
          ? stratificationConfig.criterion.slice('extra:'.length)
          : (t.has(stratificationConfig.criterion) ? t(stratificationConfig.criterion) : stratificationConfig.criterion);
      const pStr = pValue !== null ? (pValue > 0.001 ? pValue.toFixed(3) : '<0.001') : tr('summary.pValueUnavailable');
      const items: [string, string][] = [
        [tr('summary.diagnosis'), String(diagnose)],
        [tr('summary.timeRange'), String(zeitraum)],
        [tr('summary.stratification'), String(stratLabel)],
        [tr('summary.pValue'), String(pStr)],
        [tr('summary.reportDate'), dateStr],
      ];
      const bandH = 34;
      checkPageBreak(bandH + 8);
      pdf.setFillColor(245, 247, 250);
      pdf.setDrawColor(...RULE);
      pdf.roundedRect(margin, y, contentWidth, bandH, 4, 4, 'FD');
      const cellW = contentWidth / items.length;
      items.forEach(([label, val], i) => {
        const cx = margin + i * cellW + cellW / 2;
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...MUTED);
        pdf.text(pdf.splitTextToSize(label, cellW - 8)[0], cx, y + 13, { align: 'center' });
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(pdf.splitTextToSize(val, cellW - 8)[0], cx, y + 26, { align: 'center' });
      });
      pdf.setFont('helvetica', 'normal');
      y += bandH + 12;
    }

    // Suche nach dem Plotly-Div f├╝r den Kaplan-Meier Plot
    const plotlyDiv = chartRef.current?.querySelector('.js-plotly-plot, [data-plotly="true"]') as any;
    
    if (plotlyDiv && typeof window !== 'undefined' && (window as any).Plotly) {
      try {
        const Plotly = (window as any).Plotly;
        // Exportiere Plot als PNG mit hoher Aufl├Âsung
        const kmPng = await Plotly.toImage(plotlyDiv, {
          format: 'png',
          width: 1200,
          height: 600,
          scale: 2
        });
        
        const img = new window.Image();
        img.src = kmPng;
        await new Promise(res => { img.onload = res; });
        const maxH = pageHeight - 2 * margin - 44;
        let imgWidth = contentWidth;
        let imgHeight = (img.height / img.width) * imgWidth;
        if (imgHeight > maxH) { imgHeight = maxH; imgWidth = (img.width / img.height) * imgHeight; }
        checkPageBreak(imgHeight + 12);
        pdf.addImage(kmPng, 'PNG', margin + (contentWidth - imgWidth) / 2, y, imgWidth, imgHeight);
        y += imgHeight + 16;
      } catch (error) {
        addText(tr('pdf.errors.kmPlot', { message: (error as Error).message }), 9);
      }
    } else {
      addText(tr('pdf.errors.plotlyMissing'), 9);
    }
    
    // 4. AT-RISK-PLOT (Plotly toImage)
    // Suche nach dem zweiten Plotly-Div (At-Risk Plot)
    const allPlotlyDivs = chartRef.current?.querySelectorAll('.js-plotly-plot, [data-plotly="true"]');
    
    if (allPlotlyDivs && allPlotlyDivs.length > 1 && typeof window !== 'undefined' && (window as any).Plotly) {
      const atRiskDiv = allPlotlyDivs[1] as any;
      
      try {
        const Plotly = (window as any).Plotly;
        const atRiskPng = await Plotly.toImage(atRiskDiv, { format: 'png', width: 1200, height: 300, scale: 2 });
        await placeImage(atRiskPng, tr('pdf.patientsAtRisk'));
      } catch (error) {
        addText(tr('pdf.errors.atRiskPlot', { message: (error as Error).message }), 9);
      }
    }

    // 4b. LANDMARK-UEBERLEBENSRATEN (1/3/5 Jahre) - aus den Kurven berechnet,
    // identisch zur On-Page LandmarkSurvivalTable.
    if (activeCurves.length > 0) {
      const LM_MONTHS = [12, 36, 60];
      const fmtPct = (v: number) => (isFinite(v) ? `${(v * 100).toFixed(1)}%` : '-');
      const lmRows = activeCurves.map((curve) => {
        const withCI = computeKaplanMeierCI(curve.data as SurvivalDataPoint[]);
        const pts = computeKMAtTimepoints(withCI, LM_MONTHS);
        const maxObs = withCI.length > 0 ? withCI[withCI.length - 1].time : 0;
        return {
          name: cleanLabel(curve.name),
          cells: pts.map((p, i) => LM_MONTHS[i] > maxObs
            ? '-'
            : `${fmtPct(p.survival)} (${fmtPct(p.ciLower95)}-${fmtPct(p.ciUpper95)})`),
        };
      });
      checkPageBreak(60 + lmRows.length * 14);
      addSectionTitle(tLm(kurvenSchaetzer === "kumulativeInzidenz" ? 'titleIncidence' : 'title'), 12);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const lmCols = [
        { label: tLm('stratum'),   width: 150, align: 'left' as const },
        { label: tLm('oneYear'),   width: 120, align: 'right' as const },
        { label: tLm('threeYear'), width: 120, align: 'right' as const },
        { label: tLm('fiveYear'),  width: 120, align: 'right' as const },
      ];
      const lmTableWidth = lmCols.reduce((s, c) => s + c.width, 0);
      const lmStartX = margin + (contentWidth - lmTableWidth) / 2;
      let lx = lmStartX;
      lmCols.forEach(c => {
        pdf.text(c.label, c.align === 'right' ? lx + c.width - 4 : lx + 4, y, { align: c.align });
        lx += c.width;
      });
      y += 10;
      pdf.setDrawColor(...RULE);
      pdf.line(lmStartX, y, lmStartX + lmTableWidth, y);
      y += 16;
      pdf.setFont('helvetica', 'normal');
      for (const row of lmRows) {
        checkPageBreak(15);
        lx = lmStartX;
        const cells = [row.name, ...row.cells];
        lmCols.forEach((c, i) => {
          const txt = pdf.splitTextToSize(cells[i] ?? '-', c.width - 8)[0];
          pdf.text(txt, c.align === 'right' ? lx + c.width - 4 : lx + 4, y, { align: c.align });
          lx += c.width;
        });
        y += 13;
      }
      pdf.setFontSize(7);
      pdf.setTextColor(...MUTED);
      addText(tLm('hint'), 7);
      pdf.setTextColor(0, 0, 0);
      y += 8;
    }

    // 5. COX PROPORTIONAL HAZARDS ANALYSE - FOREST PLOT
    // Built from coxSummary via the shared SVG builder rather than scraped from
    // the DOM. The on-page Cox forest plot is plain HTML/flexbox (no canvas, no
    // SVG node), so canvas.toDataURL and dom-to-image both failed previously.
    if (coxSummary && coxSummary.results.length > 0) {
      try {
        const { svg, width: svgW, height: svgH } = buildCoxForestSvg(
          coxSummary.results,
          activeGroups,
          { title: '', dark: false, notEstimableLabel: tCox('notEstimable'), notEstimableShort: tCox('notEstimableShort') }, // section heading already labels this
        );
        const coxPng = await svgToPngDataUrl(svg, svgW, svgH, 2);
        await placeImage(coxPng, tr('pdf.coxForestTitle'));
      } catch {
        addSectionTitle(tr('pdf.coxForestTitle'));
        addText(tr('pdf.errors.coxPlot'), 9);
        y += 20;
      }
    }

    // Cox Tabelle - aus dem gerenderten DOM gescrapt
    const coxContainer = document.querySelector('[data-cox-analysis]') as HTMLElement | null;
    if (coxContainer) {
      const coxTable = coxContainer.querySelector('table') as HTMLTableElement | null;
      if (coxTable) {
        checkPageBreak(180);
        addSectionTitle(tr('pdf.coxTableTitle'), 12);
        addSpacing(15); // Mehr Abstand nach dem Titel
        
        try {
          // Extrahiere Tabellendaten
          const rows = Array.from(coxTable.querySelectorAll('tbody tr'));
          
          // Tabellenkopf
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          const colWidths = [150, 50, 70, 80]; // Gruppe, n, Ereignisse, HR, p-Wert
          const headers = [tr('pdf.table.group'), tr('pdf.table.n'), tr('pdf.table.events'), tr('pdf.table.hazardRatio'), tr('pdf.table.pValue')];
          const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
          const tableStartX = margin + (contentWidth - tableWidth) / 2; // Zentriert
          let xPos = tableStartX;
          
          headers.forEach((header, idx) => {
            const width = colWidths[idx] || 80;
            pdf.text(header, xPos + 2, y);
            xPos += width;
          });
          y += 15;
          
          // Trennlinie
          pdf.setLineWidth(0.5);
          pdf.line(tableStartX, y, tableStartX + tableWidth, y);
          y += 10; // Mehr Abstand zwischen Kopfzeile und erstem Eintrag
          
          // Tabellenzeilen
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          
          for (const row of rows) {
            if (checkPageBreak(20)) {
              // Kopfzeile auf neuer Seite wiederholen
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(9);
              xPos = tableStartX;
              headers.forEach((header, idx) => {
                const width = colWidths[idx] || 80;
                pdf.text(header, xPos + 2, y);
                xPos += width;
              });
              y += 15;
              pdf.line(tableStartX, y, tableStartX + tableWidth, y);
              y += 10; // Auch hier mehr Abstand
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8);
            }
            
            const cells = Array.from(row.querySelectorAll('td'));
            xPos = tableStartX;
            
            cells.forEach((cell, idx) => {
              const width = colWidths[idx] || 80;
              const text = cell.textContent?.trim() || '-';
              const truncated = pdf.splitTextToSize(text, width - 4);
              pdf.text(truncated[0], xPos + 2, y);
              xPos += width;
            });
            
            y += 14; // Etwas mehr Zeilenabstand
          }
          
          y += 15; // Mehr Abstand nach der Tabelle
        } catch {
          addText(tr('pdf.errors.coxTable'), 9);
        }
      }
    }

    // 6. STATISTIKEN & KOHORTENGRÖSZEN. KPI-Kacheln und Tortendiagramm werden
    // getrennt eingefangen (das breite 3-Spalten-Grid machte die runde Pie mit
    // viel Leerraum winzig), aber mit gedeckelter Höhe, damit beide zusammen auf
    // EINE Seite passen.
    if (cohortKpiRef.current && cohortPieRef.current) {
      try {
        const kpiUrl = await captureCleanNode(cohortKpiRef.current, 'png');
        const pieUrl = await captureCleanNode(cohortPieRef.current, 'png');
        await placeImagesRow([
          { dataUrl: kpiUrl, title: tr('pdf.cohortSizes') },
          { dataUrl: pieUrl, title: tr('statsCard.cohortShare') },
        ], 300);
      } catch {}
    } else if (cohortPieRef.current) {
      try {
        const dataUrl = await captureCleanNode(cohortPieRef.current, 'png');
        await placeImage(dataUrl, tr('statsCard.cohortShare'), 320);
      } catch {}
    }

    // 7. PATIENTENDATEN-TABELLE (optional, je nach im Popover gewaehltem Export-Modus)
    if (incPatientTable) {
    pdf.addPage();
    y = margin + 24;
    drawPageHeader();
    addSectionTitle(tr('pdf.patientTableTitle'));
    if (mode === 'pseudonymized') {
      addText(tr('export.noteAnonymized'), 8, 0);
      addText(tr('export.noteOriginalData'), 8, 0);
      addText(tr('export.noteYearBoundary'), 8, 0);
    }
    addSpacing(10); // Abstand nach dem Titel

    const tableData = applyExportMode(filteredSortedTableData as SurvivalTableRow[], mode) as any[];
    const maxRows = 30; // Maximal 30 Zeilen pro Seite
    const colNames = Object.keys(tableColumns);
    // Die Spalte months trägt bei einer Boxkohorte Tage. Dasselbe Etikett wie
    // in der Tabelle auf dem Bildschirm, sonst stünde hier das Monatswort
    // über Tageswerten.
    const spaltenTitel = (col: string) => (col === "months" ? zeitLabel : tableColumns[col] || col);
    const zellText = (row: Record<string, unknown>, col: string): string => {
      if (col === 'events' || col === 'primaryCase') return row[col] ? tr('yes') : tr('no');
      // Datumsspalten bleiben, wie sie sind: formatDate hat sie beim Aufbau
      // der Zeilen schon in der Sprache der Oberfläche geschrieben, wie auf
      // dem Bildschirm und in Excel. Hier stand vorher ein zweites Einlesen
      // mit new Date(). Das liest "7.1.2022" amerikanisch als 1. Juli und
      // scheitert an "14.3.2021", das PDF zeigte also teils vertauschte,
      // teils unveränderte Daten.
      return String(row[col] ?? '-');
    };

    // Jede Spalte vermessen: die längste Zelle und das längste Wort aus
    // Überschrift und Zellen, jeweils in der Schrift, in der es gezeichnet wird.
    pdf.setFontSize(8);
    const bedarf: Record<string, SpaltenBedarf> = {};
    const laengstesWort = (text: string) => Math.max(0, ...text.split(/\s+/).map(w => pdf.getTextWidth(w)));
    pdf.setFont('helvetica', 'bold');
    for (const col of colNames) bedarf[col] = { inhalt: 0, wort: laengstesWort(spaltenTitel(col)) };
    pdf.setFont('helvetica', 'normal');
    for (const row of tableData) {
      for (const col of colNames) {
        const text = zellText(row, col);
        bedarf[col].inhalt = Math.max(bedarf[col].inhalt, pdf.getTextWidth(text));
        bedarf[col].wort = Math.max(bedarf[col].wort, laengstesWort(text));
      }
    }
    const colWidths = spaltenbreiten(colNames, bedarf, contentWidth);
    const patientTableWidth = colNames.reduce((sum, col) => sum + colWidths[col], 0);
    const patientTableStartX = margin + (contentWidth - patientTableWidth) / 2; // Zentriert
    const zeilenAbstand = pdf.getFontSize() * pdf.getLineHeightFactor();

    // Kopfzeile, auf jeder Seite der Tabelle wiederholt. Ihre Höhe folgt der
    // längsten Überschrift, seit schmale Spalten diese umbrechen können.
    const tabellenkopf = () => {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      let x = patientTableStartX;
      let meisteZeilen = 1;
      colNames.forEach(col => {
        const kopfZeilen = pdf.splitTextToSize(spaltenTitel(col), colWidths[col] - 4);
        pdf.text(kopfZeilen, x + 2, y);
        meisteZeilen = Math.max(meisteZeilen, kopfZeilen.length);
        x += colWidths[col];
      });
      y += 15 + (meisteZeilen - 1) * zeilenAbstand;
      pdf.setLineWidth(0.5);
      pdf.line(patientTableStartX, y, patientTableStartX + patientTableWidth, y);
      y += 10; // Mehr Abstand zwischen Kopfzeile und erster Zeile
      pdf.setFont('helvetica', 'normal');
    };
    tabellenkopf();

    // Tabellenzeilen. Zellen brechen um, statt abgeschnitten zu werden: aus
    // "TCGA-3C-AAAU" wurde vorher "TCGA-3C-AAA", und die Zeile liess sich
    // keinem Patienten mehr sicher zuordnen.
    let rowCount = 0;
    for (const row of tableData) {
      const zellen = colNames.map(col => pdf.splitTextToSize(zellText(row, col), colWidths[col] - 4));
      const hoehe = 12 + (Math.max(...zellen.map(z => z.length)) - 1) * zeilenAbstand;

      if (rowCount >= maxRows || y + hoehe > pageHeight - margin - 15) {
        pdf.addPage();
        y = margin + 24;
        drawPageHeader();
        tabellenkopf();
        rowCount = 0;
      }

      let xPos = patientTableStartX;
      colNames.forEach((col, i) => {
        pdf.text(zellen[i], xPos + 2, y);
        xPos += colWidths[col];
      });
      y += hoehe;
      rowCount++;
    }
    } // end if (incPatientTable)

    // Header (page X/Y top-right) + branded footer on every page (cover keeps its banner)
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      // Top-right page indicator (skip on cover page since the banner is there)
      if (i > 1) {
        pdf.setTextColor(...MUTED);
        pdf.text(tr('pdf.pageOf', { page: i, total: totalPages }), pageWidth - margin, 24, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
      }
      // Bottom footer: slim brand bar (like the page-1 header band, thinner)
      const footerH = 22;
      pdf.setFillColor(...BRAND);
      pdf.rect(0, pageHeight - footerH, pageWidth, footerH, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text('ONCOcurve', margin, pageHeight - footerH / 2 + 3);
      pdf.text(tr('pdf.footer', { date: dateStr }), pageWidth - margin, pageHeight - footerH / 2 + 3, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }

    // Filename reflects the analysis: <cohort>-<selection>-<date>.pdf
    {
      const stratSel = stratificationConfig.criterion === 'none'
        ? tr('overallSurvivalLabel')
        : stratificationConfig.criterion.startsWith('extra:')
          ? stratificationConfig.criterion.slice('extra:'.length)
          : (t.has(stratificationConfig.criterion) ? t(stratificationConfig.criterion) : stratificationConfig.criterion);
      const slug = (s: string) => String(s ?? '')
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      const parts = [slug(diagnose), slug(stratSel), dateStr.replace(/\./g, '-')].filter(Boolean);
      const pdfModeSuffix = mode === 'pseudonymized'
        ? `-${tr('export.suffixPseudonymized')}`
        : mode === 'noPatients'
          ? `-${tr('export.suffixNoPatients')}`
          : '';
      pdf.save(`${parts.join('_') || tr('pdf.fileName', { date: dateStr.replace(/\./g, '-') })}${pdfModeSuffix}.pdf`);
    }
  };

  useEffect(() => {
    function computeLeft() {
      if (!isSidebarOpen) return 12; // knapp am linken Rand
      const isLg = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
      const sidebarWidth = isLg ? 320 : 288; // lg:w-80 vs w-72
      const gap = 24; // gap-6
      const margin = 48; // Buttonbreite+Abstand, damit links von der grauen Linie
      return Math.max(8, sidebarWidth + gap - margin);
    }
    setToggleLeft(computeLeft());
    const onResize = () => setToggleLeft(computeLeft());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isSidebarOpen]);

  const defaultFilters: FilterState = {
    selectedGender: [],
    selectedAgeGroup: [],
    selectedICD10Codes: [],
    selectedTumorCategories: [],
    selectedStaging: [],
    selectedGrading: [],
    selectedYearRange: { start: null, end: null },
    selectedPrimaryCase: [],
    selectedSpreadCategory: []
  };

  // Basic filters for data filtering (not for stratification). Always start
  // from the deterministic defaults (matches server-rendered markup, avoids
  // a hydration mismatch) and restore the previous selection from
  // sessionStorage right after mount — client-only, never leaves the
  // browser — so a language switch (which remounts this page via the
  // /[locale]/ route segment) doesn't drop it back to the defaults.
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    setFilters(readSessionJSON("km-filters", defaultFilters));
  }, []);

  // Persist on every *user-driven* filter change via this wrapper — not via a
  // plain `useEffect(() => sessionStorage.setItem(...), [filters])`. That
  // pattern raced with the restore effect above: in dev, React's Strict Mode
  // double-invokes effects on mount, so the persist-effect's first pass would
  // fire with the stale pre-restore (default) `filters` closure and overwrite
  // the just-restored value in storage with the defaults; the second
  // simulated pass then read that overwrite back, permanently losing the
  // restored selection. Persisting inside the setter itself has no such
  // window — it always writes the value it's actually setting.
  const setFiltersPersisted = useCallback((update: React.SetStateAction<FilterState>) => {
    setFilters(prev => {
      const next = typeof update === "function" ? (update as (p: FilterState) => FilterState)(prev) : update;
      try {
        sessionStorage.setItem("km-filters", JSON.stringify(next));
      } catch {
        // sessionStorage full or unavailable -> selection just won't survive a remount
      }
      return next;
    });
  }, []);

  // Localized one-line-per-filter summary of the active sidebar filters.
  // Single source for every place that has to state which subset is being
  // shown: the PDF report and the exported figures. Exported images used to
  // carry no filter information at all, so a filtered figure was
  // indistinguishable from one covering the whole dataset.
  // Takes the cohort's year range as an argument (rather than closing over
  // `yearRange`, which is derived much further down) so it stays independent
  // of declaration order.
  const buildActiveFilterLines = useCallback((cohortYearRange: { min: number; max: number }): string[] => {
    const lines: string[] = [];
    if (filters.selectedGender.length > 0) {
      lines.push(tr('pdf.filters.gender', { value: filters.selectedGender.map(g => g === "male" ? t("male") : t("female")).join(", ") }));
    }
    if (filters.selectedAgeGroup.length > 0) {
      lines.push(tr('pdf.filters.ageGroup', { value: filters.selectedAgeGroup.map(age =>
        age === "child" ? tr("ageGroupChild") :
        age === "adult" ? tr("ageGroupAdult") : tr("ageGroupSenior")
      ).join(", ") }));
    }
    if (filters.selectedICD10Codes.length > 0) {
      lines.push(`ICD-10: ${filters.selectedICD10Codes.slice(0, 10).join(", ")}${filters.selectedICD10Codes.length > 10 ? ` +${filters.selectedICD10Codes.length - 10}` : ''}`);
    }
    if (filters.selectedTumorCategories.length > 0) {
      lines.push(tr('pdf.filters.tumorCategories', { value: filters.selectedTumorCategories.slice(0, 3).join(", "), extra: filters.selectedTumorCategories.length > 3 ? tr('pdf.filters.more', { count: filters.selectedTumorCategories.length - 3 }) : '' }));
    }
    if (filters.selectedStaging.length > 0) {
      lines.push(tr('pdf.filters.staging', { value: filters.selectedStaging.join(", ") }));
    }
    if (filters.selectedGrading.length > 0) {
      lines.push(tr('pdf.filters.grading', { value: filters.selectedGrading.join(", ") }));
    }
    if (filters.selectedPrimaryCase.length > 0) {
      lines.push(tr('pdf.filters.primaryCase', { value: filters.selectedPrimaryCase.map(pc => pc === "primary" ? tr("primary") : tr("notPrimary")).join(", ") }));
    }
    if (filters.selectedSpreadCategory.length > 0) {
      lines.push(tr('pdf.filters.spread', { value: filters.selectedSpreadCategory.join(", ") }));
    }
    if (filters.selectedYearRange.start || filters.selectedYearRange.end) {
      lines.push(tr('pdf.filters.diagnosisYears', { start: filters.selectedYearRange.start || cohortYearRange.min, end: filters.selectedYearRange.end || cohortYearRange.max }));
    }
    return lines;
  }, [filters, t, tr]);

  const [datasetHash, setDatasetHash] = useState<string>("");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = sessionStorage.getItem("km-dataset-hash") ?? "";
    setDatasetHash(h);
    setExcludedIds(loadExclusions(h));
  }, []);

  const updateExcluded = (next: Set<string>) => {
    setExcludedIds(next);
    if (datasetHash) saveExclusions(datasetHash, next);
  };

  // Anzahl der Befunde für den kompakten Hinweis oben auf der Seite; das
  // Panel selbst sitzt jetzt unter der Kurvenkarte. issues zählt über alle
  // vier Klassen, genau wie findingsCount im Panel selbst.
  const anomalyFindingsCount = useMemo(() => detectAnomalies(patients).issues.length, [patients]);
  // Erhöht bei Klick auf den Hinweis: das Panel öffnet sich dadurch, siehe
  // expandSignal in anomaly-panel.tsx.
  const [anomalyExpandSignal, setAnomalyExpandSignal] = useState(0);
  const scrollToAnomalyPanel = useCallback(() => {
    setAnomalyExpandSignal((s) => s + 1);
    document.getElementById("anomaly-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Default-Auswahl f├╝r Tumorkategorie beim ersten Laden
  React.useEffect(() => {
    
    
    if (filters.selectedTumorCategories.length === 0 && patients.length > 0) {
      // Find the category with the most patients using ICD-10 matching
      const categoryCounts: Record<string, number> = {};
      
      // Check solid tumor categories
      solidTumorCategoriesData.categories.forEach(category => {
        const count = patients.filter(patient => {
          const matches = patientMatchesCategory(patient, category.name);
          return matches;
        }).length;
        if (count > 0) {
          categoryCounts[category.name] = count;
        }
      });
      
      // Check hematological tumor categories
      hematologicalTumorCategoriesData.categories.forEach(category => {
        const count = patients.filter(patient => patientMatchesCategory(patient, category.name)).length;
        if (count > 0) {
          categoryCounts[category.name] = count;
        }
      });
      
      
      if (Object.keys(categoryCounts).length > 0) {
        // Find category with most patients
        const maxCount = Math.max(...Object.values(categoryCounts));
        const topCategories = Object.entries(categoryCounts)
          .filter(([_, count]) => count === maxCount)
          .map(([name]) => name);
        
        // Sort alphabetically and take the first one
        topCategories.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
        setFiltersPersisted(prev => ({ ...prev, selectedTumorCategories: [topCategories[0]] }));
      }
    }
  }, [patients]);

  // --- NEU: State f├╝r Suche und Sortierung der Survival-Tabelle ---
  const [searchText, setSearchText] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");

  const defaultStratificationConfig: StratificationConfig = {
    criterion: "none",  // Start with no stratification (Overall Survival)
    groups: [{
      id: "all",
      name: "Alle Patienten",
      color: CURVE_COLORS[0],
      enabled: true,
    }]
  };

  // Stratification configuration. Restored from sessionStorage after mount
  // for the same reason as `filters` above — see comment there, including why
  // persisting happens in the setter wrapper below rather than a plain
  // `useEffect(..., [stratificationConfig])`.
  const [stratificationConfig, setStratificationConfig] = useState<StratificationConfig>(defaultStratificationConfig);

  // Eine laufende Sitzung kann noch das alte Kriterium diseaseFreeSurvival
  // gespeichert haben. Es ist jetzt ein Endpunkt, deshalb wird es beim Laden
  // umgesetzt, statt die Auswahl auf ein Kriterium zeigen zu lassen, das es
  // nicht mehr gibt.
  useEffect(() => {
    const gespeichert = readSessionJSON<unknown>("km-stratification-config", null);
    const migriert = migriereStratifizierung(gespeichert);
    if (migriert.endpunkt) setEndpunktPersisted(migriert.endpunkt);
    const basis = {
      ...defaultStratificationConfig,
      ...(gespeichert as object),
      criterion: migriert.criterion as StratificationCriterion,
    };
    // Die gespeicherte Gruppenliste führt sonst weiter die alte DFS-Gruppe, zu
    // der keine Gruppenkennung mehr passt. Die Cox-Analyse filtert daraufhin
    // jeden Patienten weg, ohne das anzuzeigen.
    setStratificationConfig(
      migriert.gruppenZuruecksetzen
        ? { ...basis, groups: defaultStratificationConfig.groups }
        : basis,
    );
  }, [setEndpunktPersisted]);

  const setStratificationConfigPersisted = useCallback((update: React.SetStateAction<StratificationConfig>) => {
    setStratificationConfig(prev => {
      const next = typeof update === "function" ? (update as (p: StratificationConfig) => StratificationConfig)(prev) : update;
      try {
        sessionStorage.setItem("km-stratification-config", JSON.stringify(next));
      } catch {
        // sessionStorage full or unavailable -> selection just won't survive a remount
      }
      return next;
    });
  }, []);

  // NOTE: we used to wrap this setter in useTransition, but that made the radio
  // selection itself feel laggy — React deprioritised the criterion update so
  // the picker kept showing the old value until the worker finished.
  // The heavy downstream work (survivalTableData) is now driven by its own
  // deferred useEffect (rAF), so urgent setState here is fine again.

  // --- NEU: Spalten-Konfiguration f├╝r die Tabelle ---
  // F├╝r Export und Tabellenkopf: Spaltennamen als string
  // Dynamisch berechnet basierend auf der Stratifizierung
  // Fallnummern gibt es nur in OncoBox-Kohorten. Ohne sie bleibt die Spalte
  // weg, statt eine leere anzuzeigen.
  const zeigeFallnummer = useMemo(
    () => patients.some((patient) => Boolean(patient.oncoBox?.caseId)),
    [patients],
  );

  const tableColumns: Record<string, string> = useMemo(() => ({
    patientId: tr("table.patientId"),
    ...(zeigeFallnummer ? { caseId: tr("table.caseId") } : {}),
   // probability: "├£berlebenswahrscheinlichkeit",
   // atRisk: "Anzahl gef├ñhrdet",
    events: tr("table.events"),
    months: tr("table.months"),
    tCategory: tr("table.tCategory"),
    primaryCase: tr("table.primaryCase"),
    icd10: tr("table.icd10"),
    diagnosisDate: tr("table.diagnosisDate"),
    vitalDate: tr("table.vitalDate"),
    ...(stratificationConfig.criterion !== "none" ? {
      stratificationGroup: tr("table.stratificationGroup")
    } : {})
  }), [stratificationConfig.criterion, zeigeFallnummer]);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "patientId",
    direction: "asc",
  });

  // Stratifizierung basierend auf der automatisch ausgew├ñhlten Tumorkategorie
  React.useEffect(() => {
    if (patients.length > 0 && filters.selectedTumorCategories.length > 0 && stratificationConfig.groups.length === 0) {
      const selectedCategory = filters.selectedTumorCategories[0];
      
      // Generiere Gruppen f├╝r die ausgew├ñhlte Kategorie
      setStratificationConfigPersisted({
        criterion: "tumorCategory",
        groups: [{
          id: selectedCategory,
          name: selectedCategory,
          color: CURVE_COLORS[0],
          enabled: true,
        }]
      });
    }
  }, [patients, filters.selectedTumorCategories]);

  // Keep every group's colour + line style in sync with the selected palette.
  // The palette maps by group index, so this normalises groups regardless of
  // where they were built (this page vs. the stratification control) and gives
  // the grayscale palette its per-group dash pattern. Guarded so it settles in
  // one pass (returns the same config once nothing differs) — no render loop.
  React.useEffect(() => {
    setStratificationConfigPersisted((cfg) => {
      if (!cfg.groups || cfg.groups.length === 0) return cfg;
      let changed = false;
      const groups = cfg.groups.map((g, i) => {
        const { color, dash } = paletteEntry(plotDisplay.palette, i);
        if (g.color === color && g.dash === dash) return g;
        changed = true;
        return { ...g, color, dash };
      });
      return changed ? { ...cfg, groups } : cfg;
    });
  }, [plotDisplay.palette, stratificationConfig.groups]);

  // Apply the palette's colour + dash of a curve's group. The worker carries the
  // group colour but not the dash, and some grouping paths colour by index
  // internally; looking the group up here keeps line, markers and legend aligned
  // with the palette. Curves without a matching group (e.g. the single overall
  // curve) are left as-is (solid).
  const styleCurve = <C extends { id?: string; color: string; data: { events?: number }[] }>(curve: C) => {
    const g = stratificationConfig.groups.find((gr) => gr.id === curve.id);
    const styled = g ? { ...curve, color: g.color, dash: g.dash } : curve;
    // A stratum with real patients but zero events is a flat line at 1.0 that
    // has no median. It still counts in the log-rank test, so it stays
    // visible, but forcing it to a muted grey/dotted line (overriding the
    // palette colour, which is tuned for both themes, so a hardcoded light
    // grey would not be legible in dark mode) signals at a glance that it
    // does not carry its own event data.
    const hasEvents = curve.data.some((d: { events?: number }) => (d.events || 0) > 0);
    return hasEvents ? styled : { ...styled, color: '#9ca3af', dash: 'dot' };
  };

  const [error, setError] = useState<string | null>(null);

  // Nach Sidebar-Transition ein Resize-Event dispatchen, damit Plotly neu layoutet
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 220); // passt zu Tailwind duration-200
    return () => window.clearTimeout(timeout);
  }, [isSidebarOpen]);

  // Load data from sessionStorage on mount (with in-memory fallback)
  useEffect(() => {
    try {
      const storedPatients = sessionStorage.getItem("km-patients");
      const fromUpload = sessionStorage.getItem("km-from-upload");

      const hydratePatients = (data: any[]) => {
        const normalizeDate = (value: any) => toDateSafe(value) ?? null;

        const patientsWithDates = data.map((p: any) => {
          const diagnosisDateValue = p.diagnosisDate ?? p.diagnosisDateString ?? p.diagnosedatum;
          // Bewusst nur diese zwei Quellen. endedatum setzt der oBDS-Parser
          // ersatzweise auf das heutige Datum, wenn kein Sterbedatum vorliegt,
          // und zwar im Format d.m.yyyy, das die Datumsprüfung nicht erkennt.
          // Als Rückfallebene erfände das ein Vitaldatum, wo vorher keines war.
          const followupDateValue = p.followupDate ?? p.followupDateString;
          const dx = normalizeDate(diagnosisDateValue);
          const followup = normalizeDate(followupDateValue);
          const normalizedDiagnosisDate = normalizeIsoDate(diagnosisDateValue);
          const normalizedFollowupDate = normalizeIsoDate(followupDateValue);

          return {
            ...p,
            diagnosisDate: dx ?? (normalizedDiagnosisDate ? normalizedDiagnosisDate : undefined),
            // Precompute year here so we don't need a second setPatients pass
            // (which used to walk the whole cohort again after mount).
            diagnosisYear: dx ? dx.getFullYear() : (normalizedDiagnosisDate ? new Date(normalizedDiagnosisDate).getFullYear() : undefined),
            followupDate: followup,
            followupDateString: normalizedFollowupDate || p.followupDateString || null,
            therapieBeginn: normalizeDate(p.therapieBeginn),
            rezidivDatum: normalizeDate(p.rezidivDatum),
            metastasenDatum: normalizeDate(p.metastasenDatum),
            todDatum: normalizeDate(p.todDatum),
            nachsorgeDatum: normalizeDate(p.nachsorgeDatum),
            zweitterTumorDatum: normalizeDate(p.zweitterTumorDatum),
            gesamtbeurteilungErkrankung: p.gesamtbeurteilungErkrankung ?? null,
            verlauf_Lokaler_Tumorstatus: p.verlauf_Lokaler_Tumorstatus ?? null,
            verlauf_Regionaerer_Lymphknotenstatus: p.verlauf_Regionaerer_Lymphknotenstatus ?? null,
            verlauf_Fernmetastasen: p.verlauf_Fernmetastasen ?? null,
            residualstatus: p.residualstatus ?? null,
            // Dreiwertig lassen: undefined heißt "die Quelle sagt nichts
            // dazu" und muss von einem ausdrücklichen false unterscheidbar
            // bleiben, sonst sperrt sich jede CSV-Kohorte selbst aus.
            dfsEligible: normalisiereDfsEligible(p.dfsEligible),
          };
        });
        setPatients(patientsWithDates);
        if (fromUpload) {
          setIsGlobalLoading(false);
          setIsLoadingPlots(false);
          sessionStorage.setItem("km-suppress-next-spinner", "1");
          sessionStorage.removeItem("km-from-upload");
        }
      };

      if (storedPatients) {
        setTimeout(() => {
          try {
            hydratePatients(JSON.parse(storedPatients));
          } catch {
            setError(tr("errors.patientProcessing"));
          }
        }, 0);
        return;
      }

      // Fallback: in-memory cache (setzt die Upload-Seite vor Navigation)
      if (typeof window !== "undefined" && (window as any).__kmPatientsCache) {
        setTimeout(() => {
          hydratePatients((window as any).__kmPatientsCache as any[]);
        }, 0);
        return;
      }

      // If no data found at all, redirect back to main page
      router.push("/");
    } catch {
      setError(tr("errors.loadFailed"));
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("km-extra-columns");
      if (raw) {
        const parsed = JSON.parse(raw) as ExtraColumnsState;
        setExtraColumns(parsed);
      } else {
        setExtraColumns({ columns: {}, warnings: [] });
      }
    } catch {
      setExtraColumns({ columns: {}, warnings: [] });
    }
  }, []);

  // Neue Version: KM-Kurve an jedem Patientenzeitpunkt (Ereignis ODER Zensierung)
  // SurvivalData um Marker-Felder erweitern
  interface SurvivalDataWithMarker extends SurvivalData {
    event?: boolean;
    followupDate?: Date;
  }

  const calculateKaplanMeier = (
    patients: Patient[],
    survivalType: "overall" | "dfs" = "overall",
    dfsStartTime: "diagnosisDate" | "therapieBeginn" = "diagnosisDate"
  ): SurvivalDataWithMarker[] => {
    if (patients.length === 0) return [];

    // Wenn DFS, nutze DFS-Berechnung statt OAS
    if (survivalType === "dfs") {
      return calculateKaplanMeierDFS(patients, dfsStartTime);
    }

    // Original OAS-Logik
    // Wahrscheinlichkeit und Risikomenge kommen aus dem herausgelösten
    // Schätzer, damit sie testbar sind; die Zeile selbst trägt weiter die
    // Anzeigefelder, die nur diese Seite kennt.
    const sorted = patients.slice().sort((a, b) => (a.survivalTime ?? 0) - (b.survivalTime ?? 0));
    const punkte = sequentiellerSchaetzer(
      sorted.map((p) => ({ zeit: p.survivalTime ?? 0, ereignis: !!p.event })),
    );
    const result: SurvivalDataWithMarker[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const punkt = punkte[i];
      const tVal = p.staging?.tPathological || p.staging?.tClinical || tr("notAvailable");
      const diagDate = toDateSafe(p.diagnosisDate);
      let vitalDate: Date | undefined;
      const endStr = (p as any)?.endedatum as string | undefined;
      if (endStr && /\d{2}\.\d{2}\.\d{4}/.test(endStr) && !endStr.startsWith("00.00.0000")) {
        const [d, m, y] = endStr.split(".");
        vitalDate = toDateSafe(`${y}-${m}-${d}`);
      } else if (p.followupDateString) {
        vitalDate = toDateSafe(p.followupDateString);
      } else if (p.followupDate) {
        vitalDate = toDateSafe(p.followupDate);
      }
      result.push({
        time: punkt.zeit,
        probability: punkt.wahrscheinlichkeit,
        atRisk: punkt.unterRisiko,
        events: punkt.ereignis ? 1 : 0,
        patientId: p.id || tr("notAvailable"),
        icd10: p.tumorLocation || p.lokalisation || p.tumorType || "",
        tCategory: tVal,
        primaryCase: istPrimaerfall(p.primaerfall),
        diagnosisDate: toISOStringSafe(diagDate),
        vitalDate: toISOStringSafe(vitalDate),
        event: p.event,
        followupDate: toDateSafe(p.followupDate),
      });
    }
    return result;
  };

  /**
   * Berechnet Kaplan-Meier f├╝r Disease Free Survival
   * Nutzt die DFS-Berechnungslogik mit korrekter Kaplan-Meier-Formel
   */
  const calculateKaplanMeierDFS = (
    patients: Patient[],
    dfsStartTime: "diagnosisDate" | "therapieBeginn" = "diagnosisDate"
  ): SurvivalDataWithMarker[] => {
    if (patients.length === 0) return [];

    // Berechne DFS-Zeit f├╝r alle Patienten
    const patientsWithDFS = patients
      .map(p => {
        const dfs = calculateDFSFromOBDS(p, dfsStartTime);
        return {
          patient: p,
          dfsTimeMonths: dfs.dfsTimeMonths,
          dfsEvent: dfs.dfsEvent,
          eventType: dfs.eventType,
          eventDate: dfs.eventDate,
        };
      })
      .filter(p => p.dfsTimeMonths > 0); // Nur g├╝ltige DFS-Zeiten

    if (patientsWithDFS.length === 0) return [];

    // Sammle alle unique DFS-Zeitpunkte und sortiere sie
    const times = Array.from(new Set(patientsWithDFS.map(p => p.dfsTimeMonths))).sort((a, b) => a - b);

    // PERF: precompute at-risk / events / markers in O(n log n) so the loop
    // below is O(unique times) instead of O(unique times * n) (was the same
    // O(n^2) freeze as the worker before its single-pass fix).
    const dfsSorted = [...patientsWithDFS].sort((a, b) => a.dfsTimeMonths - b.dfsTimeMonths);
    const Ndfs = dfsSorted.length;
    const atRiskByTime = new Map<number, number>();
    {
      let idx = 0;
      for (const t of times) {
        while (idx < Ndfs && dfsSorted[idx].dfsTimeMonths < t) idx++;
        atRiskByTime.set(t, Ndfs - idx); // count of dfsTimeMonths >= t
      }
    }
    const eventsByTime = new Map<number, number>();
    const eventMarkerByTime = new Map<number, (typeof dfsSorted)[number]>();
    const anyByTime = new Map<number, (typeof dfsSorted)[number]>();
    for (const pw of dfsSorted) {
      if (!anyByTime.has(pw.dfsTimeMonths)) anyByTime.set(pw.dfsTimeMonths, pw);
      if (pw.dfsEvent === 1) {
        eventsByTime.set(pw.dfsTimeMonths, (eventsByTime.get(pw.dfsTimeMonths) ?? 0) + 1);
        if (!eventMarkerByTime.has(pw.dfsTimeMonths)) eventMarkerByTime.set(pw.dfsTimeMonths, pw);
      }
    }

    // Kaplan-Meier Kurve mit Step-Function
    const result: SurvivalDataWithMarker[] = [];
    let probability = 1.0;

    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      
      // Patienten at risk zu diesem Zeitpunkt: alle mit DFS-Zeit >= aktueller Zeit
      const atRisk = atRiskByTime.get(time) ?? 0;

      // Events zu diesem Zeitpunkt: Patienten mit DFS-Zeit === Zeit UND dfsEvent === 1
      const events = eventsByTime.get(time) ?? 0;

      // Kaplan-Meier-Sch├ñtzer: S(t) = S(t-1) * (1 - events/atRisk)
      if (atRisk > 0 && events > 0) {
        probability *= (1 - events / atRisk);
      }

      // Finde einen Patienten mit Event an diesem Zeitpunkt f├╝r Metadaten
      let markerPatient = eventMarkerByTime.get(time);
      if (!markerPatient) {
        // Wenn kein Event, nimm einen beliebigen Patienten an diesem Zeitpunkt (Zensierung)
        const foundPatient = anyByTime.get(time);
        if (foundPatient) {
          markerPatient = foundPatient;
        }
      }

      const p = markerPatient?.patient;
      const tVal = p?.staging?.tPathological || p?.staging?.tClinical || tr("notAvailable");
      const diagDate = toDateSafe(p?.diagnosisDate);
      const eventDateSafe = toDateSafe(markerPatient?.eventDate);
      const followupDateSafe = markerPatient?.eventDate
        ? eventDateSafe
        : toDateSafe(p?.followupDate);

      // Event-Punkt
      result.push({
        time,
        probability,
        atRisk,
        events,
        patientId: p?.id || tr("notAvailable"),
        icd10: p?.tumorLocation || p?.lokalisation || p?.tumorType || "",
        tCategory: tVal,
        primaryCase: istPrimaerfall(p?.primaerfall),
        diagnosisDate: toISOStringSafe(diagDate),
        vitalDate: toISOStringSafe(eventDateSafe),
        event: markerPatient?.dfsEvent === 1,
        followupDate: followupDateSafe,
      });

      // Horizontaler Schritt bis zum nächsten Zeitpunkt (flaches Segment der
      // Treppe). events MUSS hier 0 sein — sonst zählt computeKaplanMeierCI()
      // (das S(t) aus events/atRisk neu herleitet) die Hazard pro Zeitpunkt
      // doppelt. Gleicher Fix wie im Worker (kaplan-meier.worker.ts).
      if (i < times.length - 1) {
        result.push({
          time: times[i + 1] - 0.01,
          probability,
          atRisk,
          events: 0,
          patientId: p?.id || tr("notAvailable"),
          icd10: p?.tumorLocation || p?.lokalisation || p?.tumorType || "",
          tCategory: tVal,
          primaryCase: istPrimaerfall(p?.primaerfall),
          diagnosisDate: toISOStringSafe(diagDate),
          vitalDate: toISOStringSafe(eventDateSafe),
          event: markerPatient?.dfsEvent === 1,
          followupDate: followupDateSafe,
        });
      }
    }

    return result;
  };

  const extraBins = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeBins>>();
    if (!extraColumns) return map;
    for (const [colName, meta] of Object.entries(extraColumns.columns)) {
      if (meta.type !== 'numeric') continue;
      const sorted: number[] = [];
      for (const p of patients) {
        const raw = (p as any).extras?.[colName];
        if (!raw) continue;
        const parsed = parseNumberWithUnit(raw);
        if (!parsed) continue;
        const factor = meta.conversionFactors?.[parsed.unit ?? '']
          ?? (parsed.unit == null || parsed.unit === '' ? 1 : NaN);
        if (!isFinite(factor)) continue;
        sorted.push(parsed.number * factor);
      }
      sorted.sort((a, b) => a - b);
      map.set(colName, computeBins(meta, sorted, stratificationConfig.binning));
    }
    return map;
  }, [extraColumns, patients, stratificationConfig.binning]);

  // Returns the group id a patient belongs to for the given criterion, or null
  // when the patient is outside the analysed subset (e.g. a cT value under a
  // pathological criterion). null-group patients are excluded from curves,
  // counts and statistics — they are not bucketed into "Keine Angabe".
  // Eine Zuordnung für die ganze Anwendung, siehe patient-gruppe.ts.
  const getPatientGroup = (patient: Patient, criterion: StratificationCriterion): string | null =>
    patientGruppe(patient, criterion, { extraColumns: extraColumns ?? undefined, extraBins });

  const calculateStratifiedCurves = (patients: Patient[], config: StratificationConfig): SurvivalCurve[] => {
    const curves: SurvivalCurve[] = [];
    const enabledGroups = config.groups.filter(g => g.enabled);

    // Helper: extract ICD10 code from tumorType-like fields (part before '-')
    const extractIcd10 = (patient: Patient) => {
      const source = (patient as any).tumorType || (patient as any).tumorLocation || (patient as any).lokalisation || '';
      if (!source || typeof source !== 'string') return 'Keine Angabe';
      const parts = source.split('-');
      const code = parts[0].trim();
      return code === '' ? 'Keine Angabe' : code;
    };

    // PERF: Bucket patients by group id ONCE up front instead of running an
    // O(n) filter per group. Critical for entityStaging (50+ groups, each
    // patient lookup does a Wiley entity scan + stage rule eval) where the
    // old O(g x n x work) blew up the main thread on larger cohorts.
    const buckets = new Map<string, Patient[]>();
    for (const patient of patients) {
      const id = config.criterion === 'tumorType'
        ? extractIcd10(patient)
        : getPatientGroup(patient, config.criterion);
      if (id == null) continue; // outside the analysed subset -> excluded
      const bucket = buckets.get(id);
      if (bucket) bucket.push(patient);
      else buckets.set(id, [patient]);
    }

    enabledGroups.forEach(group => {
      let groupId = group.id;
      if (config.criterion === "tCategoryOneDigit") {
        groupId = normalizeTOneDigit(group.id);
      }
      const groupPatients = buckets.get(groupId);
      if (groupPatients && groupPatients.length > 0) {
        const survivalData = calculateKaplanMeier(groupPatients, "overall", "diagnosisDate");
        if (survivalData.length > 0) {
          curves.push({
            id: group.id,
            name: group.name,
            data: survivalData,
            color: group.color,
          });
        }
      }
    });

    return curves;
  };

  // Wenn Stratifizierung nach tumorType aktiviert wird, zur├╝cksetzen der vorausgew├ñhlten Filter (ICD-10 und Tumor-Kategorien)
  React.useEffect(() => {
    if (stratificationConfig.criterion === 'tumorType') {
      setFiltersPersisted(prev => ({ ...prev, selectedICD10Codes: [], selectedTumorCategories: [] }));
    }
  }, [stratificationConfig.criterion]);

  const filterPatients = useCallback((patients: Patient[]): Patient[] => {
    return patients
      .filter(p => !excludedIds.has(p.id))
      .filter(patient => {
      // Gender filter
      if (filters.selectedGender.length > 0 && !filters.selectedGender.includes(patient.gender)) return false;
      
      // Age group filter
      if (filters.selectedAgeGroup.length > 0) {
        let age: number | undefined = undefined;
        if (typeof patient.age === 'number' && !isNaN(patient.age)) {
          age = patient.age;
        } else {
          // fallback: calculate from diagnosisDate if possible
          const diagDate = getDiagnosisDate(patient);
          if (diagDate && diagDate instanceof Date && !isNaN(diagDate.getTime())) {
            age = new Date().getFullYear() - diagDate.getFullYear();
          }
        }
        // Use the shared classification helper so the sidebar filter and the
        // curve stratification can never diverge on the age-group rule.
        const ageGroup = typeof age === 'number' ? getAgeGroup(age) : "unknown";
        if (!filters.selectedAgeGroup.includes(ageGroup)) return false;
      }
      
      // ICD-10 code filter
      if (filters.selectedICD10Codes.length > 0) {
        const patientICD10 = patient.tumorType?.match(/^([A-Z]\d{2})/)?.[1];
        if (!patientICD10 || !filters.selectedICD10Codes.includes(patientICD10)) return false;
      }
      
      // Tumor category filter (use ICD-10 code matching)
      if (filters.selectedTumorCategories.length > 0) {
        // Check if patient matches any of the selected categories
        const matchesAnyCategory = filters.selectedTumorCategories.some(categoryName => 
          patientMatchesCategory(patient, categoryName)
        );
        if (!matchesAnyCategory) return false;
      }
      
      // Staging filter
      if (filters.selectedStaging.length > 0 && patient.staging?.uicc && !filters.selectedStaging.includes(patient.staging.uicc)) return false;
      
      // Grading filter
      if (filters.selectedGrading.length > 0 && patient.grading && !filters.selectedGrading.includes(patient.grading)) return false;
      
      // Year range filter
      if (filters.selectedYearRange.start || filters.selectedYearRange.end) {
        const diagnosisYear = getDiagnosisDate(patient).getFullYear();
        if (filters.selectedYearRange.start && diagnosisYear < filters.selectedYearRange.start) return false;
        if (filters.selectedYearRange.end && diagnosisYear > filters.selectedYearRange.end) return false;
      }
      
             // Primary case filter
       if (filters.selectedPrimaryCase.length > 0) {
         // Check if patient is primary case based on primaerfall field
         const isPrimary = istPrimaerfall(patient.primaerfall);
         const primaryStatus = isPrimary ? "primary" : "secondary";
         if (!filters.selectedPrimaryCase.includes(primaryStatus)) return false;
       }
      
      // Spread category filter
      if (filters.selectedSpreadCategory.length > 0 && patient.spreadCategory && !filters.selectedSpreadCategory.includes(patient.spreadCategory)) return false;

      return true;
    });
  }, [filters, excludedIds]);

  // Die gefilterte Kohorte einmal je Änderung, statt filterPatients an jeder
  // Verbrauchsstelle erneut über alle Fälle laufen zu lassen.
  const gefilterteKohorte = useMemo<Patient[]>(
    () => filterPatients(patients),
    [filterPatients, patients],
  );

  /**
   * Die eine Kohorte, auf die der gewählte Endpunkt angewendet ist. Kurve,
   * Tabelle, Kacheln, Cox-Analyse und Export lesen daraus. Lag die Anwendung
   * nur im Kurveneffekt, zeigten alle übrigen Stellen weiter die Rohfelder,
   * also das Gesamtüberleben, unter der Beschriftung des gewählten Endpunkts.
   */
  const endpunktKohorte = useMemo<Patient[]>(
    () => kohorteFuerEndpunkt(endpunktById(endpunkt), gefilterteKohorte),
    [endpunkt, gefilterteKohorte],
  );

  // Einheit der x-Achse. Boxkohorten rechnen in Tagen, alles andere in
  // Monaten; die Beschriftung muss dem folgen, sonst steht 365 unter "Monate".
  const zeitEinheit = useMemo(
    () => zeitEinheitDerKohorte(endpunktById(endpunkt), gefilterteKohorte),
    [endpunkt, gefilterteKohorte],
  );
  const zeitLabel = zeitEinheit === "tage" ? tr("days") : tr("months");

  // Anzeige-Einheit der x-Achse von KM-Plot und At-risk-Tabelle: per Default
  // Monate, per Schalter (Darstellungsbox) auf Tage umschaltbar - unabhängig
  // von der nativen Einheit der Kohorte (zeitEinheit). Landmark-Tabelle,
  // Kennzahlenzeile und Median-Follow-up-Text bleiben bewusst bei zeitLabel/
  // zeitEinheit, nur die beiden Plot-Achsen folgen diesem Schalter.
  const nativeZeitEinheit: TimeUnit = zeitEinheit === "tage" ? "days" : "months";
  const xAxisUnit: TimeUnit = plotDisplay.showXAxisInDays ? "days" : "months";
  const xAxisDisplayLabel = xAxisUnit === "days" ? tr("days") : tr("months");
  const toXAxisUnit = <T extends { time: number }>(data: T[]): T[] =>
    nativeZeitEinheit === xAxisUnit
      ? data
      : data.map((d) => ({ ...d, time: convertTimeUnit(d.time, nativeZeitEinheit, xAxisUnit) }));

  // Welches Verfahren die Kurve rechnet. Die Auswertungsblätter der OncoBoxen
  // schreiben den sequentiellen Schätzer vor: die Risikomenge sinkt je Zeile um
  // eins, gleiche Zeiten werden nacheinander abgearbeitet. Für oBDS, CSV, TXT
  // und Excel bleibt es bei der üblichen Konvention mit zusammengefassten
  // Bindungen. Dasselbe Signal wie bei der Zeiteinheit, denn beides entscheidet
  // sich daran, ob eine Boxregel greift.
  // Die Lokalrezidivrate ist eine Rate, kein Überleben: wer stirbt, bekommt
  // kein Rezidiv mehr. Sie läuft deshalb über die kumulative Inzidenz, auch auf
  // Kohorten ohne Box.
  const kurvenSchaetzer = useMemo<KurvenSchaetzer>(() => {
    const definition = endpunktById(endpunkt);
    if (definition && schaetzerFuer(definition) === "kumulativeInzidenz") {
      return "kumulativeInzidenz";
    }
    return zeitEinheit === "tage" ? "sequentiell" : "gruppiert";
  }, [endpunkt, zeitEinheit]);

  // Profilkennung der geladenen Datei, oder null ohne OncoBox. Sie entscheidet,
  // welche Regel gilt, und gehört deshalb in die Exportdatei.
  const oncoBoxProfileId = useMemo(
    () => patients.find((p) => p.oncoBox?.profileId)?.oncoBox?.profileId ?? null,
    [patients],
  );

  // Dynamische Worker-Integration
  const workerRef = React.useRef<Worker | null>(null);
  // Monotonic request id. When the user fires a new stratification while a
  // previous worker call is still in flight, the late response gets a stale
  // reqId and is ignored — prevents PAM50 results from being painted as ER
  // results during a rapid PAM50 -> ER -> HER2 click sequence.
  const workerReqIdRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      workerRef.current = new Worker(
        new URL("@/components/kaplan-meier/kaplan-meier.worker.ts", import.meta.url),
        { type: "module" }
      );
    }
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  React.useEffect(() => {
    
   // if (patients.length === 0) {
    //  return;
    //}

    // Guard: Don't calculate if stratificationConfig is not fully initialized
    // BUT: Allow empty groups for "none" criterion (Overall Survival)
    if (stratificationConfig.groups.length === 0 && stratificationConfig.criterion !== "none") {
      return;
    }

    // --- Session-cache: skip an identical recomputation ---------------------
    // Switching the language changes the /[locale]/ route segment, which
    // Next.js treats as real navigation — this whole page remounts,
    // survivalCurves resets to [] and this effect reruns from scratch even
    // though nothing about the data or configuration actually changed.
    // Caching the last result keyed by every input this effect depends on
    // lets a remount reuse it instantly instead of re-running the worker and
    // flashing the loading spinner just because the user changed the language.
    const kmSignature = JSON.stringify({
      datasetHash: sessionStorage.getItem("km-dataset-hash") ?? "",
      filters,
      criterion: stratificationConfig.criterion,
      groups: stratificationConfig.groups.map(g => ({ id: g.id, enabled: g.enabled })),
      binning: stratificationConfig.binning,
      excludedIds: Array.from(excludedIds).sort(),
      endpunkt,
    });
    try {
      const cachedRaw = sessionStorage.getItem("km-curves-cache");
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { signature: string; curves: SurvivalCurve[] };
        if (cached.signature === kmSignature) {
          setSurvivalCurves(cached.curves);
          setSurvivalData([]);
          setIsLoadingPlots(false);
          setIsGlobalLoading(false);
          return;
        }
      }
    } catch {
      // corrupt/oversized cache entry -> ignore, fall through to a real recompute
    }
    const cacheKmCurves = (curves: SurvivalCurve[]) => {
      try {
        sessionStorage.setItem("km-curves-cache", JSON.stringify({ signature: kmSignature, curves }));
      } catch {
        // sessionStorage full or unavailable -> next mount just recomputes, no harm
      }
    };

    // Die gemeinsame Ableitung: gefiltert und auf den Endpunkt umgerechnet.
    // Die folgenden T-Kriterien lesen nur das Staging und sind von Zeit und
    // Ereignis unabhängig, sie dürfen deshalb danach greifen.
    let patientenFuerEndpunkt = endpunktKohorte;

    // For pT criteria: include patients with a tPathological value, AND patients with no T value
    // at all (→ "Keine Angabe" group). Exclude only patients that have exclusively a cT value.
    if (
      stratificationConfig.criterion === "tPathological" ||
      stratificationConfig.criterion === "tPathologicalOneDigit" ||
      stratificationConfig.criterion === "tPathologicalTwoDigit"
    ) {
      patientenFuerEndpunkt = patientenFuerEndpunkt.filter(p =>
        !!p.staging?.tPathological || !p.staging?.tClinical
      );
    }
    // Analogously for cT criteria: include patients with tClinical OR no T value at all.
    if (
      stratificationConfig.criterion === "tClinical" ||
      stratificationConfig.criterion === "tClinicalOneDigit" ||
      stratificationConfig.criterion === "tClinicalTwoDigit"
    ) {
      patientenFuerEndpunkt = patientenFuerEndpunkt.filter(p =>
        !!p.staging?.tClinical || !p.staging?.tPathological
      );
    }

    const suppressSpinner = sessionStorage.getItem("km-suppress-next-spinner");
    if (!suppressSpinner) {
      setIsLoadingPlots(true);
      setIsGlobalLoading(true);
      // Drop the previous stratification's curves before kicking off the new
      // computation. Otherwise Plotly burns hundreds of ms re-rendering the
      // stale curves (CI bands + markers for 6 PAM50 groups, say) during the
      // render that follows this effect — that's why second/third clicks felt
      // like a freeze while the first one was snappy (empty starting state).
      setSurvivalCurves([]);
      setSurvivalData([]);
    } else {
      sessionStorage.removeItem("km-suppress-next-spinner");
    }

    if (patientenFuerEndpunkt.length === 0) {
      setSurvivalData([]);
      setSurvivalCurves([]);
      setIsLoadingPlots(false);
      setIsGlobalLoading(false);
      return;
    }

    // Two special paths can't go straight into the generic worker switch:
    // - entityStaging: needs Wiley staging rules (not available in worker).
    // - extras: per-patient classification depends on column meta + bins.
    // For both we precompute the per-patient groupId on the main thread
    // (cheap — Map lookup / string compare), then hand patients + the
    // parallel groupIds array to the worker which does the heavy KM work.
    // The previous implementation ran calculateStratifiedCurves synchronously
    // here, which blocked the spinner from painting.
    const isEntityStagingMode = stratificationConfig.criterion === "entityStaging";
    const isExtraColumnMode = typeof stratificationConfig.criterion === 'string'
      && stratificationConfig.criterion.startsWith('extra:');

    // Extras + entityStaging: precompute groupIds on main thread, hand off
    // to the worker for the heavy KM math.
    if (isEntityStagingMode || isExtraColumnMode) {
      if (!workerRef.current) return;
      // Defer all synchronous prep (groupId classification + structured-clone
      // payload + postMessage) by two animation frames so React has time to
      // commit the spinner state and the browser has time to paint it before
      // the main thread gets pinned by the clone of ~2000 patient records.
      let cancelled = false;
      const outerFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled || !workerRef.current) return;
          const reqId = ++workerReqIdRef.current;
          // Single pass: build group ids AND the minimal patient payload the
          // worker needs (id + survivalTime + event + followupDate +
          // tumorType for hover labels). Dropping the rest cuts the
          // postMessage structured-clone cost from ~50-150 ms to <20 ms on
          // the METABRIC cohort.
          const N = patientenFuerEndpunkt.length;
          const groupIds: string[] = [];
          const minimalPatients: any[] = [];
          for (let i = 0; i < N; i++) {
            const p = patientenFuerEndpunkt[i];
            const gid = getPatientGroup(p, stratificationConfig.criterion);
            if (gid == null) continue; // outside the analysed subset -> drop from curves + stats
            groupIds.push(gid);
            minimalPatients.push({
              id: p.id,
              survivalTime: p.survivalTime,
              event: p.event,
              followupDate: p.followupDate ?? null,
              tumorType: p.tumorType,
              // Nur die Lokalrezidivrate liest es. Fehlt es hier, käme ein
              // Todesfall im Worker als Zensierung an.
              konkurrenz: p.konkurrenz ?? false,
              // Ohne den Diagnosecode faellt der Worker im Tooltip auf
              // tumorLocation zurueck und zeigt dort die Seitenlokalisation.
              icd10: p.icd10 ?? null,
            });
          }
          workerRef.current.onmessage = (ev: MessageEvent<any>) => {
            if (ev.data.reqId !== workerReqIdRef.current) return; // stale
            if (ev.data.error) {
              setSurvivalCurves([]);
              setSurvivalData([]);
              setError(tr("errors.calculation", { message: ev.data.error }));
            } else if (ev.data.curves && Array.isArray(ev.data.curves)) {
              setSurvivalCurves(ev.data.curves);
              setSurvivalData([]);
              cacheKmCurves(ev.data.curves);
            }
            setIsLoadingPlots(false);
            setIsGlobalLoading(false);
          };
          workerRef.current.postMessage({
            patients: minimalPatients,
            stratificationConfig: {
              ...stratificationConfig,
              selectedGroupIds: stratificationConfig.groups
                ? stratificationConfig.groups.filter(g => g.enabled).map(g => g.id)
                : [],
            },
            groupIds,
            reqId,
            schaetzer: kurvenSchaetzer,
            zeitEinheit,
            overallLabel: tr("overallTotal"),
          });
        });
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(outerFrame);
      };
    }

    // F├╝r alle anderen Kriterien: Worker-basierte Berechnung
    if (!workerRef.current) {
      return;
    }

    const reqId = ++workerReqIdRef.current;
    workerRef.current.onmessage = (e: MessageEvent<any>) => {
      if (e.data.reqId !== workerReqIdRef.current) return; // stale
      if (e.data.error) {
        setSurvivalCurves([]);
        setSurvivalData([]);
        setError(tr("errors.calculation", { message: e.data.error }));
      } else if (e.data.curves && Array.isArray(e.data.curves) && e.data.curves.length > 0) {
        setSurvivalCurves(e.data.curves);
        setSurvivalData([]);
        cacheKmCurves(e.data.curves);
      } else {
        // Fallback: Zeige Fehlermeldung und setze Dummy-Kurve
        setError(tr("errors.workerNoCurves"));
        setSurvivalCurves([]);
        setSurvivalData([]);
      }
      setIsLoadingPlots(false);
      setIsGlobalLoading(false);
    };
    workerRef.current.postMessage({
      patients: patientenFuerEndpunkt,
      stratificationConfig: {
        ...stratificationConfig,
        selectedGroupIds: stratificationConfig.groups ? stratificationConfig.groups.filter(g => g.enabled).map(g => g.id) : []
      },
      reqId,
      schaetzer: kurvenSchaetzer,
      zeitEinheit,
      overallLabel: tr("overallTotal"),
    });
    // endpunktKohorte deckt patients, filters, excludedIds und endpunkt ab: sie
    // hängt an filterPatients und am gewählten Endpunkt. Ohne sie in den Deps
    // liefe die Kurve nach einem Ausschluss im Anomaliepanel oder nach einem
    // Endpunktwechsel mit der alten Kohorte weiter.
  }, [endpunktKohorte, stratificationConfig, filters, excludedIds, endpunkt, kurvenSchaetzer, zeitEinheit]);

  // --- Guided tour hooks ----------------------------------------------------
  const tourStep = useTourStep();

  // While the tour runs, stratify the demo cohort by subtype (PAM50) so the
  // plot shows several curves instead of a single overall-survival line.
  React.useEffect(() => {
    if (!tourStep || tourStep.step.page !== "results") return;
    if (stratificationConfig.criterion !== "none") return;
    if (patients.length === 0) return;
    const col = extraColumns?.columns?.["PAM50"];
    if (!col || col.type !== "categorical") return;
    const vals = Array.from(
      new Set(
        patients
          .map(p => (p as { extras?: Record<string, string> }).extras?.["PAM50"])
          .filter((v): v is string => v != null && String(v).trim() !== ""),
      ),
    ).map(String);
    if (vals.length < 2) return;
    setStratificationConfigPersisted({
      criterion: "extra:PAM50",
      groups: vals.map((v, i) => ({
        id: v, name: v, color: CURVE_COLORS[i % CURVE_COLORS.length], enabled: true,
      })),
    });
  }, [tourStep, patients, extraColumns, stratificationConfig.criterion]);

  // On the Kaplan-Meier step, genuinely hide one curve so the user sees that a
  // group can be removed from the plot (kept hidden afterwards for clarity).
  // Guarded by a ref so it happens ONCE per tour run: the effect re-runs on
  // every step change, so stepping away from this step and back (or overshooting
  // and going back) used to hide another curve each time, letting the user
  // whittle the plot down to a single curve.
  const tourDidHideCurveRef = React.useRef(false);
  React.useEffect(() => {
    if (!tourStep) {
      // Tour ended — let a later run demonstrate the hide again.
      tourDidHideCurveRef.current = false;
      return;
    }
    if (tourStep.step.id !== "km-chart") return;
    if (tourDidHideCurveRef.current) return;
    tourDidHideCurveRef.current = true;
    setStratificationConfigPersisted(cfg => {
      const visible = cfg.groups.filter(g => g.enabled);
      if (visible.length < 2) return cfg; // always keep at least one curve
      const hideId = visible[visible.length - 1].id;
      return {
        ...cfg,
        groups: cfg.groups.map(g => (g.id === hideId ? { ...g, enabled: false } : g)),
      };
    });
  }, [tourStep]);

  // Open the filter panel once the tour reaches the "filters" step, so the
  // highlighted box actually shows the controls the step text describes.
  // Left open afterwards on purpose, no closing effect.
  React.useEffect(() => {
    if (tourStep?.step.id !== "filters") return;
    setIsFilterPanelOpen(true);
  }, [tourStep]);

  const exportChart = () => {
    const chartData = {
      patients: endpunktKohorte.length,
      events: endpunktKohorte.filter(p => p.event).length,
      filters,
      stratificationConfig,
      survivalData: survivalCurves.length > 0 ? survivalCurves : survivalData,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(chartData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaplan-meier-chart-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trigger a browser download for a data/object URL.
  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };
  const dateStamp = () => new Date().toISOString().split('T')[0];

  // PNG/SVG export via dom-to-image-more: it renders through the browser (an SVG
  // <foreignObject>), so modern CSS colours like oklch work natively. html2canvas
  // parsed colours itself and threw on oklch, so these buttons could fail.
  // The KM exports capture the whole chart area (chartRef = curve + landmark
  // table + numbers-at-risk plot) so the exported figure is self-contained.
  // Build ONE clean SVG (no card frames) by stacking Plotly's own vector export
  // of the KM curve and the numbers-at-risk plot. Plotly draws no card border,
  // so this matches the clean look of the Cox forest plot, and stays small
  // (unlike a dom-to-image capture of the whole chart area).
  const buildKmCompositeSvg = async (): Promise<{ svg: string; width: number; height: number } | null> => {
    const Plotly = typeof window !== 'undefined' ? (window as any).Plotly : undefined;
    const divs = chartRef.current?.querySelectorAll('.js-plotly-plot, [data-plotly="true"]');
    if (!Plotly || !divs || divs.length === 0) return null;
    const inner = (dataUrl: string) =>
      decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml,/, ''))
        .replace(/^<\?xml[^>]*\?>\s*/, '');
    const toSized = async (div: any, w: number, h: number) => {
      const raw = inner(await Plotly.toImage(div, { format: 'svg', width: w, height: h }));
      return `<svg x="0" y="0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${
        raw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg>`;
    };
    const W = 1200;
    const curveH = 640;
    const parts: string[] = [];
    let yOff = 0;
    const curveInner = await toSized(divs[0], W, curveH);
    parts.push(`<g transform="translate(0,${yOff})">${curveInner}</g>`);
    yOff += curveH + 10;
    if (divs.length > 1) {
      const atRiskH = 300;
      const atRiskInner = await toSized(divs[1], W, atRiskH);
      parts.push(`<g transform="translate(0,${yOff})">${atRiskInner}</g>`);
      yOff += atRiskH + 10;
    }

    // Footnote naming the analysed subset. Without it an exported figure of a
    // filtered cohort looks exactly like one of the full dataset — the filter
    // state was only ever visible on the page itself and in the PDF report.
    const filterLines = buildActiveFilterLines(yearRange);
    if (filterLines.length > 0) {
      const escapeXml = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const lineH = 18;
      yOff += 6;
      const caption = [tr('pdf.appliedFilters'), ...filterLines]
        .map((line, i) => `<text x="8" y="${yOff + 12 + i * lineH}" font-family="Helvetica, Arial, sans-serif" font-size="${i === 0 ? 13 : 12}" font-weight="${i === 0 ? 'bold' : 'normal'}" fill="#333333">${escapeXml(line)}</text>`)
        .join('');
      parts.push(caption);
      yOff += 12 + (filterLines.length + 1) * lineH;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${yOff}" viewBox="0 0 ${W} ${yOff}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join('')}</svg>`;
    return { svg, width: W, height: yOff };
  };

  const exportChartAsPNG = async () => {
    try {
      const composite = await buildKmCompositeSvg();
      if (composite) {
        const { svgToPngDataUrl } = await import("@/components/kaplan-meier/cox-forest-svg");
        triggerDownload(await svgToPngDataUrl(composite.svg, composite.width, composite.height, 2), `kaplan-meier-${dateStamp()}.png`);
        return;
      }
      if (!chartRef.current) return;
      triggerDownload(await captureCleanNode(chartRef.current, 'png'), `kaplan-meier-${dateStamp()}.png`);
    } catch {
      alert(tr("errors.pngExportUnavailable"));
    }
  };

  const exportChartAsSVG = async () => {
    try {
      const composite = await buildKmCompositeSvg();
      if (composite) {
        triggerDownload(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(composite.svg)}`, `kaplan-meier-${dateStamp()}.svg`);
        return;
      }
      if (!chartRef.current) return;
      triggerDownload(await captureCleanNode(chartRef.current, 'svg'), `kaplan-meier-${dateStamp()}.svg`);
    } catch {
      alert(tr("errors.pngExportUnavailable"));
    }
  };

  const exportStatisticsAsPNG = async () => {
    if (!statisticsRef.current) return;
    try {
      triggerDownload(await captureCleanNode(statisticsRef.current, 'png'), `kaplan-meier-statistics-${dateStamp()}.png`);
    } catch {
      alert(tr("errors.pngExportUnavailableSimple"));
    }
  };

  const exportStatisticsAsSVG = async () => {
    if (!statisticsRef.current) return;
    try {
      triggerDownload(await captureCleanNode(statisticsRef.current, 'svg'), `kaplan-meier-statistics-${dateStamp()}.svg`);
    } catch {
      alert(tr("errors.pngExportUnavailableSimple"));
    }
  };


  // Export the full survival table (all rows) as CSV
  const exportData = () => {
    const tableData = filteredSortedTableData as SurvivalTableRow[];
    if (!tableData.length) return;
    const columns = Object.keys(tableData[0]);
    let csvContent = columns.join(",") + "\n";
    tableData.forEach(row => {
      csvContent += columns.map(col => {
        let val = row[col];
        if (typeof val === "string" && val.includes(",")) val = `"${val}"`;
        return val;
      }).join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaplan-meier-table-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // --- Pagination state for survival table ---
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 50;
  // These must be declared after getFilteredSortedTableData is defined
  let tableData: SurvivalTableRow[] = [];
  let totalPages = 1;
  let pagedTableData: SurvivalTableRow[] = [];

  // Export the full survival table + plot calculations (KM curves, log-rank, Cox) as Excel
  const exportTableAsExcel = (mode: ExportMode = "full") => {
    import('exceljs').then(async ({ Workbook }) => {
      const tableRows = filteredSortedTableData as SurvivalTableRow[];
      const exportRows = applyExportMode(tableRows, mode);
      const shared = mode !== "full"; // both sharing modes hide the source file

      const wb = new Workbook();
      const FLOAT_FMT = '0.000000';
      const INT_FMT = '0';
      const SCI_FMT = '0.000E+00';
      const KM_TIMEPOINTS = [3, 6, 12, 24, 36, 48, 60, 120];
      // Zwei Konventionen stehen in derselben Datei nebeneinander: die
      // Nachbeobachtung ist in Spalten mit der Endung _months immer in Monaten
      // umgerechnet, die Kurvenblätter tragen die Einheit der Kurve. Ohne
      // diesen Satz läse jemand eine Nachbeobachtung von 48 neben einem
      // medianen Überleben von 1450 und hielte das für einen Fehler.
      const ZEIT_HINWEIS =
        'Columns whose name ends in _months are always months; all other time values use the unit given by time_unit.';

      // Hilfsfunktion: Floating-Point sicher schreiben (NaN/Infinity → leer)
      const safeNum = (v: unknown): number | string => {
        if (typeof v !== 'number') return v == null ? '' : String(v);
        if (!isFinite(v)) return '';
        return v;
      };
      // Wandelt einen Zeitwert nach Monaten, falls die Kohorte in Tagen
      // rechnet. Wie in oncobox/to-patients.ts: dieselbe Boxkohorte, also
      // dieselbe Umrechnung.
      const TAGE_PRO_MONAT = 30.44;
      const alsMonate = (wert: number): number =>
        zeitEinheit === "tage" ? wert / TAGE_PRO_MONAT : wert;
      // Hilfsfunktion: p-Value formatieren (klein → wissenschaftlich)
      const fmtPValue = (cell: import('exceljs').Cell, v: number | null | undefined) => {
        if (v == null || !isFinite(v)) { cell.value = ''; return; }
        cell.value = v;
        cell.numFmt = v > 0 && v < 1e-4 ? SCI_FMT : FLOAT_FMT;
      };

      // ---- File-Meta aus sessionStorage holen ------------------------------
      let fileMeta: { name?: string; size?: number; source?: string; uploadedAt?: string; nPatients?: number } = {};
      try {
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem('km-file-meta') : null;
        if (raw) fileMeta = JSON.parse(raw);
      } catch { /* ignore */ }

      // ---- Filter-Snapshot in lesbares Objekt --------------------------------
      const filtersApplied: Record<string, unknown> = {};
      if (filters.selectedGender.length) filtersApplied.gender = filters.selectedGender;
      if (filters.selectedAgeGroup.length) filtersApplied.ageGroup = filters.selectedAgeGroup;
      if (filters.selectedICD10Codes.length) filtersApplied.icd10 = filters.selectedICD10Codes;
      if (filters.selectedTumorCategories.length) filtersApplied.tumorCategory = filters.selectedTumorCategories;
      if (filters.selectedStaging.length) filtersApplied.staging = filters.selectedStaging;
      if (filters.selectedGrading.length) filtersApplied.grading = filters.selectedGrading;
      if (filters.selectedPrimaryCase.length) filtersApplied.primaryCase = filters.selectedPrimaryCase;
      if (filters.selectedSpreadCategory.length) filtersApplied.spreadCategory = filters.selectedSpreadCategory;
      if (filters.selectedYearRange.start != null || filters.selectedYearRange.end != null) {
        filtersApplied.diagnosisYearRange = [
          filters.selectedYearRange.start ?? null,
          filters.selectedYearRange.end ?? null,
        ];
      }

      // ---- Rohdaten für Reverse-KM (Follow-up) ------------------------------
      // Aus endpunktKohorte, nicht aus der Rohkohorte: sonst beschriebe dieser
      // Wert immer das Gesamtüberleben, auch wenn Tabelle und Kurven daneben
      // den gewählten Endpunkt zeigen.
      const followUpInputs = endpunktKohorte
        .filter(p => typeof p.survivalTime === 'number' && p.survivalTime > 0)
        .map(p => ({ time: p.survivalTime as number, event: !!p.event }));
      const reverseKM = computeReverseKMFollowUp(followUpInputs);
      const followUpTimes = followUpInputs.map(p => p.time).sort((a, b) => a - b);
      const followUpStats = (() => {
        if (!followUpTimes.length) return { min: NaN, max: NaN, median: NaN, q1: NaN, q3: NaN };
        const n = followUpTimes.length;
        const q = (p: number) => {
          const idx = (n - 1) * p;
          const lo = Math.floor(idx); const hi = Math.ceil(idx);
          return lo === hi ? followUpTimes[lo] : followUpTimes[lo] * (hi - idx) + followUpTimes[hi] * (idx - lo);
        };
        return {
          min: followUpTimes[0],
          max: followUpTimes[n - 1],
          median: q(0.5),
          q1: q(0.25),
          q3: q(0.75),
        };
      })();

      // Fallzahl der ausgewerteten Kohorte: gefiltert und auf den Endpunkt
      // umgerechnet, also dieselbe Menge, aus der die Tabellenzeilen stammen.
      const patientsAfterFilters = endpunktKohorte;

      // Nachbeobachtung und mediane ereignisfreie Zeit nach der Boxvorschrift,
      // auf derselben Kohorte wie die Kurve.
      const boxKennzahlen = kennzahlenFuerKurve(patientsAfterFilters, zeitEinheit, kurvenSchaetzer);

      // Ereignisse an derselben Menge gezählt. Auf der Rohkohorte gezählt
      // meldete die Datei nach einer DFS-Auswertung weiter die Sterbefälle:
      // eine Ereigniszahl, die zu keiner Tabellenzeile und zu keiner Kurve
      // gehörte.
      const nEvents = patientsAfterFilters.filter(p => p.event).length;
      const nCensored = patientsAfterFilters.length - nEvents;

      // Die Menge, auf der Kurve, Log-Rank und Cox tatsächlich rechnen. Der
      // Schätzer lässt Fälle ohne brauchbare Überlebenszeit weg, und ohne
      // diese Zeilen stünde in der Datei eine Fallzahl, die zu keinem der
      // Blätter daneben passt.
      const analysierteKohorte = patientsAfterFilters.filter(p => hatAuswertbareZeit(p, zeitEinheit));
      const nEventsAnalysiert = analysierteKohorte.filter(p => p.event).length;
      const covariates = stratificationConfig.criterion !== 'none'
        ? [stratificationConfig.criterion]
        : [];

      // Anzeigename einer Cox-Gruppe. Jedes andere Blatt der Datei führt die
      // Gruppen unter ihrem Namen; die Cox-Blätter trugen die technische
      // Kennung, also "adult" neben dem "Erwachsen" der Kurvenblätter, und
      // beim Nebeneinanderlegen liessen sich die Zeilen nicht mehr zuordnen.
      const gruppenName = (id: string) =>
        cleanLabel(activeGroups.find(g => g.id === id)?.name ?? id);

      // ---- Sheet 1: Metadata -----------------------------------------------
      {
        const ws = wb.addWorksheet('Metadata');
        ws.columns = [
          { header: 'Field', key: 'k', width: 32 },
          { header: 'Value', key: 'v', width: 60 },
        ];
        const rows: Array<[string, unknown]> = [
          ['analysis_timestamp', new Date().toISOString()],
          ['app_version', process.env.NEXT_PUBLIC_APP_VERSION || ''],
          ['build_commit', process.env.NEXT_PUBLIC_BUILD_COMMIT || ''],
          ['input_file_name', shared ? '' : (fileMeta.name ?? '')],
          ['input_file_source', shared ? '' : (fileMeta.source ?? '')],
          ['input_file_size_bytes', shared ? '' : safeNum(fileMeta.size)],
          ['input_file_uploaded_at', shared ? '' : (fileMeta.uploadedAt ?? '')],
          ['n_patients_total', patients.length],
          ['n_patients_after_filters', patientsAfterFilters.length],
          ['n_events', nEvents],
          ['n_censored', nCensored],
          ['n_patients_analyzed', analysierteKohorte.length],
          ['n_events_analyzed', nEventsAnalysiert],
          ['n_censored_analyzed', analysierteKohorte.length - nEventsAnalysiert],
          ['n_excluded_no_survival_time', patientsAfterFilters.length - analysierteKohorte.length],
          // Der Spaltenname verspricht Monate; bei einer Boxkohorte liegt
          // followUpStats in Tagen vor (siehe followUpInputs oben), deshalb
          // hier umrechnen statt die Spalte umzubenennen.
          ['follow_up_min_months', safeNum(alsMonate(followUpStats.min))],
          ['follow_up_q1_months', safeNum(alsMonate(followUpStats.q1))],
          ['follow_up_median_months', safeNum(alsMonate(followUpStats.median))],
          ['follow_up_q3_months', safeNum(alsMonate(followUpStats.q3))],
          ['follow_up_max_months', safeNum(alsMonate(followUpStats.max))],
          // Sagt, in welcher Einheit die Zeitwerte dieser Datei sonst stehen
          // (Kurvenblätter, Zeitpunkttabellen): tage bei einer Boxkohorte,
          // sonst monate.
          ['time_unit', zeitEinheit],
          ['time_unit_note', ZEIT_HINWEIS],
          ['reverse_km_median_followup', safeNum(reverseKM.median)],
          ['reverse_km_median_ci_lower', safeNum(reverseKM.ciLower)],
          ['reverse_km_median_ci_upper', safeNum(reverseKM.ciUpper)],
          // Nachbeobachtung und mediane ereignisfreie Zeit nach der
          // Boxvorschrift (kennzahlen.ts), auf derselben Kohorte wie die
          // Kurvenblätter. Keine _months-Endung: die Werte stehen in der
          // Einheit von time_unit, wie reverse_km_median_followup auch.
          ['followup_duration_median', safeNum(boxKennzahlen.nachbeobachtung?.median)],
          ['followup_duration_min', safeNum(boxKennzahlen.nachbeobachtung?.min)],
          ['followup_duration_max', safeNum(boxKennzahlen.nachbeobachtung?.max)],
          ['median_event_free_time', safeNum(boxKennzahlen.medianOhneEreignis)],
          ['stratification_variable', stratificationConfig.criterion],
          ['n_strata', activeCurves.length],
          ['ci_method', 'log-log'],
          // Ohne diese Zeilen sähe eine aus der Fachliteratur abgeleitete
          // Kurve in der Exportdatei genauso aus wie eine, die wörtlich im
          // Auswertungsblatt der Box steht.
          ['endpoint', endpunkt],
          ['endpoint_rule_origin', boxRegelFuer(oncoBoxProfileId, endpunkt)?.herkunft
            ?? endpunktById(endpunkt)?.regel?.herkunft ?? ''],
          ['endpoint_rule_source', boxRegelFuer(oncoBoxProfileId, endpunkt)?.quelle
            ?? endpunktById(endpunkt)?.regel?.quelle ?? ''],
          ['estimator', schaetzerFuer(endpunktById(endpunkt)!)],
          // Ohne diese Zeile läse final_survival wie eine Überlebenswahr-
          // scheinlichkeit, obwohl die Rate bei diesem Schätzer von null
          // steigt statt von eins zu fallen (der Tod ist ein konkurrierendes
          // Ereignis, kein Teil des Endpunkts).
          ['estimator_note', kurvenSchaetzer === 'kumulativeInzidenz'
            ? 'For this endpoint the estimator is kumulativeInzidenz: columns named survival or final_survival hold a cumulative incidence (rises from zero; death is a competing event), not a survival probability.'
            : ''],
          ['ties_method', coxSummary?.modelStats.tiesMethod ?? 'efron'],
          ['cox_reference_group', coxSummary ? gruppenName(coxSummary.referenceGroup) : ''],
          ['covariates_json', covariates.length ? JSON.stringify(covariates) : ''],
          ['filters_applied_json', Object.keys(filtersApplied).length ? JSON.stringify(filtersApplied) : ''],
          ['anonymized', mode === 'pseudonymized'],
          ['anonymization_note', mode === 'pseudonymized' ? tr('export.noteAnonymized') : ''],
          ['analysis_data_note', mode === 'pseudonymized' ? tr('export.noteOriginalData') : ''],
          ['year_boundary_note', mode === 'pseudonymized' ? tr('export.noteYearBoundary') : ''],
          ['patient_table_note', mode === 'noPatients' ? tr('export.noteNoPatients') : ''],
          ['locale', locale],
        ];
        rows.forEach(r => ws.addRow({ k: r[0], v: r[1] }));
        ws.getRow(1).font = { bold: true };
      }

      // ---- Sheet 2: Survival Table (bestehende Logik) -----------------------
      if (exportRows.length && mode !== 'noPatients') {
        const ws = wb.addWorksheet('Survival Table');
        const cols = Object.keys(exportRows[0]);
        // Wie in der Tabelle auf dem Bildschirm und im PDF: die Spalte months
        // trägt bei einer Boxkohorte Tage.
        ws.addRow(cols.map(col => (col === "months" ? zeitLabel : tableColumns[col] || col)));
        exportRows.forEach(row => ws.addRow(cols.map(col => {
          const val = row[col];
          if (val === undefined || val === null) return '';
          if (typeof val === 'number' && !isFinite(val)) return '';
          return val;
        })));
        ws.getRow(1).font = { bold: true };
      }

      // ---- Sheet 3: KM Curves (full step function, mit CI) ------------------
      {
        const ws = wb.addWorksheet('KM Curves');
        ws.columns = [
          { header: 'stratum', key: 'stratum', width: 24 },
          { header: 'time_months', key: 'time', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'survival', key: 'surv', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'std_err', key: 'se', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'ci_lower_95', key: 'lo', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'ci_upper_95', key: 'up', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'n_at_risk', key: 'risk', width: 12, style: { numFmt: INT_FMT } },
          { header: 'n_event', key: 'ev', width: 12, style: { numFmt: INT_FMT } },
          { header: 'n_censor', key: 'cn', width: 12, style: { numFmt: INT_FMT } },
        ];
        ws.getRow(1).font = { bold: true };
        for (const curve of activeCurves) {
          const dataIn = curve.data as SurvivalDataPoint[];
          const withCI = computeKaplanMeierCI(dataIn);
          for (const d of withCI) {
            // n_censor pro Zeile: in der Per-Patient-Form ist es 1 - events
            // (atRisk-Felder bleiben pro Zeile gleich; die Differenz zum nächsten atRisk
            //  wäre die exakte Zensierungsrate bei aggregierten Zeitpunkten)
            const nCensor = Math.max(0, 1 - (d.events || 0));
            ws.addRow({
              stratum: curve.name,
              // Der Spaltenname verspricht Monate; bei einer Boxkohorte
              // liegt d.time in Tagen vor, deshalb hier umrechnen statt die
              // Spalte umzubenennen.
              time: safeNum(alsMonate(d.time)),
              surv: safeNum(d.probability),
              se: safeNum(d.stdErr),
              lo: safeNum(d.lowerCI),
              up: safeNum(d.upperCI),
              risk: safeNum(d.atRisk),
              ev: safeNum(d.events),
              cn: nCensor,
            });
          }
        }
      }

      // ---- Sheet 4: KM Timepoints (3/6/12/24/36/48/60/120 Monate) ----------
      {
        const ws = wb.addWorksheet('KM Timepoints');
        ws.columns = [
          { header: 'stratum', key: 'stratum', width: 24 },
          { header: 'time_months', key: 'time', width: 14, style: { numFmt: INT_FMT } },
          { header: 'survival', key: 'surv', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'std_err', key: 'se', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'ci_lower_95', key: 'lo', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'ci_upper_95', key: 'up', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'n_at_risk', key: 'risk', width: 12, style: { numFmt: INT_FMT } },
          { header: 'n_events_cumulative', key: 'evcum', width: 18, style: { numFmt: INT_FMT } },
          { header: 'n_censored_cumulative', key: 'cncum', width: 20, style: { numFmt: INT_FMT } },
        ];
        ws.getRow(1).font = { bold: true };
        // Der Spaltenname verspricht Monate. Bei einer Boxkohorte liegt die
        // Kurve in Tagen vor: an den Tagesäquivalenten der Monatswerte
        // auswerten, aber den Monatswert selbst in die Spalte schreiben,
        // sonst stünde 3/6/12 Tage statt 3/6/12 Monate unter derselben
        // Überschrift.
        const auswertungszeitpunkte =
          zeitEinheit === "tage" ? KM_TIMEPOINTS.map((monate) => Math.round(monate * TAGE_PRO_MONAT)) : KM_TIMEPOINTS;
        for (const curve of activeCurves) {
          const withCI = computeKaplanMeierCI(curve.data as SurvivalDataPoint[]);
          const tps = computeKMAtTimepoints(withCI, auswertungszeitpunkte);
          tps.forEach((tp, i) => {
            ws.addRow({
              stratum: curve.name,
              time: KM_TIMEPOINTS[i],
              surv: safeNum(tp.survival),
              se: safeNum(tp.stdErr),
              lo: safeNum(tp.ciLower95),
              up: safeNum(tp.ciUpper95),
              risk: tp.nAtRisk,
              evcum: tp.nEventsCumulative,
              cncum: tp.nCensoredCumulative,
            });
          });
        }
      }

      // ---- Sheet 5: KM Summary (n, events, median + CI, q1 + CI, q3 + CI) --
      {
        const ws = wb.addWorksheet('KM Summary');
        ws.columns = [
          { header: 'stratum', key: 'stratum', width: 24 },
          { header: 'n', key: 'n', width: 10, style: { numFmt: INT_FMT } },
          { header: 'events', key: 'ev', width: 10, style: { numFmt: INT_FMT } },
          { header: 'median_survival', key: 'med', width: 16, style: { numFmt: FLOAT_FMT } },
          { header: 'median_ci_lower_95', key: 'medLo', width: 18, style: { numFmt: FLOAT_FMT } },
          { header: 'median_ci_upper_95', key: 'medUp', width: 18, style: { numFmt: FLOAT_FMT } },
          { header: 'median_reached', key: 'medReached', width: 14 },
          { header: 'q1_survival', key: 'q1', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'q1_ci_lower_95', key: 'q1Lo', width: 16, style: { numFmt: FLOAT_FMT } },
          { header: 'q1_ci_upper_95', key: 'q1Up', width: 16, style: { numFmt: FLOAT_FMT } },
          { header: 'q3_survival', key: 'q3', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'q3_ci_lower_95', key: 'q3Lo', width: 16, style: { numFmt: FLOAT_FMT } },
          { header: 'q3_ci_upper_95', key: 'q3Up', width: 16, style: { numFmt: FLOAT_FMT } },
          { header: 'max_follow_up', key: 'maxFu', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'final_survival', key: 'finS', width: 14, style: { numFmt: FLOAT_FMT } },
        ];
        ws.getRow(1).font = { bold: true };
        for (const curve of activeCurves) {
          const data = curve.data as SurvivalDataPoint[];
          const withCI: SurvivalDataPointWithCI[] = computeKaplanMeierCI(data);
          const median = computeKMPercentile(withCI, 0.5);
          const q1 = computeKMPercentile(withCI, 0.75); // S(t)≤0.75 → 25% Mortalität
          const q3 = computeKMPercentile(withCI, 0.25); // S(t)≤0.25 → 75% Mortalität
          // n = Patientenzahl im Stratum = at-risk am ersten Zeitpunkt (NICHT
          // data.length, das die Step-Funktions-Punkte zählt ~2x). events summiert
          // jetzt korrekt, da die horizontalen Step-Zeilen events=0 tragen.
          const n = data[0]?.atRisk ?? data.length;
          const events = data.reduce((s, d) => s + (d.events || 0), 0);
          const last = withCI[withCI.length - 1];
          ws.addRow({
            stratum: curve.name,
            n,
            ev: events,
            med: safeNum(median.time),
            medLo: safeNum(median.ciLower),
            medUp: safeNum(median.ciUpper),
            medReached: median.reached ? 'TRUE' : 'FALSE',
            q1: safeNum(q1.time),
            q1Lo: safeNum(q1.ciLower),
            q1Up: safeNum(q1.ciUpper),
            q3: safeNum(q3.time),
            q3Lo: safeNum(q3.ciLower),
            q3Up: safeNum(q3.ciUpper),
            maxFu: last ? safeNum(last.time) : '',
            finS: last ? safeNum(last.probability) : '',
          });
        }
        // Die Zeitspalten dieses Blatts tragen keine Einheit im Namen.
        ws.addRow([]);
        ws.addRow([ZEIT_HINWEIS]);
      }

      // ---- Sheet 6: Log-rank Overall ---------------------------------------
      {
        const ws = wb.addWorksheet('Log-rank Overall');
        ws.columns = [
          { header: 'Field', key: 'k', width: 24 },
          { header: 'Value', key: 'v', width: 24 },
        ];
        ws.getRow(1).font = { bold: true };
        if (logRankResult) {
          ws.addRow({ k: 'chi_squared', v: safeNum(logRankResult.chiSquared) });
          ws.getCell(`B${ws.rowCount}`).numFmt = FLOAT_FMT;
          ws.addRow({ k: 'degrees_of_freedom', v: logRankResult.df });
          ws.addRow({ k: 'n_groups', v: logRankResult.nGroups });
          const pRow = ws.addRow({ k: 'p_value' });
          fmtPValue(pRow.getCell('v'), logRankResult.pValue);
        } else {
          ws.addRow({ k: 'note', v: 'log-rank not computed (only one stratum)' });
        }
      }

      // ---- Sheet 7: Log-rank Per Group --------------------------------------
      {
        const ws = wb.addWorksheet('Log-rank Per Group');
        ws.columns = [
          { header: 'group', key: 'g', width: 24 },
          { header: 'observed', key: 'o', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'expected', key: 'e', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'variance', key: 'var', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'o_minus_e_sq_over_e', key: 'oe', width: 22, style: { numFmt: FLOAT_FMT } },
          { header: 'o_minus_e_sq_over_v', key: 'ov', width: 22, style: { numFmt: FLOAT_FMT } },
        ];
        ws.getRow(1).font = { bold: true };
        if (logRankResult) {
          for (const g of logRankResult.perGroup) {
            ws.addRow({
              g: g.group,
              o: safeNum(g.observed),
              e: safeNum(g.expected),
              var: safeNum(g.variance),
              oe: safeNum(g.oMinusESqOverE),
              ov: safeNum(g.oMinusESqOverV),
            });
          }
        } else {
          ws.addRow({ g: 'note', o: 'log-rank not computed (only one stratum)' });
        }
      }

      // ---- Sheet 7b: Log-rank Pairwise (post hoc, Holm-corrected) -----------
      {
        const ws = wb.addWorksheet('Log-rank Pairwise');
        ws.columns = [
          { header: 'group_a', key: 'a', width: 24 },
          { header: 'group_b', key: 'b', width: 24 },
          { header: 'chi_squared', key: 'chi', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'p_value', key: 'p', width: 14 },
          { header: 'p_value_adjusted', key: 'padj', width: 18 },
          { header: 'adjustment_method', key: 'adj', width: 18 },
          { header: 'method', key: 'm', width: 16 },
        ];
        ws.getRow(1).font = { bold: true };
        if (pairwiseResults.length) {
          for (const row of pairwiseResults) {
            const r = ws.addRow({
              a: row.groupA,
              b: row.groupB,
              chi: safeNum(row.chiSquared),
              adj: 'holm',
              m: plotDisplay.logRankMethod,
            });
            fmtPValue(r.getCell('p'), row.pValue);
            fmtPValue(r.getCell('padj'), row.pValueAdjusted);
          }
        } else {
          ws.addRow({ a: 'note', b: 'pairwise comparisons need at least three strata' });
        }
      }

      // ---- Sheet 8: Cox Per Group ------------------------------------------
      {
        const ws = wb.addWorksheet('Cox Per Group');
        ws.columns = [
          { header: 'group', key: 'g', width: 24 },
          { header: 'is_reference', key: 'isRef', width: 14 },
          { header: 'reference_level', key: 'refLevel', width: 24 },
          { header: 'n', key: 'n', width: 10, style: { numFmt: INT_FMT } },
          { header: 'events', key: 'ev', width: 10, style: { numFmt: INT_FMT } },
          { header: 'coefficient', key: 'b', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'standard_error', key: 'se', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'z_value', key: 'z', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'p_value', key: 'p', width: 14 },
          { header: 'hazard_ratio', key: 'hr', width: 14, style: { numFmt: FLOAT_FMT } },
          { header: 'hr_ci_lower_95', key: 'lo', width: 16, style: { numFmt: FLOAT_FMT } },
          { header: 'hr_ci_upper_95', key: 'up', width: 16, style: { numFmt: FLOAT_FMT } },
          { header: 'not_estimable', key: 'ne', width: 14 },
        ];
        ws.getRow(1).font = { bold: true };
        if (coxSummary) {
          for (const r of coxSummary.results) {
            // Zero-event group: HR/CI/p are not identifiable (complete separation),
            // so they are left blank instead of writing the optimiser's arbitrary
            // stopping point as if it were a usable number.
            const row = ws.addRow({
              g: gruppenName(r.group),
              isRef: r.group === coxSummary.referenceGroup ? 'TRUE' : 'FALSE',
              refLevel: gruppenName(coxSummary.referenceGroup),
              n: r.n,
              ev: r.events,
              b: safeNum(r.coefficient),
              se: safeNum(r.standardError),
              z: safeNum(r.zValue),
              hr: r.notEstimable ? '' : safeNum(r.hazardRatio),
              lo: r.notEstimable ? '' : safeNum(r.ciLower),
              up: r.notEstimable ? '' : safeNum(r.ciUpper),
              ne: r.notEstimable ? 'TRUE' : 'FALSE',
            });
            if (r.notEstimable) {
              row.getCell('p').value = '';
            } else {
              fmtPValue(row.getCell('p'), r.pValue);
            }
          }
        } else {
          ws.addRow({ g: 'note', isRef: 'cox model not yet rendered - open the Cox panel and re-export' });
        }
      }

      // ---- Sheet 9: Cox Model Stats ----------------------------------------
      {
        const ws = wb.addWorksheet('Cox Model Stats');
        ws.columns = [
          { header: 'Field', key: 'k', width: 30 },
          { header: 'Value', key: 'v', width: 24 },
        ];
        ws.getRow(1).font = { bold: true };
        if (coxSummary) {
          const m = coxSummary.modelStats;
          const addNum = (k: string, v: number, fmt = FLOAT_FMT) => {
            const r = ws.addRow({ k, v: safeNum(v) });
            r.getCell('v').numFmt = fmt;
          };
          addNum('log_likelihood', m.logLikelihood);
          addNum('log_likelihood_null', m.logLikelihoodNull);
          addNum('aic', m.aic);
          addNum('concordance', m.concordance);
          addNum('concordance_se', m.concordanceSE);
          addNum('lr_test_chi_squared', m.likelihoodRatioTest.chiSquared);
          ws.addRow({ k: 'lr_test_df', v: m.likelihoodRatioTest.df });
          fmtPValue(ws.addRow({ k: 'lr_test_p_value' }).getCell('v'), m.likelihoodRatioTest.pValue);
          addNum('wald_test_chi_squared', m.waldTest.chiSquared);
          ws.addRow({ k: 'wald_test_df', v: m.waldTest.df });
          fmtPValue(ws.addRow({ k: 'wald_test_p_value' }).getCell('v'), m.waldTest.pValue);
          addNum('score_test_chi_squared', m.scoreTest.chiSquared);
          ws.addRow({ k: 'score_test_df', v: m.scoreTest.df });
          fmtPValue(ws.addRow({ k: 'score_test_p_value' }).getCell('v'), m.scoreTest.pValue);
          // Proportional-hazards test (Schoenfeld residuals vs. log time):
          // global test plus one rho / p-value per coefficient.
          if (coxSummary.diagnostics) {
            fmtPValue(ws.addRow({ k: 'ph_test_global_p_value' }).getCell('v'), coxSummary.diagnostics.globalPValue);
            for (const pc of coxSummary.diagnostics.perCoefficient) {
              addNum(`ph_test_rho[${pc.name}]`, pc.rho);
              fmtPValue(ws.addRow({ k: `ph_test_p_value[${pc.name}]` }).getCell('v'), pc.pValue);
            }
          }
          ws.addRow({ k: 'n_observations', v: m.nObservations });
          ws.addRow({ k: 'n_events', v: m.nEvents });
          ws.addRow({ k: 'ties_method', v: m.tiesMethod });
          ws.addRow({ k: 'iterations', v: m.iterations });
          ws.addRow({ k: 'converged', v: m.converged ? 'TRUE' : 'FALSE' });
        } else {
          ws.addRow({ k: 'note', v: 'cox model not yet rendered - open the Cox panel and re-export' });
        }
      }

      // ---- Kennzahlen der Box ----------------------------------------------
      // Eigenes Blatt statt verstreuter Zeilen in Metadata: das
      // Auswertungsblatt der Box verlangt diese Aufstellung als
      // zusammenhängenden Nachweis, von den Primärfällen über die Ausschlüsse
      // je Grund zur Risikomenge und deren Aufteilung.
      if (oncoBoxProfileId) {
        const ws = wb.addWorksheet('Box Metrics');
        ws.columns = [
          { header: 'item', key: 'k', width: 46 },
          { header: 'n', key: 'n', width: 12 },
          { header: 'share_of_primary_cases', key: 'p', width: 24 },
        ];
        ws.getRow(1).font = { bold: true };
        ws.addRow({ k: 'box', n: oncoBoxProfileId });
        ws.addRow({ k: 'endpoint', n: endpunkt });
        if (!boxAufstellung) {
          // Keine Zahlen erfinden: für dieses Paar aus Box und Endpunkt gibt
          // es kein Auswertungsblatt.
          ws.addRow({ k: 'note', n: 'no evaluation sheet for survival analysis in this box specification' });
        } else {
          const a = boxAufstellung;
          const anteil = (wert: number): number => (a.primaerfaelle > 0 ? wert / a.primaerfaelle : 0);
          const zeile = (k: string, n: number) => {
            const r = ws.addRow({ k, n, p: anteil(n) });
            r.getCell('p').numFmt = '0.0%';
          };
          zeile('primary_cases', a.primaerfaelle);
          for (const aus of a.ausschluesse) zeile(`excluded[${aus.grund}]`, aus.anzahl);
          zeile('excluded_total', a.ausgeschlossen);
          zeile('at_risk_at_start', a.unterRisiko);
          zeile('with_event', a.mitEreignis);
          zeile('with_competing_event', a.konkurrenzereignis);
          zeile('censored_alive', a.zensiertLebend);
          zeile('censored_deceased', a.zensiertVerstorben);
          zeile('not_assignable', a.ohneBewertung);
          ws.addRow({ k: 'cohort_basis', n: 'primary cases after the filters applied in the app' });
        }
      }

      // ---- Datei generieren und Download triggern --------------------------
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // In sharing modes the source file name must not survive in the download
      // name either — it is the most visible part of the file and would defeat
      // the metadata masking above.
      const baseName = shared
        ? 'kaplan-meier'
        : (fileMeta.name || 'kaplan-meier').replace(/\.[^.]+$/, '');
      const modeSuffix = mode === 'pseudonymized'
        ? `-${tr('export.suffixPseudonymized')}`
        : mode === 'noPatients'
          ? `-${tr('export.suffixNoPatients')}`
          : '';
      a.download = `${baseName}-analysis-${new Date().toISOString().split('T')[0]}${modeSuffix}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleBackToUpload = () => {
    router.push("/");
  };

  const getYearRange = () => {
    if (patients.length === 0) return { min: 2000, max: new Date().getFullYear() };
    
    const years = patients.map(p => getDiagnosisDate(p).getFullYear());
    return {
      min: Math.min(...years),
      max: Math.max(...years)
    };
  };

  const yearRange = getYearRange();

  // Hat der Nutzer aktive Filter gesetzt?
  const hasActiveFilters = (
    filters.selectedGender.length > 0 ||
    filters.selectedAgeGroup.length > 0 ||
    filters.selectedICD10Codes.length > 0 ||
    filters.selectedTumorCategories.length > 0 ||
    filters.selectedStaging.length > 0 ||
    filters.selectedGrading.length > 0 ||
    filters.selectedPrimaryCase.length > 0 ||
    filters.selectedSpreadCategory.length > 0 ||
    !!filters.selectedYearRange.start ||
    !!filters.selectedYearRange.end
  );

  // Overallsurvival-Ansicht (keine Stratifizierung)
  const isOverallView = stratificationConfig.criterion === "none";
  // Der Modus steuert nur die Beschriftung des Plots. Er hängt deshalb am
  // Endpunkt, nicht mehr am Stratifizierungskriterium.
  const survivalMode: "overall" | "dfs" | "stratified" =
    endpunkt === "dfs"
      ? "dfs"
      : stratificationConfig.criterion === "none"
        ? "overall"
        : "stratified";

     // Create pie chart data for cohort sizes
   const pieChartData = useMemo(() => {
     // Wenn Stratifizierung aktiv ist, zeige die Gruppen
     if (survivalCurves.length > 0 && stratificationConfig.criterion !== "none") {
       return survivalCurves.map((curve, index) => {
         const groupPatients = endpunktKohorte.filter(patient => {
           const patientGroup = getPatientGroup(patient, stratificationConfig.criterion);
           return patientGroup === curve.id;
         });
         return {
           name: curve.name,
           value: groupPatients.length,
           color: curve.color
         };
       }).filter(item => item.value > 0);
     }
     
     // Ansonsten zeige die gefilterten vs. ungefilterten Patienten
     const totalPatients = patients.length;
     const filteredPatients = gefilterteKohorte.length;
     const excludedPatients = totalPatients - filteredPatients;
     
     const data = [];
     
     if (filteredPatients > 0) {
       data.push({
        name: tr("pie.filtered"),
         value: filteredPatients,
         color: "#2563eb"
       });
     }
     
     if (excludedPatients > 0) {
       data.push({
        name: tr("pie.excluded"),
         value: excludedPatients,
         color: "#e5e7eb"
       });
     }
     
     // Falls keine Filter aktiv sind, zeige nur die Gesamtanzahl
     if (data.length === 0) {
       data.push({
        name: tr("pie.all"),
         value: totalPatients,
         color: "#2563eb"
       });
     }
     
     return data;
     // endpunktKohorte liefert die Gruppengrößen, gefilterteKohorte den
     // Anteil der eingeschlossenen Fälle. Ohne beide blieb der Ring auf dem
     // Stand des vorigen Endpunkts stehen, während die Kurve daneben schon
     // den neuen zeigte.
   }, [patients, endpunktKohorte, gefilterteKohorte, stratificationConfig, survivalCurves]);

   // Bei OncoBox-Daten ist eine Zeile ein Primaerfall, nicht eine Person: eine
   // Person kann mehrere Primaerfaelle haben, etwa beidseitiges Karzinom. Bei
   // CSV und oBDS ist eine Zeile eine Person, dort bleibt die Beschriftung.
   const oncoBoxPersonCount = useMemo(() => {
     const personIds = new Set<string>();
     for (const patient of patients) {
       const personId = (patient as any).oncoBox?.patientId;
       if (personId) personIds.add(personId);
     }
     return personIds.size > 0 ? personIds.size : null;
   }, [patients]);

  // Label-Renderer f├╝r Pie-Chart: Prozentwerte schr├ñg im Segment platzieren
  const RADIAN = Math.PI / 180;
  const renderPiePercentLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (!percent || percent * 100 < 3) return null; // sehr kleine Segmente nicht beschriften
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const rotation = -midAngle; // Text parallel zum Segment
    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={13}
        transform={`rotate(${rotation}, ${x}, ${y})`}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  // Create patient-at-risk table data
  const patientAtRiskData = useMemo(() => {
    if (survivalCurves.length === 0) {
      return survivalData.map(point => ({
        time: point.time,
        [tr("allPatients")]: point.atRisk
      }));
    }

    // Get all unique time points
    const allTimes = Array.from(new Set(
      survivalCurves.flatMap(curve => curve.data.map(point => point.time))
    )).sort((a, b) => a - b);

    return allTimes.map(time => {
      const row: Record<string, number> = { time };
      survivalCurves.forEach(curve => {
        const point = curve.data.find(p => p.time === time);
        row[curve.name] = point ? point.atRisk : 0;
      });
      return row;
    });
  }, [survivalCurves, survivalData]);

  // Create survival data table
  //
  // PERF: this used to be a useMemo that ran in the render pipeline. For
  // METABRIC's ~2000 patients it iterated through the whole cohort
  // synchronously inside the render — that was the actual freeze users felt
  // after each stratification click (the spinner couldn't paint because
  // React's render was blocked walking ~2000 patients × getPatientGroup +
  // formatDate calls). Moving it to state + a deferred effect means the
  // render after a stratification change returns immediately using the
  // previous table data; the spinner paints; the heavy iteration runs in
  // the next two animation frames; then a fresh render with the new table.
  const [survivalTableData, setSurvivalTableData] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    const outer = requestAnimationFrame(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;

        // Zeit und Ereignis der Tabelle folgen dem Endpunkt, sonst stünden
        // Gesamtüberlebensmonate unter einer Spalte, deren Eins "Ereignis" heißt.
        const filtered = endpunktKohorte;

        const isPathologicalCriterion = (
          stratificationConfig.criterion === "tPathological" ||
          stratificationConfig.criterion === "tPathologicalOneDigit" ||
          stratificationConfig.criterion === "tPathologicalTwoDigit"
        );
        const isClinicalCriterion = (
          stratificationConfig.criterion === "tClinical" ||
          stratificationConfig.criterion === "tClinicalOneDigit" ||
          stratificationConfig.criterion === "tClinicalTwoDigit"
        );

        const usedPatients = isPathologicalCriterion
          ? filtered.filter(p => !!p.staging?.tPathological || !p.staging?.tClinical)
          : isClinicalCriterion
            ? filtered.filter(p => !!p.staging?.tClinical || !p.staging?.tPathological)
            : filtered;

        const getTCategoryDisplay = (p: Patient): string => {
          if (isPathologicalCriterion) {
            return p.staging?.tPathological || tr("notAvailable");
          }
          if (isClinicalCriterion) {
            return p.staging?.tClinical || tr("notAvailable");
          }
          return p.staging?.tCategory || tr("notAvailable");
        };

        const getStratificationGroupName = (patient: Patient): string => {
          if (stratificationConfig.criterion === "none") {
            return tr("notAvailable");
          }
          const groupId = getPatientGroup(patient, stratificationConfig.criterion);
          if (groupId == null) return tr("notAvailable");
          const group = stratificationConfig.groups.find(g => g.id === groupId);
          if (group) return group.name;
          // groupId bleibt die interne Kennung für den Bucket-Abgleich; nur die
          // Anzeige wird übersetzt, damit "Keine Angabe" auf Englisch nicht
          // durchschlägt, falls keine passende Gruppe gefunden wurde.
          if (groupId === "no_match") return tr("notAvailable");
          if (groupId === "Keine Angabe") return tr("notReported");
          return groupId;
        };

        const data = usedPatients.map(p => {
          const kennung = fallKennung(p);
          return {
          patientId: kennung.patientId || tr("notAvailable"),
          ...(zeigeFallnummer ? { caseId: kennung.caseId } : {}),
          probability: NaN,
          atRisk: NaN,
          events: p.event ? 1 : 0,
          months: typeof p.survivalTime === "number" ? p.survivalTime : NaN,
          tCategory: getTCategoryDisplay(p),
          primaryCase: istPrimaerfall(p.primaerfall) ? tr("yes") : tr("no"),
          icd10: p.tumorType || tr("notAvailable"),
          diagnosisDate: formatDate(p.diagnosisDate),
          vitalDate: formatDate(p.followupDate),
          ...(stratificationConfig.criterion !== "none" ? {
            stratificationGroup: getStratificationGroupName(p)
          } : {})
          };
        });

        if (cancelled) return;
        setSurvivalTableData(data);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
    };
  }, [endpunktKohorte, stratificationConfig]);

  // --- NEU: Filter- und Sortierfunktion f├╝r die Tabelle ---
  // Hilfsfunktion: Gibt den angezeigten Wert f├╝r eine Zelle zur├╝ck (wie in der Tabelle gerendert)
  function getDisplayValue(row: any, col: keyof typeof tableColumns): string {
    if (col === "probability") {
      const val = row[col];
      if (typeof val !== "number" || isNaN(val)) return tr("notAvailableShort");
      return `${(val * 100).toFixed(2)}%`;
    }
    if (col === "months") {
      const val = row[col];
      if (typeof val !== "number" || isNaN(val)) return tr("notAvailableShort");
      return val.toFixed(2);
    }
    if (col === "atRisk") {
      const val = row[col];
      if (typeof val !== "number" || isNaN(val)) return tr("notAvailableShort");
      return val.toString();
    }
    if (col === "events") {
      // Nur eine Beschriftung: beim krankheitsfreien Überleben heißt die 1
      // "Ereignis", sonst "verstorben". Der Endpunkt entscheidet das, nicht
      // die Stratifizierung.
      if (endpunkt === "dfs") {
        return row[col] === 1 ? tr("dfsEvent") : tr("censored");
      }
      return row[col] === 1 ? tr("dead") : tr("alive");
    }
    const val = row[col];
    if (val === null || val === undefined || (typeof val === "number" && isNaN(val))) return tr("notAvailableShort");
    return String(val);
  }

  // Memoised: was a plain function called on every render → for METABRIC's
  // ~2000 rows that's a per-paint cost on theme/legend/hover changes that have
  // nothing to do with table contents.
  const filteredSortedTableData = useMemo(() => {
    let data = survivalTableData;

    // Filter
    if (searchText.trim() !== "") {
      const lower = searchText.toLowerCase();
      if (searchColumn && searchColumn !== "" && (Object.keys(tableColumns) as string[]).includes(searchColumn)) {
        data = data.filter((row: any) =>
          getDisplayValue(row, searchColumn as keyof typeof tableColumns).toLowerCase().includes(lower)
        );
      } else {
        data = data.filter((row: any) =>
          (Object.keys(tableColumns) as Array<keyof typeof tableColumns>).some(col =>
            getDisplayValue(row, col).toLowerCase().includes(lower)
          )
        );
      }
    }

    // Sort
    if (sortConfig) {
      // Patienten- und Fallnummer sortieren immer gemeinsam, gleich welche der
      // beiden Spalten angeklickt wurde: Patientennummer zuerst, Fallnummer
      // danach. Nach der Fallnummer allein zu sortieren würde die Fälle einer
      // Person über die ganze Tabelle verstreuen, und damit ginge genau der
      // Zusammenhang verloren, für den die Spalte geteilt wurde.
      const paar = sortConfig.key === "patientId" || sortConfig.key === "caseId";
      const schluessel = paar ? ["patientId", "caseId"] : [sortConfig.key];
      data = [...data].sort((a: SurvivalTableRow, b: SurvivalTableRow) => {
        for (const key of schluessel) {
          const aVal = a[key];
          const bVal = b[key];
          if (aVal === undefined && bVal === undefined) continue;
          const richtung =
            typeof aVal === "number" && typeof bVal === "number"
              ? aVal - bVal
              : String(aVal ?? "").localeCompare(String(bVal ?? ""), undefined, { numeric: true });
          if (richtung !== 0) return sortConfig.direction === "asc" ? richtung : -richtung;
        }
        return 0;
      });
    }

    return data;
  }, [survivalTableData, searchText, searchColumn, sortConfig, tableColumns, stratificationConfig.criterion, tr]);


  // Log-Rank-Test berechnen (Methode aus PlotDisplay-Config)
  // Memoised: the test re-walks every event time across every group; running
  // it inline on every render slowed down stratification changes on cohorts
  // with many events.
  const logRankResult = useMemo(() => {
    // Exclude curves with no valid patients (data.length === 0 — these are
    // shown as greyed legend-only entries, see emptyCurves below). Strata with
    // patients but no events stay in the test: this matches R's survdiff and
    // lifelines' multivariate_logrank_test. A censored-only group with
    // patients at risk does carry information and contributes through its
    // O-E term; excluding it also silently changed the degrees of freedom.
    const curvesForTest = survivalCurves.filter(curve => curve.data.length > 0);
    if (curvesForTest.length <= 1) return null;
    const r = logRankTest(
      curvesForTest.map(curve => curve.data),
      curvesForTest.map(curve => curve.name),
      { method: plotDisplay.logRankMethod }
    );
    return r;
  }, [survivalCurves, plotDisplay.logRankMethod]);
  const pValue: number | null = logRankResult ? logRankResult.pValue : null;

  // --- Pagination logic ---
  tableData = filteredSortedTableData as SurvivalTableRow[];
  totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));
  pagedTableData = tableData.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  // Hilfsfunktion f├╝r lokales Datumsformat
  function formatDate(value: unknown) {
    const date = toDateSafe(value);
    return date ? date.toLocaleDateString(locale) : tr("notAvailable");
  }

  // Maps the real patient id to the unformatted dates, so the pseudonymisation
  // can shift actual Date objects. The table rows themselves only carry
  // already-formatted, locale-dependent strings — parsing those back would be
  // fragile.
  const rawDatesById = (): Map<string, RawPatientDates> => {
    const map = new Map<string, RawPatientDates>();
    for (const p of patients) {
      if (!p.id) continue;
      // Derselbe Schlüssel, den pseudonymizeTableRows aus der Zeile bildet.
      // Sonst fände die Datumsverschiebung nichts, und die Daten stünden im
      // pseudonymisierten Export unverschoben da.
      const kennung = fallKennung(p);
      map.set(zeilenSchluessel(kennung.patientId, kennung.caseId), {
        diagnosis: toDateSafe(p.diagnosisDate) ?? null,
        vital: toDateSafe(p.followupDate) ?? null,
      });
    }
    return map;
  };

  // Applies the chosen export mode to the patient-level rows.
  // "noPatients" is handled by the callers (they skip the table entirely).
  const applyExportMode = (rows: SurvivalTableRow[], mode: ExportMode): SurvivalTableRow[] =>
    mode === "pseudonymized"
      ? pseudonymizeTableRows(rows, rawDatesById(), (d) => formatDate(d))
      : rows;

  // Gruppen f├╝r aktuelle Stratifizierung (wie im SurvivalChart)
  const activeGroups = stratificationConfig.groups.filter(g => g.enabled);
  const groupCriterion = stratificationConfig.criterion;

  // Cox must run on the SAME cohort as the curves, pie chart and patient
  // table — i.e. after the sidebar filters and the anomaly exclusions. It used
  // to receive the raw `patients` array, so filtering e.g. by age group
  // "Senior" visibly updated everything on the page except the Cox model,
  // which silently kept reporting the full cohort.
  // Memoised so Cox doesn't see a new array identity on every render.
  // Cox rechnet auf survivalTime und event; beide kommen aus dem Endpunkt.
  const patientsForCoxAnalysis = endpunktKohorte;

  // Patienten f├╝r Cox-Analyse vorbereiten
  const coxAnalysisProps = {
    patients: patientsForCoxAnalysis,
    groups: activeGroups,
    groupCriterion,
  };

  // X-Ticks via niceTimeTicks - identical to the KM plot's own calculation
  // so the at-risk plot's ticks line up with the survival plot above it.
  const allCurves = survivalCurves.length > 0 ? survivalCurves : [{ name: tr('allPatients'), color: '#2563eb', data: survivalData }];

  // Empty strata (0 valid patients — curve.data is empty since
  // calculateKaplanMeier returns [] for N===0) must not be plotted or counted
  // in any statistic; they are shown as greyed legend-only entries instead
  // (merged into hiddenCurves below), the same treatment as a manually-hidden
  // group.
  const emptyCurves = allCurves.filter(c => c.data.length === 0);
  const nonEmptyCurves = allCurves.filter(c => c.data.length > 0);

  // Strata with patients but zero events are real and, since they are part of
  // the log-rank test (see logRankResult above - a censored-only group is
  // included there since 96542fa, matching R's survdiff/lifelines), plotted
  // and counted like any other group. They are drawn greyed and marked in the
  // legend (see styleCurve and the zeroEvent flag below) because a flat line
  // at 1.0 has no events and therefore no median. Always flagged in the
  // warning banner too.
  const zeroEventCurves = nonEmptyCurves.filter(
    c => !c.data.some((d: { events?: number }) => (d.events || 0) > 0)
  );

  const maxTime = Math.max(...allCurves.flatMap(curve => curve.data.map(d => d.time)), 0);
  // xTicks in der gewählten Achsen-Anzeigeeinheit (nicht der nativen der
  // Kohorte), damit sie zur x-Achse von KM-Plot und At-risk-Tabelle passen.
  const maxTimeAchse = convertTimeUnit(maxTime, nativeZeitEinheit, xAxisUnit);
  const xTicks = plotDisplay.showFiveYearTicks
    ? fixedFiveYearTicks(maxTimeAchse, xAxisUnit)
    : niceTimeTicks(maxTimeAchse, 10, xAxisUnit);
  // Remove common prefixes from group labels for y-axis and legends (used everywhere)
  const labelPrefixes = [
    tr("labels.tCategoryPrefix"),
    tr("labels.gradingPrefix"),
    tr("labels.stagingPrefix"),
    tr("labels.uiccPrefix"),
    tr("labels.primaryCasePrefix"),
    tr("labels.icd10Prefix"),
    tr("labels.diagnosisDatePrefix"),
    tr("labels.vitalDatePrefix"),
    tr("labels.genderPrefix"),
    tr("labels.ageGroupPrefix"),
    tr("labels.tumorCategoriesPrefix"),
    tr("labels.spreadCategoryPrefix"),
  ];
  const cleanLabel = (label: string) => {
    const trimmed = label.trim();
    const found = labelPrefixes.find(prefix =>
      prefix && trimmed.toLowerCase().startsWith(prefix.toLowerCase())
    );
    if (!found) return trimmed;
    return trimmed
      .slice(found.length)
      .replace(/^\s*[:\-ÔÇô]\s*/, "")
      .trim();
  };

  const activeCurves = nonEmptyCurves;

  // Post-hoc pairwise comparisons. The global test only says that SOME group
  // differs; these say which. Deliberately a WIDER group selection than the
  // global test: a group without events is dropped up there, but comparing it
  // against a group with events is well defined and is usually the starkest
  // row in the table (50 vs 50 patients, 25 events against none, gives
  // chi2 ~ 11, p ~ 0.0009). Only pairs where BOTH sides are event-free carry no
  // information at all; pairwiseLogRank drops those itself.
  // Must sit below cleanLabel: useMemo runs its factory during render, so
  // referencing a const declared further down would hit the temporal dead zone.
  const pairwiseResults = useMemo(() => {
    const usable = nonEmptyCurves;
    if (usable.length < 3) return []; // with 2 groups this just repeats the global test
    return pairwiseLogRank(
      usable.map(curve => curve.data as SurvivalDataPoint[]),
      usable.map(curve => cleanLabel(curve.name)),
      { method: plotDisplay.logRankMethod },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanLabel is a
    // stable pure formatter recreated each render; including it would rerun the
    // whole pairwise computation on every render.
  }, [nonEmptyCurves, plotDisplay.logRankMethod]);

  // Nat├╝rliche Sortierung der Gruppenlabels (alphanumerisch)
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  const groupLabels = activeCurves
    .map(curve => cleanLabel(curve.name))
    .sort((a, b) => collator.compare(a, b));

  const curveCounts = useMemo<Record<string, { n: number; events: number; ageMedian: number | null; ageQ1: number | null; ageQ3: number | null }>>(() => {
    const map: Record<string, { n: number; events: number; ageMedian: number | null; ageQ1: number | null; ageQ3: number | null }> = {};
    // Skip the bucketing work while curves are being recomputed (cleared on
    // every stratification change). Without this bail-out, the 1973-patient
    // classification pass ran synchronously inside the render between click
    // and worker result — visible as a ~30 ms freeze before the spinner
    // could even paint.
    if (survivalCurves.length === 0) return map;

    const filtered = endpunktKohorte;

    // Only count patients that actually reach a plotted KM curve. calculateKaplanMeier
    // (kaplan-meier.worker.ts) drops any patient without a usable survivalTime, so
    // counting raw group membership here (as before) overstated n whenever rows were
    // missing the dates needed to compute survival — e.g. the Munich CSV import, where
    // some rows lack DeathDate/LastContactDate and were silently excluded from the
    // curve but still counted, producing a legend n far larger than the plotted cohort.
    //
    // Über dieselbe Prüfung wie der Worker. Fest verdrahtet auf "> 0" zählte
    // diese Zeile in einer Tageskohorte ein Ereignis am Diagnosetag nicht mit,
    // obwohl die Kurve es zeigt: die Legende stand dann unter ihrer eigenen
    // Kurve.
    const validFiltered = filtered.filter(p => hatAuswertbareZeit(p, zeitEinheit));

    // PERF: bucket patients by group ONCE up front (O(n)). The previous
    // implementation ran `filtered.filter(getPatientGroup(...) === curveId)`
    // for every curve — O(n*g) with a per-patient hash/staging lookup. For
    // METABRIC × 6 PAM50 groups that was ~12k ops per recompute.
    const groupSizes = new Map<string, number>();
    // Ages collected per group, for the "median age" column in the per-group
    // statistics table. Age 0 is the sentinel for "unknown" throughout the
    // codebase (see age-group.ts), so it is excluded here just like there.
    const groupAges = new Map<string, number[]>();
    const allAges: number[] = [];
    for (const p of validFiltered) {
      const gid = getPatientGroup(p, stratificationConfig.criterion);
      if (gid == null) continue; // outside the analysed subset -> not counted
      groupSizes.set(gid, (groupSizes.get(gid) ?? 0) + 1);
      if (typeof p.age === "number" && Number.isFinite(p.age) && p.age > 0) {
        allAges.push(p.age);
        const ages = groupAges.get(gid);
        if (ages) ages.push(p.age); else groupAges.set(gid, [p.age]);
      }
    }

    // Linear-interpolation percentile, matching the `q` helper used for the
    // follow-up quartiles in exportTableAsExcel so both agree.
    const percentile = (sorted: number[], p: number) => {
      const n = sorted.length;
      const idx = (n - 1) * p;
      const lo = Math.floor(idx); const hi = Math.ceil(idx);
      return lo === hi ? sorted[lo] : sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
    };
    const ageStats = (ages: number[]): { ageMedian: number | null; ageQ1: number | null; ageQ3: number | null } => {
      if (!ages.length) return { ageMedian: null, ageQ1: null, ageQ3: null };
      const sorted = [...ages].sort((a, b) => a - b);
      return {
        ageMedian: percentile(sorted, 0.5),
        ageQ1: percentile(sorted, 0.25),
        ageQ3: percentile(sorted, 0.75),
      };
    };

    for (const curve of allCurves) {
      const eventCount = curve.data.reduce(
        (s: number, d: { events?: number }) => s + (d.events || 0),
        0
      );
      const curveId = "id" in curve ? curve.id : undefined;
      const n = curveId ? (groupSizes.get(curveId) ?? 0) : validFiltered.length;
      const ages = curveId ? (groupAges.get(curveId) ?? []) : allAges;
      map[cleanLabel(curve.name)] = { n, events: eventCount, ...ageStats(ages) };
    }
    return map;
  }, [allCurves, endpunktKohorte, stratificationConfig.criterion, survivalCurves.length, zeitEinheit]);

  const reverseKM = useMemo(() => {
    const inputs = endpunktKohorte
      .filter((p) => typeof p.survivalTime === "number" && p.survivalTime > 0)
      .map((p) => ({ time: p.survivalTime as number, event: !!p.event }));
    return computeReverseKMFollowUp(inputs);
  }, [endpunktKohorte]);

  // Diagnose: immer die analysierte Krebsart zeigen (nicht die Stratifizierung,
  // die ein eigenes Feld hat). Priorität: ICD-10-Filter -> Tumorkategorie-Filter
  // -> aus den tatsächlich analysierten Patienten abgeleitet.
  const diagnose = React.useMemo(() => {
    // 1. Explizit gewählte ICD-10-Codes
    if (filters.selectedICD10Codes && filters.selectedICD10Codes.length > 0) {
      return Array.from(new Set(filters.selectedICD10Codes)).sort().join(', ');
    }

    // 2. Tumorkategorie-Filter -> zugehörige ICD-10-Codes
    if (filters.selectedTumorCategories.length > 0) {
      const icd10Codes = new Set<string>();
      filters.selectedTumorCategories.forEach(categoryName => {
        const solidCategory = solidTumorCategoriesData.categories.find(cat => cat.name === categoryName);
        if (solidCategory) solidCategory.icd10.forEach(code => icd10Codes.add(code));
        const hematologicalCategory = hematologicalTumorCategoriesData.categories.find(cat => cat.name === categoryName);
        if (hematologicalCategory) hematologicalCategory.icd10.forEach(code => icd10Codes.add(code));
      });
      const codes = Array.from(icd10Codes).sort();
      if (codes.length > 0) return codes.join(', ');
    }

    // 3. Aus den analysierten Daten ableiten, damit immer sichtbar ist, welche
    //    Krebsart gerade ausgewertet wird. Wenige ICD-Codes -> auflisten; sonst
    //    auf die ICD-Kapitel (3-stellig) verdichten; bei einem gemischten
    //    Register-Kollektiv "Alle".
    const cohort = gefilterteKohorte;
    const codes = Array.from(new Set(
      cohort.map(p => String((p as { tumorType?: string }).tumorType ?? "").trim()).filter(Boolean)
    )).sort();
    if (codes.length === 0) return tr("all");
    if (codes.length <= 5) return codes.join(', ');
    const chapters = Array.from(new Set(codes.map(c => c.slice(0, 3)))).sort();
    if (chapters.length <= 5) return chapters.join(', ');
    return tr("all");
  }, [filters, gefilterteKohorte]);

  // Zeitraum: Zeige Diagnosezeitraum aus Filter
  const zeitraum = React.useMemo(() => {
    const start = filters.selectedYearRange.start || yearRange.min;
    const end = filters.selectedYearRange.end || yearRange.max;
    return `${start} - ${end}`;
  }, [filters.selectedYearRange, yearRange]);

  // Kurzzeile direkt über der Kurve: nennt Endpunkt, Zentrumstyp, Box,
  // Kohortengrösse und Zeiteinheit an einer Stelle, statt dass eine
  // betrachtende Person sie aus Sidebar, Statistikkarte und Exportdatei
  // zusammensuchen muss. Ein Screenshot der Kurve trägt diesen Kontext dann
  // gleich mit. Alle Werte sind bereits an anderer Stelle berechnet.
  const endpunktDefinition = endpunktById(endpunkt);
  // Dieselbe Herleitung wie für die Exportdatei (siehe endpoint_rule_origin
  // weiter unten): erst die Boxvorschrift, sonst die allgemeine Regel. Ohne
  // diese Kennzeichnung sähe eine aus der Fachliteratur abgeleitete Kurve auf
  // dem Bildschirm genauso aus wie eine wörtliche Vorschrift der Box.
  // Aufstellung nach dem Auswertungsblatt der Box. Grundlage ist die Kohorte
  // NACH den Filtern der Oberfläche, aber VOR den Ausschlüssen der Boxregel:
  // gerade die Ausschlüsse sollen ja gezählt werden. endpunktKohorte hat sie
  // bereits entfernt und taugt dafür nicht.
  //
  // null heisst: für dieses Paar aus Box und Endpunkt gibt es kein
  // Auswertungsblatt. Dann steht in der Karte ein Hinweis statt einer Tabelle.
  const boxAufstellung = useMemo(() => {
    const regel = boxRegelFuer(oncoBoxProfileId, endpunkt);
    if (!regel) return null;
    // .fall, nicht .oncoBox: der Wrapper trägt nur eine Auswahl der Felder,
      // der vollständige Fall hängt darunter. Eine Typumwandlung hier hat
      // genau diesen Fehler einmal vor dem Compiler versteckt, und jeder Fall
      // galt dann als "ohne Diagnosedatum".
    const faelle = gefilterteKohorte
      .map((patient) => patient.oncoBox?.fall)
      .filter((fall): fall is OncoBoxCase => Boolean(fall));
    return faelle.length > 0 ? kohortenaufstellung(faelle, regel) : null;
  }, [oncoBoxProfileId, endpunkt, gefilterteKohorte]);

  const plotKontextZeile = [
    endpunktDefinition
      ? tEp(`names.${endpunktDefinition.labelKey}`)
      : null,
    zentrumsTyp ? tEp(`centers.${zentrumsTyp}`) : null,
    oncoBoxProfileId ? tr("plotContext.box", { box: oncoBoxProfileId }) : null,
    tr("patientCount", { count: endpunktKohorte.length }),
    tr("plotContext.unit", { unit: zeitLabel }),
  ].filter((teil): teil is string => teil !== null).join(" · ");

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Card className="mt-4">
          <CardContent>
            <p>{tr("noData")}</p>
            <Button onClick={handleBackToUpload} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tr("backToHome")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Number of active filter categories inside the collapsible filter
  // section (ICD-10, tumor category, diagnosis year and primary case stay
  // always visible, so they are excluded here). Shown as a badge on the
  // collapse trigger so a filtered cohort never looks unfiltered while
  // collapsed.
  const collapsibleActiveFilterCount = [
    filters.selectedGender,
    filters.selectedAgeGroup,
    filters.selectedStaging,
    filters.selectedGrading,
    filters.selectedSpreadCategory,
  ].filter(values => values.length > 0).length;

  // Aktive Filter als Tags in der Filterkarte, ein Tag je Wert, damit das
  // Entfernen eines Tags nur genau diesen Wert löscht und keine Nachbarwerte
  // derselben Kategorie mitreisst. Das Jahresfenster ist kein Wertesatz und
  // bekommt deshalb einen einzigen Tag für den ganzen Bereich.
  const filterTags = useMemo(() => {
    const geschlechtLabel = (wert: string) =>
      t(wert === "male" ? "male" : wert === "female" ? "female" : "genderUnknown");
    const altersgruppeLabel = (wert: string) =>
      wert === "child" ? tr("ageGroupChildShort") : wert === "adult" ? tr("ageGroupAdultShort") : tr("ageGroupSeniorShort");
    const primaerfallLabel = (wert: string) => (wert === "primary" ? tr("primary") : tr("notPrimary"));
    return aktiveFilterEintraege(filters).map((eintrag) => {
      switch (eintrag.kategorie) {
        case "gender":
          return { id: eintrag.id, label: tr("appliedFilters.gender", { value: geschlechtLabel(eintrag.wert) }) };
        case "ageGroup":
          return { id: eintrag.id, label: tr("appliedFilters.ageGroup", { value: altersgruppeLabel(eintrag.wert) }) };
        case "icd10":
          return { id: eintrag.id, label: tr("appliedFilters.icd10", { value: eintrag.wert }) };
        case "tumorCategory":
          return { id: eintrag.id, label: tr("appliedFilters.tumorCategory", { value: eintrag.wert }) };
        case "staging":
          return { id: eintrag.id, label: tr("appliedFilters.staging", { value: eintrag.wert }) };
        case "grading":
          return { id: eintrag.id, label: tr("appliedFilters.grading", { value: eintrag.wert }) };
        case "primaryCase":
          return { id: eintrag.id, label: tr("appliedFilters.primaryCase", { value: primaerfallLabel(eintrag.wert) }) };
        case "spread":
          return { id: eintrag.id, label: tr("appliedFilters.spread", { value: eintrag.wert }) };
        case "yearRange":
          return {
            id: eintrag.id,
            label: tr("appliedFilters.years", {
              start: filters.selectedYearRange.start || yearRange.min,
              end: filters.selectedYearRange.end || yearRange.max,
            }),
          };
      }
    });
  }, [filters, tr, t, yearRange]);

  return (
    <div className="w-full max-w-full px-0 md:px-4 relative h-screen overflow-hidden overflow-x-hidden" ref={pageRef}>
      <div className="flex gap-6 h-full">
        {/* Linke, scrollbare Sidebar f├╝r Filter */}
        <aside
          className={`${isSidebarOpen ? 'w-72 md:w-72 lg:w-80' : 'w-0'} transition-[width] duration-200 shrink-0 sticky top-0 self-start h-full bg-background/95 backdrop-blur-sm border-r border-border overflow-hidden`}
          aria-hidden={!isSidebarOpen}
        >
          {/* pt/pb: ohne sie sitzt die erste Karte bündig an der oberen Kante
              des Scroll-Containers, ihr oberer Rahmen bleibt unsichtbar und
              sie wirkt abgeschnitten statt gerahmt. Dieselbe Lücke unten,
              damit die letzte Karte nicht ebenso knapp endet. */}
          <div className="flex flex-col h-full overflow-y-auto pr-2 pt-4 pb-6 no-scrollbar">

            <EndpointControl
              patients={patients}
              endpunkt={endpunkt}
              zentrumsTyp={zentrumsTyp}
              onEndpunktChange={setEndpunktPersisted}
              onZentrumsTypChange={setZentrumsTypPersisted}
            />

            {/* Obere: Filter (kompakt, scrollbar gesamt). Der Kartenabstand
                ist auf der Karte selbst überschrieben, nicht nur in Kopf und
                Inhalt: die Karte bringt "gap-6 py-6" mit (siehe card.tsx),
                das setzt den Leerraum zwischen Kopf und Inhalt sowie den
                Rand oben und unten. Ohne diese Überschreibung bliebe der
                Abstand gross, egal wie knapp Kopf und Inhalt selbst
                gepolstert sind. */}
            <Card className="shrink-0 gap-2 py-3" data-tour="filters">
              <Collapsible open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
                <CardHeader className="py-0">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Filter className="h-4 w-4" />
                    {tr("filters.title")}
                  </CardTitle>
                </CardHeader>
              <CardContent className="py-0 px-3">
                <FilterTagListe
                  tags={filterTags}
                  onRemove={(tagId) => setFiltersPersisted(prev => entferneFilterTag(prev, tagId))}
                  removeAriaLabel={(label) => tr("filters.tags.remove", { label })}
                />
                <div className="space-y-3 text-sm">
                {/* Always-visible core filters: ICD-10, tumor category, diagnosis year, primary case */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">ICD-10</Label>
                  <ICD10CodeMultiSelect
                    selectedCodes={filters.selectedICD10Codes}
                    onSelectionChange={(codes) => {
                      setFiltersPersisted(prev => {
                        const newFilters = {
                          ...prev,
                          selectedICD10Codes: codes,
                          // Wenn ICD-10 Code ausgew├ñhlt wird, Tumor-Kategorie-Filter zur├╝cksetzen
                          selectedTumorCategories: codes.length > 0 ? [] : prev.selectedTumorCategories
                        };
                        return newFilters;
                      });
                    }}
                    patients={patients}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">{t("tumorCategory")}</Label>
                  <TumorCategoryMultiSelect
                    selectedCategories={filters.selectedTumorCategories}
                    onSelectionChange={(categories) => {
                      setFiltersPersisted(prev => {
                        const newFilters = {
                          ...prev,
                          selectedTumorCategories: categories,
                          // Wenn Tumor-Kategorie ausgew├ñhlt wird, ICD-10 Filter zur├╝cksetzen
                          selectedICD10Codes: categories.length > 0 ? [] : prev.selectedICD10Codes
                        };
                        return newFilters;
                      });
                    }}
                    patients={patients}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{t("diagnosisYear")}</Label>
                  <YearRangePicker
                    selectedYearRange={filters.selectedYearRange}
                    onRangeChange={(range) => setFiltersPersisted(prev => ({ ...prev, selectedYearRange: range }))}
                    minYear={yearRange.min}
                    maxYear={yearRange.max}
                    placeholder={tr("filters.allYears")}
                  />
                </div>

                                 <div className="space-y-2">
                   <Label className="flex items-center gap-2">{tr("filters.primaryCase")}</Label>
                   <MultiSelect
                     options={[
                       { value: "primary", label: tr("filters.primary") },
                       { value: "secondary", label: tr("filters.notPrimary") }
                     ]}
                     selectedValues={filters.selectedPrimaryCase}
                     onSelectionChange={(values) => setFiltersPersisted(prev => ({ ...prev, selectedPrimaryCase: values }))}
                     placeholder={tr("filters.primaryPlaceholder")}
                   />
                 </div>
                </div>

                {/* Trigger for the collapsible section: quiet, full-width row so it
                    reads as a link-like affordance rather than a primary action. */}
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${isFilterPanelOpen ? "rotate-180" : ""}`}
                    />
                    {isFilterPanelOpen ? tr("filters.showLess") : tr("filters.showMore")}
                    {collapsibleActiveFilterCount > 0 && (
                      <Badge variant="secondary">{tr("filters.activeCount", { count: collapsibleActiveFilterCount })}</Badge>
                    )}
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                <div className="space-y-3 text-sm mt-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">{t("gender")}</Label>
                  <MultiSelect
                    options={[
                      { value: "male", label: t("male") },
                      { value: "female", label: t("female") },
                      // Darm 2.0 führt D und X, die hier als unbekannt landen.
                      // Ohne diese Option wären die Fälle nicht filterbar.
                      { value: "unknown", label: t("genderUnknown") }
                    ]}
                    selectedValues={filters.selectedGender}
                    onSelectionChange={(values) => setFiltersPersisted(prev => ({ ...prev, selectedGender: values }))}
                    placeholder={tr("filters.genderPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">{t("ageGroup")}</Label>
                  <MultiSelect
                    options={[
                      { value: "child", label: t("ageGroupChild") },
                      { value: "adult", label: t("ageGroupAdult") },
                      { value: "senior", label: t("ageGroupSenior") }
                    ]}
                    selectedValues={filters.selectedAgeGroup}
                    onSelectionChange={(values) => setFiltersPersisted(prev => ({ ...prev, selectedAgeGroup: values }))}
                    placeholder={tr("filters.ageGroupPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">{t("staging")}</Label>
                  <MultiSelect
                    options={Array.from(new Set(patients.map(p => p.staging?.uicc).filter((s): s is string => Boolean(s)))).map(stage => ({
                      value: stage,
                      label: stage
                    }))}
                    selectedValues={filters.selectedStaging}
                    onSelectionChange={(values) => setFiltersPersisted(prev => ({ ...prev, selectedStaging: values }))}
                    placeholder={tr("filters.stagingPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">{t("grading")}</Label>
                  <MultiSelect
                    options={Array.from(new Set(patients.map(p => p.grading).filter((g): g is string => Boolean(g)))).map(grade => ({
                      value: grade,
                      label: grade
                    }))}
                    selectedValues={filters.selectedGrading}
                    onSelectionChange={(values) => setFiltersPersisted(prev => ({ ...prev, selectedGrading: values }))}
                    placeholder={tr("filters.gradingPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">{t("spreadCategory")}</Label>
                  <MultiSelect
                    options={[
                      { value: "Lokal begrenzt", label: tr("filters.spread.local") },
                      { value: "Lokal fortgeschritten", label: tr("filters.spread.locallyAdvanced") },
                      { value: "Fortgeschritten", label: tr("filters.spread.advanced") },
                      { value: "Metastasiert", label: tr("filters.spread.metastatic") },
                      { value: "Unbekannt", label: tr("filters.spread.unknown") }
                    ]}
                    selectedValues={filters.selectedSpreadCategory}
                    onSelectionChange={(values) => setFiltersPersisted(prev => ({ ...prev, selectedSpreadCategory: values }))}
                    placeholder={tr("filters.spreadPlaceholder")}
                  />
                </div>
                </div>
                </CollapsibleContent>

                <div className="mt-3">
                  <Button onClick={resetAll} variant="outline" className="w-full" title={tr("filters.resetTitle")}>
                    {tr("filters.reset")}
                  </Button>
                </div>
              </CardContent>
              </Collapsible>
            </Card>

              <div className="shrink-0" data-tour="strat">
                <StratificationControl
                  patients={patients}
                  config={{
                    ...stratificationConfig,
                    groups: stratificationConfig.groups.map(g => ({
                      ...g,
                      name: cleanLabel(g.name),
                    })),
                  }}
                  onConfigChange={setStratificationConfig}
                  onBeforeChange={() => {
                    // Clear curves + set spinner IN THE SAME EVENT HANDLER as
                    // the criterion change, so React batches all four updates
                    // into one render. Otherwise the render after the click
                    // showed the OLD curves until the KM effect fired and
                    // cleared them in a second render — visible as a flash.
                    setIsGlobalLoading(true);
                    setIsLoadingPlots(true);
                    setSurvivalCurves([]);
                    setSurvivalData([]);
                  }}
                  selectedTumorCategories={filters.selectedTumorCategories}
                  selectedICD10Codes={filters.selectedICD10Codes}
                  extraColumns={extraColumns ?? undefined}
                  zeitEinheit={zeitEinheit}
                />

                {/* Export Button f├╝r Entity Staging Validation */}
                {stratificationConfig.criterion === "entityStaging" && (
                  <Button 
                    onClick={() => {
                      const exportData = generateStagingExport(gefilterteKohorte);
                      const csv = exportToCSV(exportData);
                      downloadCSV(csv, `staging-validation-${new Date().toISOString().split('T')[0]}.csv`);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Staging-Zuordnung exportieren (CSV)
                  </Button>
                )}
              </div>

              {/* Trennt die Karten, die das Ergebnis verändern (Endpunkt,
                  Filter, Stratifizierung, oben), von denen, die nur die
                  Darstellung betreffen (unten). Nur eine ruhige Linie mit
                  Beschriftung, keine eigene Kartenstruktur. */}
              <div className="flex items-center gap-2 px-1 pt-3 pb-1 shrink-0">
                <span className="h-px flex-1 bg-border" />
                <span className="km-label uppercase tracking-wide">{tr("sidebar.presentation")}</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="shrink-0" data-tour="plot-display">
                <PlotDisplayControl config={plotDisplay} onToggle={updatePlotToggle} onLogRankMethodChange={updateLogRankMethod} onPaletteChange={updatePalette} />
              </div>
          </div>
        </aside>
        {/* Fixer Sidebar-Toggle-Button links, immer sichtbar */}
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          title={isSidebarOpen ? tr("filters.collapse") : tr("filters.expand")}
          className={`fixed top-20 z-20 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border bg-background border-border shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input`}
          style={{ left: toggleLeft }}
        >
          {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        {/* Hauptbereich */}
        <div className="flex-1 min-w-0 h-full overflow-auto space-y-6 no-scrollbar border-border pl-8 pt-6">
      {SHOW_GLOBAL_RESULTS_SPINNER && isGlobalLoading && (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <div className="mt-2 text-sm text-gray-700">{tr("loading")}</div>
        </div>
      )}
      {/* Header: back (left), title (centre), prominent PDF report CTA (right) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button onClick={handleBackToUpload} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tr("backToSelection")}
        </Button>
        {/* Titel und Kohortengrösse als ein Block. Die Überschrift nennt den
            gerechneten Datensatz, nicht mehr den Untertitel der Anwendung: der
            stand über jeder Auswertung gleich und half beim Nebeneinanderlegen
            zweier Ergebnisse nicht weiter. Darunter Quelle und Fallzahl. */}
        <div className="flex flex-col items-center text-center">
          <h1 className="km-heading">
            {datensatz
              ? tr("pageTitle", { title: datensatz.istSzenario ? t(`testData.scenarios.${datensatz.name}.name`) : datensatz.name })
              : tr("pageTitleFallback")}
          </h1>
          <p className="km-label mt-1">
            {datensatz ? `${tr(`datasetSource.${datensatz.quelle}`)} · ` : ""}
            {tr("analysisCount", { count: gefilterteKohorte.length })}
          </p>
        </div>
        <Popover open={pdfOpen} onOpenChange={setPdfOpen}>
          <PopoverTrigger asChild>
            <Button size="lg" className="gap-2 shadow-sm" title={tr("pdf.saveTitle")} data-tour="export">
              <Download className="h-4 w-4" />
              {tr("pdf.saveButton")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <ExportModePicker value={pdfMode} onChange={setPdfMode} />
            <Button
              size="sm"
              className="w-full"
              onClick={() => { setPdfOpen(false); exportPageAsPDF({ mode: pdfMode }); }}
            >
              {tr("pdf.generate")}
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      <TourLayer page="results" onCrossForward={() => router.push("/help")} />

      {/* Kompakter Hinweis statt des ganzen Panels hier oben: die Seite soll
          mit dem Ergebnis öffnen, nicht mit Warnungen. Das Panel selbst sitzt
          jetzt unter der Kurvenkarte, siehe dort. Ohne Befunde erscheint hier
          nichts. */}
      {anomalyFindingsCount > 0 && (
        <button
          type="button"
          onClick={scrollToAnomalyPanel}
          className="flex w-fit items-center gap-2 text-sm text-yellow-700 hover:underline dark:text-yellow-400"
        >
          <AlertTriangle className="h-4 w-4" />
          {tr("anomalyIndicator", { count: anomalyFindingsCount })}
        </button>
      )}

      {/* Angewendete Filter: als Tags in der Filterkarte der Sidebar, siehe
          FilterTagListe dort. */}
          <div className="overflow-x-auto">
            {/* Tabelle entfernt, wird nur im Survival-Card angezeigt */}
          </div>
      {/* Filters ehemals oben: in Sidebar verschoben */}

      {/* Stratification Controls in Sidebar verschoben */}

      {/* Results Section */}
      <div className="space-y-6">
        {/* Legende ├╝ber dem Plot (entfernt) */}
        {/* Kaplan-Meier Chart */}
        {/* gap-2 py-3: gleicher Kartenabstand wie in der Sidebar (siehe dort),
            damit der Leerraum zwischen Kartenkopf und -inhalt in der ganzen
            Ansicht gleich knapp bleibt. */}
        <Card className="relative z-0 gap-2 py-3">
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center justify-between">
              <span className="km-card-title">
                {kurvenSchaetzer === "kumulativeInzidenz" ? t("cumulativeIncidenceCurve") : t("survivalCurve")}
              </span>
              <div className="flex gap-2" data-tour="chart-exports">
                <Button onClick={exportChartAsPNG} variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  PNG
                </Button>
                <Button onClick={exportChartAsSVG} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  SVG
                </Button>
                <Button onClick={exportChart} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-0">
            {/* Kopfzeile modern und dynamisch */}
            <div className="mb-4 flex flex-col items-center">
              <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 mb-2 shadow-sm">
                <div className="flex flex-wrap justify-center gap-6">
                  <div className="flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-gray-500 dark:text-gray-300">{tr("summary.diagnosis")}</span>
                    <span className="font-semibold text-base">{diagnose}</span>
                  </div>
                  <div className="flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-gray-500 dark:text-gray-300">{tr("summary.timeRange")}</span>
                    <span className="font-semibold text-base">{zeitraum}</span>
                  </div>
                  <div className="flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-gray-500 dark:text-gray-300">{tr("summary.stratification")}</span>
                    <span className="font-semibold text-base">{
                      stratificationConfig.criterion === "none"
                        ? tr("notAvailableShort")
                        : stratificationConfig.criterion.startsWith("extra:")
                          ? stratificationConfig.criterion.slice("extra:".length)
                          : (t.has(stratificationConfig.criterion) ? t(stratificationConfig.criterion) : tr("notAvailableShort"))
                    }</span>
                  </div>
                  <div className="flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-gray-500 dark:text-gray-300">{tr("summary.reportDate")}</span>
                    <span className="font-semibold text-base">{formatDate(new Date())}</span>
                  </div>
                  <div className="flex flex-col items-center min-w-[120px]">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-300">
                      {tr("summary.pValue")}
                      {/* Caveat about multiple testing, surfaced exactly where the
                          p-value is read. A permanent banner would be tuned out
                          (the page already has one for zero-event strata) and
                          would also nag users who test a single pre-specified
                          hypothesis. The trigger is a real <button> so it is
                          reachable by keyboard, unlike the <span> pattern used in
                          stratification-control.tsx. */}
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={tr("pHacking.infoAriaLabel")}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs text-xs leading-snug">
                            {tr("pHacking.tooltip")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="font-semibold text-base">{
                      pValue !== null
                        ? (pValue > 0.001
                            ? pValue.toFixed(3)
                            : '<0.001')
                        : tr("summary.pValueUnavailable")
                    }</span>
                  </div>
                </div>
                {/* Kontextzeile im Kopf der Kurvenkarte, nicht als lose Zeile
                    darüber: sie beantwortet dieselbe Frage wie Diagnose und
                    Zeitraum daneben, nämlich worauf sich die Kurve bezieht. Ein
                    Screenshot des Kartenkopfs trägt damit Endpunkt, Herkunft der
                    Regel, Kohortengrösse und Zeiteinheit gleich mit. */}
                <p className="km-label mt-3 border-t border-gray-200 pt-3 text-center dark:border-neutral-700">
                  {plotKontextZeile}
                </p>
              </div>
            </div>
            {extraColumns && extraColumns.warnings.length > 0 && (
              <UnitConversionBanner warnings={extraColumns.warnings} />
            )}
            {zeroEventCurves.length > 0 && plotDisplay.showZeroEventWarning && (
              <div className="flex items-start gap-3 p-3 mb-3 rounded-lg border border-yellow-500/60 bg-yellow-50/40 dark:bg-yellow-950/20">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="flex-1 text-sm">
                  {tr("zeroEventWarning", {
                    count: zeroEventCurves.length,
                    names: zeroEventCurves.map(c => cleanLabel(c.name)).join(", "),
                  })}
                </p>
              </div>
            )}
            <div ref={chartRef} className="w-full">
              <div data-tour="km-chart">
              {isLoadingPlots ? (
                // While a stratification change is in flight, swap the entire
                // plot out for a tall spinner panel. Earlier attempts used an
                // absolute overlay over the plot, but Plotly's empty-state
                // layout left an open white background that visually read as
                // "empty plot, no spinner" — especially with the modest
                // overlay opacity. Conditional render guarantees the user
                // only sees the spinner during loading.
                <div
                  className="flex w-full items-center justify-center bg-card border border-border rounded-md"
                  style={{ height: Math.max(560, Math.min(900, typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.78) : 720)) }}
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex flex-col items-center gap-4">
                    <svg
                      className="animate-spin h-16 w-16 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span className="text-base font-medium text-foreground">
                      {tr("loadingPlot")}
                    </span>
                  </div>
                </div>
              ) : (
              <KaplanMeierPlotly
                curves={(() => {
                  if (
                    stratificationConfig.criterion === "ageGroup" &&
                    survivalCurves.length > 1 &&
                    stratificationConfig.groups
                  ) {
                    // Sort curves to match group order (child, adult, senior)
                    const groupOrder = stratificationConfig.groups
                      .filter(g => g.enabled)
                      .map(g => g.id);
                    const activeNames = new Set(activeCurves.map(c => c.name));
                    return survivalCurves
                      .filter(c => activeNames.has(c.name)) // empty -> greyed legend entry only
                      .sort((a, b) => groupOrder.indexOf(a.id) - groupOrder.indexOf(b.id))
                      .map(curve => ({
                        ...styleCurve(curve),
                        name: cleanLabel(curve.name),
                        zeroEvent: !curve.data.some((d: { events?: number }) => (d.events || 0) > 0),
                      }));
                  }
                  return activeCurves.map(curve => ({
                    ...styleCurve(curve),
                    name: cleanLabel(curve.name),
                    zeroEvent: !curve.data.some((d: { events?: number }) => (d.events || 0) > 0),
                  }));
                  // Converted to the chosen axis-display unit right before the
                  // plot receives it - everything downstream (curve, CI band,
                  // markers, median line, hover text) reads that converted x.
                })().map(curve => ({ ...curve, data: toXAxisUnit(curve.data) }))}
                height={Math.max(560, Math.min(900, typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.78) : 720))}
                title={undefined}
                survivalMode={survivalMode}
                endpoint={endpunkt === "ttft" ? "ttft" : "overall"}
                stratificationLabel={survivalMode === "overall"
                  ? tr("overallSurvivalLabel")
                  : survivalMode === "dfs"
                    ? tr("dfsLabel")
                    : stratificationConfig.criterion.startsWith("extra:")
                      ? stratificationConfig.criterion.slice("extra:".length)
                      : (t.has(stratificationConfig.criterion) ? t(stratificationConfig.criterion) : stratificationConfig.criterion)}
                onRendered={() => {
                  // Plotly fires onAfterPlot for the EMPTY plot too (right
                  // after we clear curves on a stratification change). If we
                  // unconditionally setIsLoadingPlots(false) here, the spinner
                  // disappears the moment the empty plot lays out — long
                  // before the worker comes back with real curves. Only clear
                  // the loading state once there are actual curves to show.
                  if (survivalCurves.length > 0) setIsLoadingPlots(false);
                }}
                showMedianLines={plotDisplay.showMedianLines}
                showConfidenceIntervals={plotDisplay.showConfidenceIntervals}
                showLegendCounts={plotDisplay.showLegendCounts}
                showPValueAnnotation={plotDisplay.showPValueAnnotation}
                showMedianFollowUp={plotDisplay.showMedianFollowUp}
                pValue={pValue}
                medianFollowUpMonths={reverseKM.median}
                curveCounts={curveCounts}
                onCurveToggle={(legendGroup) => {
                  setStratificationConfigPersisted(cfg => {
                    // Search all groups (enabled AND disabled) so clicking a
                    // greyed-out legendonly entry can also re-enable a curve.
                    const match = cfg.groups.find(g => cleanLabel(g.name) === legendGroup);
                    if (!match) return cfg;
                    const visible = cfg.groups.filter(g => g.enabled);
                    // Never hide the last remaining visible curve.
                    if (visible.length <= 1 && visible[0]?.id === match.id && match.enabled) return cfg;
                    return { ...cfg, groups: cfg.groups.map(g => g.id === match.id ? { ...g, enabled: !g.enabled } : g) };
                  });
                }}
                hiddenCurves={
                  stratificationConfig.criterion !== 'none' && survivalCurves.length > 0
                    ? [
                        ...stratificationConfig.groups
                          .filter(g => !g.enabled)
                          .map(g => ({ name: cleanLabel(g.name), color: g.color })),
                        // Empty strata (0 valid patients): greyed out like a manually
                        // hidden group, but the user cannot re-enable them by clicking —
                        // there is no data to show regardless.
                        ...emptyCurves.map(c => ({ name: cleanLabel(c.name), color: c.color })),
                      ]
                    : []
                }
                xAxisLabel={xAxisDisplayLabel}
                timeUnit={xAxisUnit}
                fiveYearTicks={plotDisplay.showFiveYearTicks}
                medianFollowUpUnitLabel={zeitLabel}
                screenshotModus={plotDisplay.screenshotMode}
              />
              )}
              </div>
              <KennzahlenZeile
                patienten={endpunktKohorte}
                zeitEinheit={zeitEinheit}
                einheitLabel={zeitLabel}
                kurvenSchaetzer={kurvenSchaetzer}
                medianFollowUpReverseKm={reverseKM.median}
              />
              <div className="mt-1">
                <PatientsAtRiskPlot
                  curves={activeCurves.length > 0 ? activeCurves.map(curve => ({ ...styleCurve(curve), name: cleanLabel(curve.name), data: toXAxisUnit(curve.data) })) : []}
                  xTicks={xTicks || []}
                  groupLabels={groupLabels || []}
                  unstratified={isOverallView}
                  xAxisLabel={xAxisDisplayLabel}
                  screenshotModus={plotDisplay.screenshotMode}
                />
              </div>
              {plotDisplay.showPairwiseComparisons && pairwiseResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="km-card-title mb-2">{tr("pairwise.title")}</h3>
                  <table className="w-full text-xs border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-1 text-left">{tr("pairwise.groupA")}</th>
                        <th className="p-1 text-left">{tr("pairwise.groupB")}</th>
                        <th className="p-1 text-right">{tr("pairwise.pRaw")}</th>
                        <th className="p-1 text-right">{tr("pairwise.pAdjusted")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pairwiseResults.map((row) => (
                        <tr key={`${row.groupA}|${row.groupB}`} className="border-t">
                          <td className="p-1">{row.groupA}</td>
                          <td className="p-1">{row.groupB}</td>
                          <td className="p-1 text-right font-mono">
                            {row.pValue > 0.001 ? row.pValue.toFixed(4) : '<0.001'}
                          </td>
                          <td className="p-1 text-right font-mono">
                            {row.pValueAdjusted > 0.001 ? row.pValueAdjusted.toFixed(4) : '<0.001'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* No significance stars on purpose: they invite reading off a
                      threshold, which is exactly what the multiple-testing
                      caveat next to the headline p-value warns against. */}
                  <p className="km-label mt-1">
                    {tr("pairwise.caption", { count: pairwiseResults.length })}
                  </p>
                </div>
              )}
            </div>
            {/* Statistik-Grid ganz unten */}
            <div className="mt-4">
              {activeCurves.length > 1 ? (
                // Compare groups at a glance: one row per group, metrics in columns.
                // Mirrors the landmark table above for a consistent, full-width look.
                <div className="overflow-x-auto">
                  <h4 className="km-card-title mb-2">
                    {tr(kurvenSchaetzer === "kumulativeInzidenz" ? "stats.perGroupTitleIncidence" : "stats.perGroupTitle")}
                  </h4>
                  <table className="text-sm border-collapse w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3 font-medium">{tr("table.stratificationGroup")}</th>
                        <th className="text-right py-2 px-3 font-medium">
                          {tr(kurvenSchaetzer === "kumulativeInzidenz" ? "stats.medianIncidence" : "stats.medianSurvival")}
                        </th>
                        <th className="text-right py-2 px-3 font-medium">
                          {tr(kurvenSchaetzer === "kumulativeInzidenz" ? "stats.incidence25" : "stats.survival25")}
                        </th>
                        <th className="text-right py-2 px-3 font-medium">{tr("stats.maxFollowUp")}</th>
                        <th className="text-right py-2 px-3 font-medium">{tr("stats.medianAge")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCurves.map((curve) => {
                        const stats = getKaplanMeierStatistics(curve.data, { notReachedLabel: t("plot.notReached") });
                        if (!stats) return null;
                        const fmt = (v: number | string) => typeof v === 'number' ? `${v} ${zeitLabel}` : v;
                        const label = cleanLabel(curve.name);
                        const ageInfo = curveCounts[label];
                        const fmtAge = ageInfo && ageInfo.ageMedian !== null && ageInfo.ageQ1 !== null && ageInfo.ageQ3 !== null
                          ? `${Math.round(ageInfo.ageMedian)} (${Math.round(ageInfo.ageQ1)}-${Math.round(ageInfo.ageQ3)})`
                          : tr("notAvailableShort");
                        return (
                          <tr key={label} className="border-b border-border/40">
                            <td className="py-2 pr-3">
                              <span className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ background: curve.color }} aria-hidden="true" />
                                <span>{label}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums">{fmt(stats.medianSurvival)}</td>
                            <td className="py-2 px-3 text-right tabular-nums">{fmt(stats.survival25)}</td>
                            <td className="py-2 px-3 text-right tabular-nums">{stats.maxFollowUp} {zeitLabel}</td>
                            <td className="py-2 px-3 text-right tabular-nums">{fmtAge}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (() => {
                const curve = activeCurves[0];
                const stats = curve ? getKaplanMeierStatistics(curve.data, { notReachedLabel: t("plot.notReached") }) : null;
                if (!stats) return null;
                return (
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 max-w-xl mx-auto">
                    <div className="text-center">
                      <div className="font-medium">
                        {tr(kurvenSchaetzer === "kumulativeInzidenz" ? "stats.medianIncidence" : "stats.medianSurvival")}
                      </div>
                      <div className="tabular-nums">{typeof stats.medianSurvival === 'number' ? `${stats.medianSurvival} ${zeitLabel}` : stats.medianSurvival}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">
                        {tr(kurvenSchaetzer === "kumulativeInzidenz" ? "stats.incidence25" : "stats.survival25")}
                      </div>
                      <div className="tabular-nums">{typeof stats.survival25 === 'number' ? `${stats.survival25} ${zeitLabel}` : stats.survival25}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{tr("stats.maxFollowUp")}</div>
                      <div className="tabular-nums">{stats.maxFollowUp} {zeitLabel}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Anomalie-Panel: unter der Kurvenkarte statt darüber, damit die
            Seite mit dem Ergebnis öffnet. Der kompakte Hinweis oben scrollt
            hierher. Ohne Befunde und ohne Ausschlüsse rendert die Komponente
            selbst nichts. */}
        <AnomalyPanel
          patients={patients}
          excludedIds={excludedIds}
          onExcludedChange={updateExcluded}
          forceOpen={tourStep?.step.id === "anomalies"}
          expandSignal={anomalyExpandSignal}
        />

        {/* Landmark-Tabelle: ein Ergebnis, keine Kurvendekoration. Sitzt zwar
            optisch unter der Kurve, ist aber eine eigenständige Auswertung,
            deshalb eine eigene Karte statt ein Abschnitt in der Kurvenkarte. */}
        {plotDisplay.showLandmarkTable && activeCurves.length > 0 && (
          <Card className="gap-2 py-3">
            <CardHeader>
              <CardTitle className="km-card-title">
                {tLm(kurvenSchaetzer === "kumulativeInzidenz" ? "titleIncidence" : "title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LandmarkSurvivalTable
                curves={activeCurves.map((c) => ({ ...c, name: cleanLabel(c.name) }))}
                // 1/3/5 Jahre in Tagen statt Monaten: die Kurve einer
                // Boxkohorte rechnet in Tagen, sonst fragte die Tabelle
                // 12/36/60 Tage nach Diagnose ab und zeigte das unter der
                // Überschrift "1 Jahr" bis "5 Jahre".
                landmarkTimes={zeitEinheit === "tage" ? [365, 1096, 1826] : undefined}
                showTitle={false}
              />
            </CardContent>
          </Card>
        )}
        {/* Statistics with Pie Chart - verbessertes Layout */}
        <Card className="relative gap-2 py-3" data-tour="stats">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="km-card-title">{tr("statsCard.title")}</CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={exportStatisticsAsPNG} variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" /> PNG
                </Button>
                <Button onClick={exportStatisticsAsSVG} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> SVG
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={statisticsRef} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* KPI-Kacheln */}
              <div ref={cohortKpiRef} className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border-2 p-4 bg-white/50 dark:bg-neutral-800/70">
                  <div className="km-label">
                    {oncoBoxPersonCount === null
                      ? tr("statsCard.totalPatients")
                      : tr("statsCard.totalPrimaryCases")}
                  </div>
                  <div className="km-data mt-1">{patients.length}</div>
                  {oncoBoxPersonCount !== null && (
                    <div className="km-label mt-1">
                      {tr("statsCard.fromPersons", { count: oncoBoxPersonCount })}
                    </div>
                  )}
                      </div>
                <div className="rounded-lg border-2 p-4 bg-white/50 dark:bg-neutral-800/70">
                  <div className="km-label">{tr("statsCard.filteredPatients")}</div>
                  <div className="km-data mt-1">{gefilterteKohorte.length}</div>
                    </div>
                <div className="rounded-lg border-2 p-4 bg-white/50 dark:bg-neutral-800/70">
                  <div className="km-label">{tr("statsCard.events")}</div>
                  <div className="km-data mt-1">{endpunktKohorte.filter(p => p.event).length}</div>
                      </div>
                {survivalCurves.length === 0 && survivalData.length > 0 && (
                  <div className="col-span-2 sm:col-span-3 rounded-lg border-2 p-4 bg-white/50 dark:bg-neutral-800/70">
                    <div className="km-label">{tr("statsCard.finalProbability")}</div>
                    <div className="km-data mt-1">{(survivalData[survivalData.length - 1].probability * 100).toFixed(1)}%</div>
                    </div>
                )}
                {survivalCurves.length > 0 && (
                  <div className="col-span-2 sm:col-span-3 rounded-lg border-2 p-4 bg-white/50 dark:bg-neutral-800/70">
                    <div className="text-xs text-muted-foreground mb-2">{tr("statsCard.curveComparison")}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-1">
                      {survivalCurves.map((curve) => (
                        <div key={curve.id} className="flex items-start gap-3">
                          <div className="w-1.5 h-6 rounded mt-0.5" style={{ backgroundColor: curve.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: curve.color }}>{curve.name}</div>
                          <div className="text-xs text-muted-foreground">
                              {curve.data.length > 0
                                ? tr(kurvenSchaetzer === "kumulativeInzidenz" ? "statsCard.curveFinalIncidence" : "statsCard.curveFinal", { value: (curve.data[curve.data.length - 1].probability * 100).toFixed(1) })
                                : tr("notAvailableShort")}
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                <div className="col-span-2 sm:col-span-3 text-xs text-muted-foreground space-y-1">
                  {(filters.selectedYearRange.start || filters.selectedYearRange.end) && (
                    <div>{tr("statsCard.diagnosisRange", { start: filters.selectedYearRange.start || yearRange.min, end: filters.selectedYearRange.end || yearRange.max })}</div>
                  )}
                    {filters.selectedICD10Codes.length > 0 && (
                    <div>ICD-10: {filters.selectedICD10Codes.length} {filters.selectedICD10Codes.length === 1 ? 'Code' : 'Codes'}</div>
                    )}
                    {filters.selectedTumorCategories.length > 0 && (
                    <div>{tr("statsCard.selectedCategories", { count: filters.selectedTumorCategories.length })}</div>
                    )}
                  </div>
                </div>

                             {/* Anteilsbalken statt Torte: siehe proportion-bar.tsx */}
               <div ref={cohortPieRef} className="xl:col-span-1 rounded-lg border-2 p-4 bg-white/50 dark:bg-neutral-800/70">
                 <div className="text-sm font-medium mb-2">{tr("statsCard.cohortShare")}</div>
                 <ProportionBar data={pieChartData} />
               </div>

              {/* Nur bei einer OncoBox-Kohorte: die Aufstellung, die das
                  Auswertungsblatt der Box neben der Kurve verlangt. */}
              {oncoBoxProfileId && (
                <div className="xl:col-span-1">
                  <Boxkennzahlen aufstellung={boxAufstellung} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        

        {/* Survival Data Table */}
        <Card className="gap-2 py-3" data-tour="patient-table">
        <CardHeader>
          <CardTitle className="flex flex-col items-center justify-center">
            <span className="km-card-title text-center w-full">{tr("table.title")}</span>
            <div className="flex gap-2 mt-4 flex-wrap items-center">
              <select
                value={searchColumn}
                onChange={e => setSearchColumn(e.target.value as keyof typeof tableColumns)}
                className="border rounded px-2 py-1 text-sm"
                style={{ minWidth: 120 }}
              >
                <option value="">{tr("table.allColumns")}</option>
                {(Object.keys(tableColumns) as Array<keyof typeof tableColumns>).map(col => {
                  let label = tableColumns[col];
                  // Falls label ein React-Element ist (wie bei probability), extrahiere den Text
                  if (typeof label !== "string") {
                    // F├╝r unser konkretes Beispiel: probability ist ein <span> mit <br/>, extrahiere Text
                    if (col === "probability") {
                      label = tr("table.probability");
                    } else {
                      // Fallback: Zeige den Key
                      label = col;
                    }
                  }
                  return (
                    <option key={col} value={col}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <input
                type="text"
                placeholder={(() => {
                  if (!searchColumn) return tr("table.searchAll");
                  let label = tableColumns[searchColumn as keyof typeof tableColumns];
                  if (typeof label !== "string") {
                    if (searchColumn === "probability") {
                      label = tr("table.probability");
                    } else {
                      label = searchColumn;
                    }
                  }
                  return tr("table.searchIn", { column: label });
                })()}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                style={{ minWidth: 120 }}
              />
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Popover open={excelOpen} onOpenChange={setExcelOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {/* Excel-Icon (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4 mr-2"><rect x="3" y="3" width="18" height="18" rx="2" fill="#217346"/><path d="M7 8l5 8M12 8l-5 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Excel
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-3">
                  <ExportModePicker value={excelMode} onChange={setExcelMode} />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => { setExcelOpen(false); exportTableAsExcel(excelMode); }}
                  >
                    {tr("export.generateExcel")}
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  {Object.entries(tableColumns).map(([key, label]) => (
                    <TableHead
                      key={key}
                      className="text-center cursor-pointer select-none px-1 py-1 whitespace-nowrap"
                      style={{ fontSize: 'calc(11px * var(--schrift-faktor, 1))', padding: '2px 4px' }}
                      onClick={() => {
                        setSortConfig(prev =>
                          prev.key === key
                            ? { key: key as any, direction: prev.direction === "asc" ? "desc" : "asc" }
                            : { key: key as any, direction: "asc" }
                        );
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {key === "months" ? zeitLabel : label}
                        <span className="flex flex-col text-[calc(10px*var(--schrift-faktor,1))] ml-1">
                          <span
                            style={{
                              fontWeight: sortConfig.key === key && sortConfig.direction === "asc" ? "bold" : "normal",
                              color: sortConfig.key === key && sortConfig.direction === "asc" ? undefined : "#bbb"
                            }}
                          >▲</span>
                          <span
                            style={{
                              fontWeight: sortConfig.key === key && sortConfig.direction === "desc" ? "bold" : "normal",
                              color: sortConfig.key === key && sortConfig.direction === "desc" ? undefined : "#bbb"
                            }}
                          >▼</span>
                        </span>
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTableData.map((row, index) => (
                  <TableRow key={index + (tablePage - 1) * pageSize} className="text-xs">
                    {(Object.keys(tableColumns) as Array<keyof typeof tableColumns>).map(col => (
                      <TableCell key={col} className="text-center px-1 py-1 whitespace-nowrap tabular-nums" style={{ fontSize: 'calc(11px * var(--schrift-faktor, 1))', padding: '2px 4px' }}>
                        {getDisplayValue(row, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setTablePage(1)} disabled={tablePage === 1}>&laquo;</Button>
                <Button size="sm" variant="outline" onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1}>&lsaquo;</Button>
                <span className="text-xs">{tr("table.pageOf", { page: tablePage, total: totalPages })}</span>
                <Button size="sm" variant="outline" onClick={() => setTablePage(p => Math.min(totalPages, p + 1))} disabled={tablePage === totalPages}>&rsaquo;</Button>
                <Button size="sm" variant="outline" onClick={() => setTablePage(totalPages)} disabled={tablePage === totalPages}>&raquo;</Button>
              </div>
            )}
          </div>
        </CardContent>
        </Card>

        {/* Cox-Analyse (Plot + Tabelle in einer Card) */}
        <div className="mt-8">
          <CoxAnalysis
            {...coxAnalysisProps}
            // Empty strata (0 valid patients) must not show up as a selectable
            // group badge or reference-group option — there is no data for
            // them to contribute to the regression regardless.
            groups={coxAnalysisProps.groups.filter(
              g => !emptyCurves.some(c => ("id" in c ? c.id === g.id : c.name === g.name))
            )}
            extraColumns={extraColumns ?? undefined}
            extraBins={extraBins}
            zeitEinheit={zeitEinheit}
            screenshotModus={plotDisplay.screenshotMode}
            onRendered={() => setIsGlobalLoading(false)}
            onResult={setCoxSummary}
          />
        </div>
      </div>
    </div>
      </div>
      </div>
  );
}
