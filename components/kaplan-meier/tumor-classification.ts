/**
 * Tumor Classification System
 * Based on CSV mappings from institutional tumor registry
 */

// Solid Tumor Categories (from solide.csv)
export const SOLID_TUMOR_CATEGORIES = {
  "Mamma (incl. DCIS)": ["C50", "D05.1", "D05.7", "D05.9"],
  "Vulva": ["C51"],
  "Vagina": ["C52"],
  "Zervix": ["C53"],
  "Endometrium": ["C54.1"],
  "Ovar/BOT/STIC": ["C56", "C57", "D39.1", "D07.3"],
  "Peritoneal": ["C48"],
  "Corpus uteri, Uterus o. n. A.": ["C54.0", "C54.2", "C54.3", "C54.8", "C54.9", "C55"],
  "Kolon": ["C18"],
  "Rektum": ["C20"],
  "Pankreas": ["C25"],
  "Magen": ["C16"],
  "HCC": ["C22.0"],
  "Biliäres Karzinom": ["C22.1", "C23"],
  "Ösophagus": ["C15"],
  "Analkanal": ["C21.1", "C44.50"],
  "Malignes Melanom": ["C43"],
  "Sonstige bös. Neub. der Haut": ["C44"],
  "Kaposi-Sarkom": ["C46"],
  "Sonstige Bindegewebes und anderer Weichteilgewebe": ["C49"],
  "Periphere Nerven und autonomes Nervensystem": ["C47"],
  "Bösartige Neubildungen NOZ": ["C70", "C71", "C72", "C75.1", "C75.2", "C75.3"],
  "Neubildungen unsicheren Verhaltens NOZ": ["D42", "D43", "D44.3", "D44.4", "D44.5"],
  "Gutartige Neubildungen NOZ": ["D32", "D33", "D35.2", "D35.3", "D35.4"],
  "Kopf-Hals": ["C00", "C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11", "C12", "C13", "C14", "C30", "C31", "C32"],
  "Lunge": ["C34"],
  "Mesotheliom": ["C45.0", "C45.1", "C45.2"],
  "Prostata": ["C61"],
  "Harnblase": ["C67", "D09.0", "D41.4"],
  "Nierenzell": ["C64"],
  "Hoden": ["C62"],
  "Extragonadale Tumore": ["C38.1", "C38.2", "C38.3", "C48.0"],
  "Penis": ["C60", "D07.4"]
} as const;

// Hematological Tumor Categories (from hämatologisch.csv)
export const HEMATOLOGICAL_TUMOR_CATEGORIES = {
  "ALL/Lymphoblastisches Lymphom": ["C83.5", "C91.0"],
  "AML": ["C92.0", "C92.3", "C92.4", "C92.5", "C92.6", "C92.8", "C93.0", "C94.0", "C94.1", "C94.2", "C94.3", "C94.4", "C94.7", "C95.0"],
  "Burkitt-ALL/Burkitt-Lymphom": ["C83.7", "C91.8"],
  "Hodgkin-Lymphome": ["C81"],
  "Non-Hodgkin-Lymphome": ["C82", "C83.0", "C83.1", "C83.2", "C83.3", "C83.4", "C83.6", "C83.8", "C83.9", "C84.0", "C84.1", "C84.4", "C84.5", "C84.6", "C84.7", "C84.8", "C84.9", "C85", "C86", "C88"],
  "CLL und andere": ["C91.1", "C91.2", "C91.3", "C91.4", "C91.5", "C91.6", "C91.7", "C91.9"],
  "Plasmozytom (Malignes Myelom)": ["C90"],
  "CML/andere MPN": ["C92.1", "D45", "D47.1", "D47.3", "D47.4", "D47.5"],
  "MDS/MDS-MPN": ["D46", "C92.2", "C92.3", "C93.1", "C93.2", "C93.3", "C93.7", "C93.9", "C94.6"]
} as const;

// TNM-based Spread Categories (from ausbreitung.csv)
export const SPREAD_CATEGORIES = {
  "Carcinoma in situ": {
    criteria: { T: ["Tis"], N: ["N0"], M: ["M0"] },
    description: "Tis und N0 und M0"
  },
  "Lokal begrenzt": {
    criteria: { T: ["T1", "T2"], N: ["N0"], M: ["M0"] },
    description: "T1 oder T2 und N0 und M0"
  },
  "Lokal fortgeschritten": {
    criteria: { T: ["T3", "T4"], N: ["N0"], M: ["M0"] },
    description: "T3 oder T4 und N0 und M0"
  },
  "Fortgeschritten": {
    criteria: { T: ["T1", "T2", "T3", "T4"], N: ["N1", "N2", "N3"], M: ["M0"] },
    description: "N+ und M0"
  },
  "Metastasiert": {
    criteria: { T: ["T1", "T2", "T3", "T4"], N: ["N0", "N1", "N2", "N3"], M: ["M1"] },
    description: "M+"
  },
  "Unbekannt": {
    criteria: { T: ["TX"], N: ["NX"], M: ["MX"] },
    description: "X"
  }
} as const;

export type SolidTumorCategory = keyof typeof SOLID_TUMOR_CATEGORIES;
export type HematologicalTumorCategory = keyof typeof HEMATOLOGICAL_TUMOR_CATEGORIES;
export type SpreadCategory = keyof typeof SPREAD_CATEGORIES;
export type TumorMainCategory = "Solide Tumore" | "Hämatologische Erkrankungen" | "Unbekannt";

