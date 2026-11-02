// Typen und Helper für dynamische Extra-Spalten aus User-Uploads.
// Worker-kompatibel — kein DOM, kein i18n, keine fetches.

export type ExtraColumnType = 'numeric' | 'categorical';

export interface NumericColumnMeta {
  type: 'numeric';
  unit: string | null;
  unitFamily: 'mass' | 'volume' | 'length' | 'time' | null;
  conversionFactors?: Record<string, number>;
  min: number;
  max: number;
  median: number;
  q25: number;
  q75: number;
  nMissing: number;
  conversionApplied?: { fromUnit: string; toUnit: string; nValues: number; factor: number }[];
}

export interface CategoricalColumnMeta {
  type: 'categorical';
  distinctValues: string[];
  valueCounts: Record<string, number>;
  nMissing: number;
  cardinality: number;
  cardinalityWarning: boolean;
}

export type ColumnMeta = NumericColumnMeta | CategoricalColumnMeta;

export interface ExtraColumnWarning {
  kind: 'unit_conversion' | 'mixed_units_categorical' | 'cardinality' | 'parse_skip';
  column: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ExtraColumnsState {
  columns: Record<string, ColumnMeta>;
  warnings: ExtraColumnWarning[];
}

export interface BinningConfig {
  mode: 'quantiles' | 'manual';
  quantiles?: 2 | 3 | 4 | 5;
  manualCutoffs?: number[];
  appliedAt?: string;
}

export interface ParseIssue {
  level: 'required' | 'recommended' | 'optional';
  field: string;
  message: string;
}

// Cardinality-Cap für kategoriale Stratifizierung
export const CARDINALITY_CAP = 30;

// Numerische Erkennungsschwellen
export const NUMERIC_MATCH_THRESHOLD = 0.95;
export const NUMERIC_MIN_DISTINCT = 5;

type UnitFamily = 'mass' | 'volume' | 'length' | 'time';

interface UnitDef {
  family: UnitFamily;
  toBase: number;
  canonical: string;
}

const UNIT_TABLE: Record<string, UnitDef> = {
  // mass — base: g
  kg:  { family: 'mass', toBase: 1000,    canonical: 'kg' },
  g:   { family: 'mass', toBase: 1,       canonical: 'g'  },
  mg:  { family: 'mass', toBase: 0.001,   canonical: 'mg' },
  μg:  { family: 'mass', toBase: 1e-6,    canonical: 'μg' },
  mcg: { family: 'mass', toBase: 1e-6,    canonical: 'μg' },
  ug:  { family: 'mass', toBase: 1e-6,    canonical: 'μg' },
  // volume — base: L
  l:   { family: 'volume', toBase: 1,     canonical: 'L'  },
  dl:  { family: 'volume', toBase: 0.1,   canonical: 'dL' },
  ml:  { family: 'volume', toBase: 0.001, canonical: 'mL' },
  μl:  { family: 'volume', toBase: 1e-6,  canonical: 'μL' },
  mcl: { family: 'volume', toBase: 1e-6,  canonical: 'μL' },
  ul:  { family: 'volume', toBase: 1e-6,  canonical: 'μL' },
  // length — base: m
  m:   { family: 'length', toBase: 1,     canonical: 'm'  },
  cm:  { family: 'length', toBase: 0.01,  canonical: 'cm' },
  mm:  { family: 'length', toBase: 0.001, canonical: 'mm' },
  μm:  { family: 'length', toBase: 1e-6,  canonical: 'μm' },
  // time — base: day
  a:      { family: 'time', toBase: 365.25,  canonical: 'Jahre' },
  jahre:  { family: 'time', toBase: 365.25,  canonical: 'Jahre' },
  yr:     { family: 'time', toBase: 365.25,  canonical: 'Jahre' },
  mo:     { family: 'time', toBase: 30.4375, canonical: 'Monate' },
  monate: { family: 'time', toBase: 30.4375, canonical: 'Monate' },
  d:    { family: 'time', toBase: 1,    canonical: 'Tage' },
  tag:  { family: 'time', toBase: 1,    canonical: 'Tage' },
  tage: { family: 'time', toBase: 1,    canonical: 'Tage' },
  h:    { family: 'time', toBase: 1/24, canonical: 'h' },
  std:  { family: 'time', toBase: 1/24, canonical: 'h' },
};

function normalizeUnit(raw: string): string {
  return raw.toLowerCase().trim();
}

export interface NumberWithUnit {
  number: number;
  unit: string | null;
}

const QUALIFIER_RE = /[<>≈~≤≥±]/;
const NUM_UNIT_RE = /^\s*(-?\d+(?:[.,]\d+)?)\s*([a-zA-Zµμ%/°²³.]+)?\s*$/;

export function parseNumberWithUnit(raw: string): NumberWithUnit | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (QUALIFIER_RE.test(trimmed)) return null;
  // Reject ranges like "50-100" or "5 - 7" (minus between digits)
  if (/\d\s*-\s*\d/.test(trimmed)) return null;
  const m = trimmed.match(NUM_UNIT_RE);
  if (!m) return null;
  const numStr = m[1].replace(',', '.');
  const num = Number(numStr);
  if (!isFinite(num)) return null;
  const unit = m[2] ? normalizeUnit(m[2]) : null;
  return { number: num, unit };
}

