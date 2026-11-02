// TNM Staging helper using the TNM 9th Edition (Wiley) stage groupings
// Provides performant lookups for entity-specific staging

import { WILEY_ENTITIES } from "./tnm-wiley-staging-data";

export interface WileyStagingRule {
  stage: string;
  T: string;
  N: string;
  M: string;
  type: string; // "clinical" | "pathologic" | ""
}

export interface WileyEntity {
  entity: string;
  icd10: string;
  /** false: variant only reachable by name, never chosen from an ICD-10 code */
  icdLookup?: false;
  staging: WileyStagingRule[];
}

// Build lookup map for O(1) access by entity name or ICD10 code.
// Codes listed explicitly in an entity's icd10 field take precedence over
// 3-character codes derived from them (C18.1 -> C18); within each map the
// first entity wins.
const entityByName = new Map<string, WileyEntity>();
const entityByListedICD10 = new Map<string, WileyEntity>();
const entityByDerivedICD10 = new Map<string, WileyEntity>();

/**
 * Expand an icd10 field of the source tables into single codes:
 * "C18-20 (excluding C18.1)" -> C18, C19, C20; "C31.0-1" -> C31.0, C31.1;
 * "C00-C06" -> C00 ... C06; "ICD-O-4 C15-C26" -> C15 ... C26.
 */
function expandIcd10Field(field: string): string[] {
  const codes: string[] = [];
  const cleaned = field.replace(/\(.*?\)/g, "").replace(/ICD-O-\d/g, "");
  for (const part of cleaned.split(",").map(p => p.trim()).filter(Boolean)) {
    const range = part.match(/^([A-Z])(\d{2})(?:\.(\d))?-(?:[A-Z]?(\d{2})|(\d))$/);
    if (range) {
      const [, letter, main, sub, endMain, endSub] = range;
      if (sub !== undefined && endSub !== undefined) {
        for (let s = Number(sub); s <= Number(endSub); s++) codes.push(`${letter}${main}.${s}`);
      } else if (endMain !== undefined) {
        for (let m = Number(main); m <= Number(endMain); m++) codes.push(`${letter}${String(m).padStart(2, "0")}`);
      }
      continue;
    }
    if (/^[A-Z]\d{2}(\.\d+)?$/.test(part)) codes.push(part);
  }
  return codes;
}

// Explicit mapping for common tumor categories to Wiley entities
const CATEGORY_TO_ENTITY_MAP: Record<string, string> = {
  // Breast / Mamma
  'mamma (incl. dcis)': 'Breast Tumours',
  'mamma': 'Breast Tumours',
  'breast': 'Breast Tumours',
  
  // Gynecological
  'vulva': 'Vulva Staging',
  'vagina': 'Vagina',
  'zervix': 'Cervix Uteri',
  'cervix': 'Cervix Uteri',
  'endometrium': 'Uterus - Endometrium',
  'corpus uteri, uterus o. n. a.': 'Uterus - Endometrium',
  'corpus uteri': 'Uterus - Endometrium',
  'uterus': 'Uterus - Endometrium',
  'ovar/bot/stic': 'Ovarian, Fallopian Tube and Primary Peritoneal Carcinoma',
  'ovar': 'Ovarian, Fallopian Tube and Primary Peritoneal Carcinoma',
  'ovary': 'Ovarian, Fallopian Tube and Primary Peritoneal Carcinoma',
  'peritoneal': 'Ovarian, Fallopian Tube and Primary Peritoneal Carcinoma',
  
  // Gastrointestinal
  'magen': 'Stomach',
  'stomach': 'Stomach',
  'ösophagus': 'Oesophagus - Adenocarcinoma',
  'oesophagus': 'Oesophagus - Adenocarcinoma',
  'kolon': 'Colon and Rectum',
  'colon': 'Colon and Rectum',
  'rektum': 'Colon and Rectum',
  'rectum': 'Colon and Rectum',
  'analkanal': 'Anal Canal and Perianal Skin',
  'anal': 'Anal Canal and Perianal Skin',
  'pankreas': 'Pancreas',
  'pancreas': 'Pancreas',
  
  // Hepatobiliary
  'leber': 'Liver',
  'liver': 'Liver',
  'hcc': 'Liver',
  'biliäres karzinom': 'Intrahepatic Bile Ducts',
  'gallbladder': 'Gallbladder',
  'gallenblase': 'Gallbladder',
  
  // Respiratory
  'lunge': 'Lung',
  'lung': 'Lung',
  'mesotheliom': 'Pleural Mesothelioma',
  'mesothelioma': 'Pleural Mesothelioma',
  
  // Urological
  'prostata': 'Prostate',
  'prostate': 'Prostate',
  'niere': 'Kidney',
  'kidney': 'Kidney',
  'nierenzell': 'Kidney',
  'blase': 'Urinary Bladder',
  'bladder': 'Urinary Bladder',
  'harnblase': 'Urinary Bladder',
  'penis': 'Penis',
  
  // Head & Neck
  'larynx': 'Larynx',
  'kopf-hals': 'Larynx',
  'head and neck': 'Larynx',
  // Note: Thyroid mapping is age-dependent, handled in findEntityByTumorCategory
  'schilddrüse': 'Thyroid Gland - Papillary or Follicular (55 Years and Older)', // Fallback if no age
  'thyroid': 'Thyroid Gland - Papillary or Follicular (55 Years and Older)', // Fallback if no age
  
  // Skin
  'malignes melanom': 'Melanoma of Skin',
  'melanom': 'Melanoma of Skin',
  'melanoma': 'Melanoma of Skin',
  'sonstige bös. neub. der haut': 'Carcinoma of Skin (excluding eyelid, head and neck, perianal, vulva and penis)',
  'hautkarzinom': 'Carcinoma of Skin (excluding eyelid, head and neck, perianal, vulva and penis)',
  'skin carcinoma': 'Carcinoma of Skin (excluding eyelid, head and neck, perianal, vulva and penis)',
};

