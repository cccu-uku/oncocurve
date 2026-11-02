export type TourPage = "upload" | "results" | "help";
export type TourVariant = "quick" | "full";

export interface TourStepDef {
  id: string;
  page: TourPage;
  selector?: string; // hervorgehobenes Element; zentriert, wenn fehlend
  titleKey: string;  // i18n-Key unter "Tour"
  bodyKey: string;
}

export const STEP_REGISTRY: Record<string, TourStepDef> = {
  "upload":          { id: "upload",          page: "upload",  selector: '[data-tour="upload-area"]',   titleKey: "steps.upload.title",         bodyKey: "steps.upload.body" },
  "testdata":        { id: "testdata",        page: "upload",  selector: '[data-tour="test-cards"]',    titleKey: "steps.testdata.title",       bodyKey: "steps.testdata.body" },
  "anomalies":       { id: "anomalies",       page: "results", selector: '[data-tour="anomalies"]',     titleKey: "steps.anomalies.title",      bodyKey: "steps.anomalies.body" },
  "strat":           { id: "strat",           page: "results", selector: '[data-tour="strat"]',         titleKey: "steps.strat.title",          bodyKey: "steps.strat.body" },
  "plot":            { id: "plot",            page: "results", selector: '[data-tour="plot-display"]',  titleKey: "steps.plot.title",           bodyKey: "steps.plot.body" },
  "filters":         { id: "filters",         page: "results", selector: '[data-tour="filters"]',       titleKey: "steps.filters.title",        bodyKey: "steps.filters.body" },
  "km-chart":        { id: "km-chart",        page: "results", selector: '[data-tour="km-chart"]',      titleKey: "steps.chart.title",          bodyKey: "steps.chart.body" },
  "cohort":          { id: "cohort",          page: "results", selector: '[data-tour="stats"]',         titleKey: "steps.cohort.title",         bodyKey: "steps.cohort.body" },
  "table":           { id: "table",           page: "results", selector: '[data-tour="patient-table"]', titleKey: "steps.table.title",          bodyKey: "steps.table.body" },
  "cox":             { id: "cox",             page: "results", selector: '[data-cox-analysis]',          titleKey: "steps.cox.title",            bodyKey: "steps.cox.body" },
  "figures":         { id: "figures",         page: "results", selector: '[data-tour="chart-exports"]', titleKey: "steps.figures.title",        bodyKey: "steps.figures.body" },
  "export":          { id: "export",          page: "results", selector: '[data-tour="export"]',        titleKey: "steps.export.title",         bodyKey: "steps.export.body" },
  "lang":            { id: "lang",            page: "results", selector: '[data-tour="lang"]',           titleKey: "steps.lang.title",           bodyKey: "steps.lang.body" },
  "theme":           { id: "theme",           page: "results", selector: '[data-tour="theme"]',         titleKey: "steps.theme.title",          bodyKey: "steps.theme.body" },
  "helpicon":        { id: "helpicon",        page: "results", selector: '[data-tour="help-icon"]',     titleKey: "steps.helpicon.title",       bodyKey: "steps.helpicon.body" },
  "help":            { id: "help",            page: "help",                                             titleKey: "steps.help.title",           bodyKey: "steps.help.body" },
  "quick-export":    { id: "quick-export",    page: "results", selector: '[data-tour="export"]',        titleKey: "steps.quickExport.title",    bodyKey: "steps.quickExport.body" },
};

export const TOUR_PLAYLISTS: Record<TourVariant, string[]> = {
  quick: ["upload", "testdata", "strat", "km-chart", "cox", "quick-export"],
  full: [
    "upload", "testdata", "anomalies", "filters", "strat", "plot", "km-chart",
    "cohort", "table", "cox", "figures", "export", "lang", "theme", "helpicon",
    "help",
  ],
};

export function normalizeVariant(raw: string | null): TourVariant {
  return raw === "quick" ? "quick" : "full";
}

export function playlistFor(variant: TourVariant): TourStepDef[] {
  return TOUR_PLAYLISTS[variant].map(id => STEP_REGISTRY[id]);
}

export function resolveStep(variant: TourVariant, idx: number): TourStepDef | null {
  const pl = TOUR_PLAYLISTS[variant];
  if (idx < 0 || idx >= pl.length) return null;
  return STEP_REGISTRY[pl[idx]] ?? null;
}