function quantile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return NaN;
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] * (hi - idx) + sortedValues[hi] * (idx - lo);
}

export function quantileCutoffs(_meta: NumericColumnMeta, k: 2 | 3 | 4 | 5, sortedValues: number[]): number[] {
  // Returns k-1 inner cutoffs for k bins
  const cutoffs: number[] = [];
  for (let i = 1; i < k; i++) {
    cutoffs.push(quantile(sortedValues, i / k));
  }
  return cutoffs;
}

export function analyzeColumn(values: string[]): ColumnMeta {
  // Step 1: Filter empty/whitespace-only
  const nonEmpty: string[] = [];
  let nMissing = 0;
  for (const v of values) {
    if (v == null || String(v).trim() === '') nMissing++;
    else nonEmpty.push(String(v).trim());
  }

  if (nonEmpty.length === 0) {
    return {
      type: 'categorical',
      distinctValues: [], valueCounts: {},
      nMissing, cardinality: 0, cardinalityWarning: false,
    };
  }

  // Step 2: Try numeric
  const parsed: NumberWithUnit[] = [];
  for (const v of nonEmpty) {
    const p = parseNumberWithUnit(v);
    if (p) parsed.push(p);
  }
  const matchRatio = parsed.length / nonEmpty.length;
  const distinctNums = new Set(parsed.map(p => p.number));

  if (matchRatio >= NUMERIC_MATCH_THRESHOLD && distinctNums.size >= NUMERIC_MIN_DISTINCT) {
    return buildNumericMeta(parsed, nMissing);
  }

  // Step 3: Categorical fallback
  return buildCategoricalMeta(nonEmpty, nMissing);
}

function buildCategoricalMeta(values: string[], nMissing: number): CategoricalColumnMeta {
  const valueCounts: Record<string, number> = {};
  for (const v of values) valueCounts[v] = (valueCounts[v] ?? 0) + 1;
  const distinctValues = Object.keys(valueCounts).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const cardinality = distinctValues.length;
  return {
    type: 'categorical',
    distinctValues, valueCounts,
    nMissing, cardinality,
    cardinalityWarning: cardinality > CARDINALITY_CAP,
  };
}

function buildNumericMeta(parsed: NumberWithUnit[], nMissing: number): NumericColumnMeta {
  // Unit frequency
  const unitCounts: Record<string, number> = {};
  for (const p of parsed) {
    const key = p.unit ?? '';
    unitCounts[key] = (unitCounts[key] ?? 0) + 1;
  }
  const unitsPresent = Object.keys(unitCounts);
  const allSameUnit = unitsPresent.length === 1;

  // Most frequent unit as target
  const targetUnitKey = unitsPresent.reduce(
    (a, b) => (unitCounts[a] >= unitCounts[b] ? a : b),
    unitsPresent[0]
  );
  const targetUnitDef = targetUnitKey ? UNIT_TABLE[targetUnitKey] ?? null : null;

  let conversionFactors: Record<string, number> | undefined;
  let conversionApplied: { fromUnit: string; toUnit: string; nValues: number; factor: number }[] | undefined;
  let unitFamily: UnitFamily | null = null;

  if (allSameUnit) {
    if (targetUnitDef) unitFamily = targetUnitDef.family;
  } else {
    // Check if all units belong to same family
    const families = new Set(
      unitsPresent.filter(u => u && UNIT_TABLE[u]).map(u => UNIT_TABLE[u].family)
    );
    if (families.size === 1 && targetUnitDef) {
      unitFamily = targetUnitDef.family;
      conversionFactors = {};
      conversionApplied = [];
      for (const u of unitsPresent) {
        if (!u) continue;
        const def = UNIT_TABLE[u];
        if (!def) continue;
        const factor = def.toBase / targetUnitDef.toBase;
        conversionFactors[u] = factor;
        if (u !== targetUnitKey) {
          conversionApplied.push({
            fromUnit: u,
            toUnit: targetUnitDef.canonical,
            nValues: unitCounts[u],
            factor,
          });
        }
      }
      conversionFactors[targetUnitKey] = 1;
    }
    // Else: inconsistent families. We still emit numeric meta with the target unit;
    // values with foreign units will be treated as missing during stratification lookup.
  }

  // Convert values to target unit for stats
  const numsInTarget: number[] = [];
  for (const p of parsed) {
    const key = p.unit ?? '';
    let factor: number;
    if (conversionFactors) {
      factor = conversionFactors[key] ?? NaN;
    } else {
      // No conversion table → only the target/empty unit is valid
      factor = (key === targetUnitKey || key === '') ? 1 : NaN;
    }
    if (isFinite(factor)) numsInTarget.push(p.number * factor);
  }
  numsInTarget.sort((a, b) => a - b);
  const min = numsInTarget[0] ?? NaN;
  const max = numsInTarget[numsInTarget.length - 1] ?? NaN;
  const median = quantile(numsInTarget, 0.5);
  const q25 = quantile(numsInTarget, 0.25);
  const q75 = quantile(numsInTarget, 0.75);

  return {
    type: 'numeric',
    unit: targetUnitDef ? targetUnitDef.canonical : (targetUnitKey || null),
    unitFamily,
    conversionFactors,
    min, max, median, q25, q75,
    nMissing,
    conversionApplied,
  };
}

