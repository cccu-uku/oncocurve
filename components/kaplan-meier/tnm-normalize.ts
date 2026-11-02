// Single source of truth for TNM T-category normalization used for
// stratification. Previously this logic was duplicated (with slightly different
// regexes) in the worker, results page and stratification control, which caused
// real-world values (e.g. "cT4", "ypT3") to be classified inconsistently.
//
// One-digit collapses to the main T category (all T1* -> T1). Two-digit keeps
// the sub-category but drops the c/p prefix (cT1a -> T1A). Empty / unrecognised
// values map to "Keine Angabe".
//
// `kind` handles a dedicated clinical/pathological criterion. The source *field*
// (staging.tClinical from a cT column, staging.tPathological from a pT column)
// already determines the kind, so a value carrying no c/p prefix — e.g. a bare
// "T1" in a pathological column — is treated as belonging to that kind and
// labelled accordingly ("pT1"). A value carrying the *opposite* prefix (a "cT1"
// sitting in a pathological field) is a contradiction and is excluded entirely
// (returns null — it is NOT bucketed into "Keine Angabe"; only the matching
// subset is analysed). Labels always carry the kind's prefix so the legend reads
// e.g. "cT2" / "pT1a" / "pTX".
//
// Omitting `kind` (general "T category" criterion) collapses across prefixes and
// maps empty/unrecognised values to "Keine Angabe".

export const T_UNKNOWN = "Keine Angabe";

export type TStagingKind = "clinical" | "pathological";

// Optional prefixes: y (post-neoadjuvant), r (recurrence), then a captured
// clinical/pathological c/p, then an optional literal T, then main + sub.
const T_RE = /^[YR]?([CP]?)T?([0-4]|IS|X)([A-Z]*)/;

function parseT(val?: string | null): { pre: string; main: string; sub: string } | null {
  if (!val || typeof val !== "string" || val.trim() === "") return null;
  const m = val.trim().toUpperCase().match(T_RE);
  return m ? { pre: m[1], main: m[2], sub: m[3] } : null;
}

// Returns the required prefix letter for a kind, or null for the general case.
function wantedPrefix(kind?: TStagingKind): "C" | "P" | null {
  if (kind === "clinical") return "C";
  if (kind === "pathological") return "P";
  return null;
}

// The prefix that contradicts the wanted one (a cT value in a pathological field).
function opposite(want: "C" | "P"): "C" | "P" {
  return want === "C" ? "P" : "C";
}

// Detects the staging kind encoded in a value's own c/p prefix (cT4 -> clinical,
// ypT3 -> pathological). Returns null when the value carries no c/p prefix.
// Used by the CSV parser to route a shared TNM column into the clinical /
// pathological staging fields.
export function tPrefixKind(val?: string | null): TStagingKind | null {
  const p = parseT(val);
  if (!p) return null;
  if (p.pre === "C") return "clinical";
  if (p.pre === "P") return "pathological";
  return null;
}

export function normalizeTOneDigit(val: string | null | undefined, kind: TStagingKind): string | null;
export function normalizeTOneDigit(val?: string | null): string;
export function normalizeTOneDigit(val?: string | null, kind?: TStagingKind): string | null {
  const p = parseT(val);
  const want = wantedPrefix(kind);
  if (want) {
    if (!p || p.pre === opposite(want)) return null; // opposite prefix -> excluded
    return `${want.toLowerCase()}T${p.main}`;
  }
  return p ? `T${p.main}` : T_UNKNOWN;
}

export function normalizeTTwoDigit(val: string | null | undefined, kind: TStagingKind): string | null;
export function normalizeTTwoDigit(val?: string | null): string;
export function normalizeTTwoDigit(val?: string | null, kind?: TStagingKind): string | null {
  const p = parseT(val);
  const want = wantedPrefix(kind);
  if (want) {
    if (!p || p.pre === opposite(want)) return null;
    const lc = want.toLowerCase();
    return p.sub ? `${lc}T${p.main}${p.sub}` : `${lc}T${p.main}`;
  }
  if (!p) return T_UNKNOWN;
  return p.sub ? `T${p.main}${p.sub}` : `T${p.main}`;
}