// Initialize maps once on module load
(function initializeLookup() {
  for (const entity of WILEY_ENTITIES) {
    // Normalize entity name for lookup (case-insensitive, trim whitespace)
    const normalizedName = entity.entity.toLowerCase().trim();
    entityByName.set(normalizedName, entity);

    if (entity.icdLookup === false) continue;
    for (const code of expandIcd10Field(entity.icd10)) {
      if (!entityByListedICD10.has(code)) entityByListedICD10.set(code, entity);
      const baseCode = code.slice(0, 3);
      if (baseCode !== code && !entityByDerivedICD10.has(baseCode)) {
        entityByDerivedICD10.set(baseCode, entity);
      }
    }
  }
})();

function lookupIcd10(icd10: string): WileyEntity | null {
  const code = icd10.trim().toUpperCase();
  const baseCode = code.slice(0, 3);
  return (
    entityByListedICD10.get(code) ??
    entityByListedICD10.get(baseCode) ??
    entityByDerivedICD10.get(baseCode) ??
    null
  );
}

/**
 * Find entity by tumor category name or ICD10 code
 * Tries ICD10 match first (most reliable), then name-based matching as fallback
 * @param categoryName - The category name to search for
 * @param icd10 - Optional ICD10 code
 * @param age - Optional patient age (required for age-specific entities like Thyroid)
 */
let _entityLookupLogged = false;
export function findEntityByTumorCategory(categoryName: string, icd10?: string, age?: number): WileyEntity | null {
  // Only log once to avoid console spam
  if (!_entityLookupLogged) {
    _entityLookupLogged = true;
  }
  
  // 1. Try ICD10 lookup FIRST (most reliable)
  if (icd10) {
    icd10 = icd10.trim().toUpperCase();
    const baseCode = icd10.match(/^[A-Z]\d{2}/)?.[0];
    
    // Special handling for Thyroid Gland (C73)
    if (baseCode === 'C73' && typeof age === 'number') {
      const thyroidEntity = age < 55 
        ? 'Thyroid Gland - Papillary and Follicular (<55 Years)'
        : 'Thyroid Gland - Papillary or Follicular (55 Years and Older)';
      const entity = entityByName.get(thyroidEntity.toLowerCase());
      if (entity) {
        return entity;
      }
    }
    
    const entity = lookupIcd10(icd10);
    if (entity) {
      return entity;
    }
  }
  
  // 2. Try explicit category name mapping
  const normalized = categoryName.toLowerCase().trim();
  
  if (CATEGORY_TO_ENTITY_MAP[normalized]) {
    const mappedName = CATEGORY_TO_ENTITY_MAP[normalized];
    const entity = entityByName.get(mappedName.toLowerCase());
    if (entity) {
      return entity;
    }
  }
  
  // 3. Try direct name match
  if (entityByName.has(normalized)) {
    const entity = entityByName.get(normalized)!;
    return entity;
  }
  
  // 4. Try partial name match as fallback
  const partialMatch = Array.from(entityByName.entries()).find(([name, entity]) => {
    const entityLower = entity.entity.toLowerCase();
    return (
      entityLower.includes(normalized) || 
      normalized.includes(name) ||
      // Handle "Breast" <-> "Mamma" special case
      (normalized.includes('mamma') && entityLower.includes('breast')) ||
      (normalized.includes('breast') && entityLower.includes('mamma'))
    );
  });
  
  if (partialMatch) {
    return partialMatch[1];
  }
  
  // Only log failures
  return null;
}