export interface Bin {
  id: string;
  label: string;
  matches: (val: number | null) => boolean;
}

function formatBinNum(n: number): string {
  if (!isFinite(n)) return '';
  if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0)) return n.toExponential(2);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

export function computeBins(
  meta: NumericColumnMeta,
  sortedValues: number[],
  config?: BinningConfig
): Bin[] {
  const cfg: BinningConfig = config ?? { mode: 'quantiles', quantiles: 4 };
  const cutoffs = cfg.mode === 'quantiles'
    ? quantileCutoffs(meta, cfg.quantiles ?? 4, sortedValues)
    : (cfg.manualCutoffs ?? []).slice().sort((a, b) => a - b);

  const unitSuffix = meta.unit ? ` ${meta.unit}` : '';
  const bins: Bin[] = [];
  for (let i = 0; i <= cutoffs.length; i++) {
    const lo = i === 0 ? null : cutoffs[i - 1];
    const hi = i === cutoffs.length ? null : cutoffs[i];
    const id = `bin_${i}`;
    let label: string;
    if (lo === null) label = `≤${formatBinNum(hi!)}${unitSuffix}`;
    else if (hi === null) label = `>${formatBinNum(lo)}${unitSuffix}`;
    else label = `${formatBinNum(lo)}-${formatBinNum(hi)}${unitSuffix}`;
    bins.push({
      id,
      label,
      matches: (v) => {
        if (v === null || !isFinite(v)) return false;
        if (lo !== null && v <= lo) return false;
        if (hi !== null && v > hi) return false;
        return true;
      },
    });
  }
  return bins;
}


/**
 * Shared helper: assign a patient's group ID for an extra:<col> stratification.
 * Used by both StratificationControl/results and CoxAnalysis so they agree.
 *
 * Returns "__missing__" if the patient has no value for the column,
 * "unknown" if the column meta is not available,
 * the raw value for categorical columns,
 * or a bin ID (bin_0..bin_N) for numeric columns.
 */
export function getPatientExtraGroupId(
  patient: { extras?: Record<string, string> },
  colName: string,
  meta: ColumnMeta | undefined,
  binningConfig: BinningConfig | undefined,
  precomputedSortedValues?: number[],
): string {
  if (!meta) return "unknown";
  const raw = patient.extras?.[colName];
  if (raw == null || String(raw).trim() === "") return "__missing__";
  if (meta.type === "categorical") return String(raw);
  // numeric
  const parsed = parseNumberWithUnit(String(raw));
  if (!parsed) return "__missing__";
  const factor = meta.conversionFactors?.[parsed.unit ?? ""]
    ?? (parsed.unit == null || parsed.unit === "" ? 1 : NaN);
  if (!isFinite(factor)) return "__missing__";
  const v = parsed.number * factor;
  // Bins need a sorted-values set for quantile cutoffs
  const sorted = precomputedSortedValues ?? [];
  const bins = computeBins(meta, sorted, binningConfig);
  const match = bins.find(b => b.matches(v));
  return match?.id ?? "__missing__";
}

/**
 * Build the sorted (in target unit) numeric values for a numeric extra column.
 * Used to feed quantile cutoffs to computeBins.
 */
export function collectNumericValues(
  patients: Array<{ extras?: Record<string, string> }>,
  colName: string,
  meta: NumericColumnMeta,
): number[] {
  const arr: number[] = [];
  for (const p of patients) {
    const raw = p.extras?.[colName];
    if (!raw) continue;
    const parsed = parseNumberWithUnit(String(raw));
    if (!parsed) continue;
    const factor = meta.conversionFactors?.[parsed.unit ?? ""]
      ?? (parsed.unit == null || parsed.unit === "" ? 1 : NaN);
    if (!isFinite(factor)) continue;
    arr.push(parsed.number * factor);
  }
  arr.sort((a, b) => a - b);
  return arr;
}