/**
 * Extract ICD-10 code from tumor type string
 * Matches codes like "C50" or "C50.9" but ignores any trailing text
 */
function extractICD10Code(tumorType: string): string | null {
  // Match patterns: C, D oder Z gefolgt von 2 Ziffern, optional Punkt + 1 Ziffer
  const match = tumorType.match(/^([CDZ]\d{2}(?:\.\d)?)\b/);
  return match ? match[1] : null;
}

/**
 * Check if an ICD-10 code matches a pattern
 */
function matchesICD10Pattern(code: string, pattern: string): boolean {
  // Handle exact matches
  if (code === pattern) return true;
  
  // Handle range patterns like "C54.2-.9" 
  const rangeMatch = pattern.match(/^([CDZ]\d{2})\.(\d)-\.(\d)$/);
  if (rangeMatch) {
    const [, baseCode, startSub, endSub] = rangeMatch;
    if (code.startsWith(baseCode + ".")) {
      const subCode = code.split(".")[1];
      if (subCode && !isNaN(parseInt(subCode))) {
        const subNum = parseInt(subCode);
        return subNum >= parseInt(startSub) && subNum <= parseInt(endSub);
      }
    }
  }
  
  // Handle base code patterns like "C51" matching "C51.1", "C51.2", etc.
  if (pattern.length === 3 && code.startsWith(pattern)) {
    return true;
  }
  
  // Handle specific subcategory patterns
  if (code.startsWith(pattern.replace(/[.-].*$/, ""))) {
    return true;
  }
  
  return false;
}

/**
 * Categorize tumor based on ICD-10 code
 */
export function categorizeTumor(tumorType: string): {
  mainCategory: TumorMainCategory;
  subCategory: string | null;
  isHematological: boolean;
  isSolid: boolean;
} {
  const icd10Code = extractICD10Code(tumorType);
  
  if (!icd10Code) {
    return {
      mainCategory: "Unbekannt",
      subCategory: null,
      isHematological: false,
      isSolid: false
    };
  }

  // Check hematological categories first
  for (const [category, codes] of Object.entries(HEMATOLOGICAL_TUMOR_CATEGORIES)) {
    for (const code of codes) {
      if (matchesICD10Pattern(icd10Code, code)) {
        return {
          mainCategory: "Hämatologische Erkrankungen",
          subCategory: category,
          isHematological: true,
          isSolid: false
        };
      }
    }
  }

  // Check solid tumor categories
  for (const [category, codes] of Object.entries(SOLID_TUMOR_CATEGORIES)) {
    for (const code of codes) {
      if (matchesICD10Pattern(icd10Code, code)) {
        return {
          mainCategory: "Solide Tumore",
          subCategory: category,
          isHematological: false,
          isSolid: true
        };
      }
    }
  }

  // Default to solid tumor if not hematological
  return {
    mainCategory: "Solide Tumore",
    subCategory: "Sonstige",
    isHematological: false,
    isSolid: true
  };
}

/**
 * Categorize tumor spread based on TNM staging
 */
export function categorizeSpread(tnm: {
  tCategory?: string | null;
  nCategory?: string | null;
  mCategory?: string | null;
}): SpreadCategory {
  const { tCategory, nCategory, mCategory } = tnm;

  // Reduce a raw TNM value to its base category+digit, ignoring any c/p prefix
  // and subcategory suffix (e.g. "cT1c" -> "T1", "pM1b" -> "M1", "N3a" -> "N3");
  // "" when the category is absent.
  const base = (raw: string | null | undefined, letter: string) => {
    const hit = (raw || "").toUpperCase().match(new RegExp(`${letter}(\\d)`));
    return hit ? `${letter}${hit[1]}` : "";
  };
  const tBase = base(tCategory, "T");
  const nBase = base(nCategory, "N");
  const mBase = base(mCategory, "M");
  const tIsCis = /T\s*IS/i.test(tCategory || "");

  // Classify from whatever TNM information is available (a full T+N+M is not
  // required): M1 alone is metastatic, a positive node alone is advanced, and
  // the T-based categories still require a documented N0/M0.
  if (mBase === "M1") return "Metastasiert";
  if (["N1", "N2", "N3"].includes(nBase)) return "Fortgeschritten";
  if (["T3", "T4"].includes(tBase) && nBase === "N0" && mBase === "M0") return "Lokal fortgeschritten";
  if (["T1", "T2"].includes(tBase) && nBase === "N0" && mBase === "M0") return "Lokal begrenzt";
  if (tIsCis && nBase === "N0" && mBase === "M0") return "Carcinoma in situ";
  return "Unbekannt";
}

/**
 * Get all solid tumor subcategories
 */
export function getSolidTumorSubcategories(): SolidTumorCategory[] {
  return Object.keys(SOLID_TUMOR_CATEGORIES) as SolidTumorCategory[];
}

/**
 * Get all hematological tumor subcategories
 */
export function getHematologicalTumorSubcategories(): HematologicalTumorCategory[] {
  return Object.keys(HEMATOLOGICAL_TUMOR_CATEGORIES) as HematologicalTumorCategory[];
}

/**
 * Get all spread categories
 */
export function getSpreadCategories(): SpreadCategory[] {
  return Object.keys(SPREAD_CATEGORIES) as SpreadCategory[];
} 