/**
 * Parse TNM values from strings (handles comma-separated lists like "T1, T2")
 */
function parseConditionList(value: string): string[] {
  return value.split(',').map(v => v.trim());
}

/**
 * Check if a TNM value matches a condition (handles "Any T", ranges, etc.)
 * @param patientValue - The patient's TNM value (e.g., "pT1", "cN0", "M0")
 * @param condition - The rule condition (e.g., "pT1", "T1", "Any T")
 * @param strictPrefix - If true, a prefixed patient value must carry the rule's prefix
 *   (a patient value without prefix, e.g. "M0", still matches "cM0"); if false, prefix is ignored
 */
function matchesTNMCondition(patientValue: string, condition: string, strictPrefix: boolean = false): boolean {
  if (!patientValue || !condition) return false;

  // Normalize: remove spaces, lowercase
  const normalizedPatient = patientValue.replace(/\s/g, '').toLowerCase();
  const normalizedCondition = condition.replace(/\s/g, '').toLowerCase();

  // "Any X" matches everything
  if (normalizedCondition.startsWith('any')) return true;

  // Strict prefix mode for prefixed patient values: exact match including prefix
  if (strictPrefix && /^[pc]/.test(normalizedPatient)) {
    if (normalizedPatient === normalizedCondition) return true;
    
    // Handle multiple values (e.g. "pT1, pT2")
    const conditions = parseConditionList(condition);
    return conditions.some(cond => {
      const norm = cond.replace(/\s/g, '').toLowerCase();
      return normalizedPatient === norm;
    });
  }
  
  // Flexible mode: remove prefixes for comparison
  const patientWithoutPrefix = normalizedPatient.replace(/^[pc]/i, '');
  const conditionWithoutPrefix = normalizedCondition.replace(/^[pc]/i, '');
  
  // Exact match without prefix
  if (patientWithoutPrefix === conditionWithoutPrefix) return true;
  
  // Handle multiple values (e.g. "T1, T2, T3")
  const conditions = parseConditionList(condition);
  return conditions.some(cond => {
    const norm = cond.replace(/\s/g, '').toLowerCase().replace(/^[pc]/i, '');
    return patientWithoutPrefix === norm;
  });
}

export interface StagingFields {
  tCategory?: string | null;
  tPathological?: string | null;
  tClinical?: string | null;
  nCategory?: string | null;
  mCategory?: string | null;
}

/**
 * T, N and M of a case as used for stage grouping. A T value without its own
 * prefix that came from a dedicated pT or cT field gets that field's prefix.
 */
export function tnmForStaging(staging: StagingFields | null | undefined): {
  t: string | null;
  n: string | null;
  m: string | null;
} {
  let t = staging?.tCategory || staging?.tPathological || staging?.tClinical || null;
  if (t && /^\s*T/i.test(t)) {
    if (t === staging?.tPathological) t = `p${t.trim()}`;
    else if (t === staging?.tClinical) t = `c${t.trim()}`;
  }
  return { t, n: staging?.nCategory || null, m: staging?.mCategory || null };
}

/**
 * True if the entity groups clinical and pathologic TNM separately but neither
 * T nor N says which one it is (no c/p prefix). Such cases get no stage.
 */
export function requiresTnmPrefix(
  entity: WileyEntity,
  t: string | null | undefined,
  n: string | null | undefined
): boolean {
  if (!entity.staging.some(rule => rule.type === 'clinical' || rule.type === 'pathologic')) return false;
  const hasPrefix = (value: string | null | undefined) => /^\s*[cp]/i.test(value ?? '');
  return !hasPrefix(t) && !hasPrefix(n);
}

/**
 * Determine stage for a patient based on TNM values
 * Returns null if the entity needs a c/p prefix that T and N lack (see requiresTnmPrefix).
 * @param entity - The Wiley entity definition
 * @param t - T category (e.g., "pT1", "cT2")
 * @param n - N category (e.g., "pN0", "cN1")
 * @param m - M category (e.g., "M0", "M1")
 * @param preferPathologic - Prefer pathologic staging if available
 */
export function getWileyStaging(
  entity: WileyEntity,
  t: string | null | undefined,
  n: string | null | undefined,
  m: string | null | undefined,
  preferPathologic: boolean = true
): string | null {
  if (!t || !n || !m || requiresTnmPrefix(entity, t, n)) {
    return null;
  }

  // Normalize patient values
  const tValue = t.replace(/\s/g, '');
  const nValue = n.replace(/\s/g, '');
  const mValue = m.replace(/\s/g, '');
  
  // Determine if patient has pathologic or clinical values
  const hasPathologic = tValue.toLowerCase().startsWith('p') || nValue.toLowerCase().startsWith('p');
  const hasClinical = tValue.toLowerCase().startsWith('c') || nValue.toLowerCase().startsWith('c');
  
  // Determine preferred type based on patient data
  let preferredType = '';
  if (hasPathologic && preferPathologic) {
    preferredType = 'pathologic';
  } else if (hasClinical) {
    preferredType = 'clinical';
  }
  
  // Helper function to check if rule matches patient
  const checkRuleMatch = (rule: WileyStagingRule): boolean => {
    // Check if rule has explicit type requirement
    const hasTypeRequirement = rule.type === 'clinical' || rule.type === 'pathologic';
    
    // If rule has type requirement, patient must match
    if (hasTypeRequirement) {
      if (rule.type === 'pathologic' && !hasPathologic) return false;
      if (rule.type === 'clinical' && !hasClinical) return false;
    }
    
    // Check if rule has prefixes in TNM values
    const ruleHasPrefixT = /^[pc]/i.test(rule.T);
    const ruleHasPrefixN = /^[pc]/i.test(rule.N);
    const ruleHasPrefixM = /^[pc]/i.test(rule.M);
    
    // Only a prefix in the rule value itself (e.g. "pN1") requires the same prefix
    // on the patient value; the rule type was already checked above.
    const matchesT = matchesTNMCondition(tValue, rule.T, ruleHasPrefixT);
    const matchesN = matchesTNMCondition(nValue, rule.N, ruleHasPrefixN);
    const matchesM = matchesTNMCondition(mValue, rule.M, ruleHasPrefixM);
    
    return matchesT && matchesN && matchesM;
  };
  
  // Try to find a matching stage with preferred type first
  if (preferredType) {
    for (const rule of entity.staging) {
      if (rule.type && rule.type !== preferredType) continue;
      if (checkRuleMatch(rule)) {
        return rule.stage;
      }
    }
  }
  
  // Fallback: try any matching rule
  for (const rule of entity.staging) {
    if (checkRuleMatch(rule)) {
      return rule.stage;
    }
  }
  
  return null;
}

/**
 * Get all possible stages for an entity
 */
export function getAllStagesForEntity(entity: WileyEntity): string[] {
  const stages = new Set<string>();
  for (const rule of entity.staging) {
    stages.add(rule.stage);
  }
  // Sort stages naturally (0, 0a, 0is, I, IA, IA1, IA2, IB, II, IIA, ..., IV, IVA, IVB, IVC)
  return Array.from(stages).sort((a, b) => {
    // Convert to comparable format: roman numeral, then sub-letter, then sub-digit
    const getOrder = (s: string) => {
      if (s.startsWith('0')) return 0;
      const match = s.match(/^(IV|I{1,3})([A-D])?(\d)?$/);
      if (!match) return -1; // e.g. "Occult carcinoma"
      const romanVal = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 }[match[1]] ?? 0;
      const letterVal = match[2] ? match[2].charCodeAt(0) - 64 : 0; // A=1, B=2, C=3
      const digitVal = match[3] ? Number(match[3]) : 0;
      return romanVal * 100 + letterVal * 10 + digitVal;
    };
    return getOrder(a) - getOrder(b) || a.localeCompare(b);
  });
}
