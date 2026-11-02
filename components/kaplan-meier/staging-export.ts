// Export utilities for staging validation

import { type Patient } from "./obds-parser-new";
import { findEntityByTumorCategory, getWileyStaging, requiresTnmPrefix, tnmForStaging, type WileyEntity } from "./tnm-wiley-staging";

export interface StagingExportRow {
  patientId: string;
  icd10: string;
  entityName: string;
  tCategory: string;
  nCategory: string;
  mCategory: string;
  determinedStage: string;
  matchedRule: string;
  notes: string;
}

/**
 * Find the matching TNM staging rule for debugging/validation
 */
function findMatchingRule(
  entity: WileyEntity,
  t: string,
  n: string,
  m: string
): { stage: string; rule: string } | null {
  if (!t || !n || !m) {
    return null;
  }

  // Strip prefixes for matching
  const tValue = t.replace(/^[pc]/i, '');
  const nValue = n.replace(/^[pc]/i, '');
  const mValue = m; // M doesn't have prefix

  // Helper function to check if TNM value matches condition
  const matchesTNMCondition = (patientValue: string, condition: string): boolean => {
    if (!patientValue || !condition) return false;
    
    const normalizedPatient = patientValue.replace(/\s/g, '').toLowerCase();
    const normalizedCondition = condition.replace(/\s/g, '').toLowerCase();
    
    if (normalizedCondition.startsWith('any')) return true;
    if (normalizedPatient === normalizedCondition) return true;
    
    // Handle comma-separated values
    const conditions = condition.split(',').map(v => v.trim());
    return conditions.some(cond => {
      const norm = cond.replace(/\s/g, '').toLowerCase();
      return normalizedPatient === norm;
    });
  };

  // Try pathologic type first
  for (const rule of entity.staging) {
    const matchesT = matchesTNMCondition(tValue, rule.T);
    const matchesN = matchesTNMCondition(nValue, rule.N);
    const matchesM = matchesTNMCondition(mValue, rule.M);
    
    if (matchesT && matchesN && matchesM) {
      const ruleDesc = `T=${rule.T}, N=${rule.N}, M=${rule.M}, type=${rule.type || 'any'}`;
      return { stage: rule.stage, rule: ruleDesc };
    }
  }

  return null;
}

/**
 * Generate staging export data for all patients
 */
export function generateStagingExport(patients: Patient[]): StagingExportRow[] {
  const rows: StagingExportRow[] = [];

  for (const patient of patients) {
    // Extract ICD10 code
    const patientICD10 = patient.tumorType?.match(/^([CDZ]\d{2})/)?.[1];
    if (!patientICD10) {
      rows.push({
        patientId: patient.id || 'unknown',
        icd10: 'N/A',
        entityName: 'N/A',
        tCategory: 'N/A',
        nCategory: 'N/A',
        mCategory: 'N/A',
        determinedStage: 'N/A',
        matchedRule: 'N/A',
        notes: 'Kein ICD10-Code gefunden in tumorType'
      });
      continue;
    }

    // Find Wiley entity (with age for Thyroid)
    const patientAge = typeof patient.age === 'number' ? patient.age : undefined;
    const wileyEntity = findEntityByTumorCategory("", patientICD10, patientAge);
    if (!wileyEntity) {
      rows.push({
        patientId: patient.id || 'unknown',
        icd10: patientICD10,
        entityName: 'N/A',
        tCategory: 'N/A',
        nCategory: 'N/A',
        mCategory: 'N/A',
        determinedStage: 'N/A',
        matchedRule: 'N/A',
        notes: `Keine Wiley-Entität gefunden für ICD10: ${patientICD10}`
      });
      continue;
    }

    // Get TNM values
    const { t, n, m } = tnmForStaging(patient.staging);

    if (!t || !n || !m) {
      rows.push({
        patientId: patient.id || 'unknown',
        icd10: patientICD10,
        entityName: wileyEntity.entity,
        tCategory: t || 'N/A',
        nCategory: n || 'N/A',
        mCategory: m || 'N/A',
        determinedStage: 'N/A',
        matchedRule: 'N/A',
        notes: 'Fehlende TNM-Werte'
      });
      continue;
    }

    // Determine stage and find matching rule
    const stage = getWileyStaging(wileyEntity, t, n, m);
    const matchInfo = findMatchingRule(wileyEntity, t, n, m);

    rows.push({
      patientId: patient.id || 'unknown',
      icd10: patientICD10,
      entityName: wileyEntity.entity,
      tCategory: t,
      nCategory: n,
      mCategory: m,
      determinedStage: stage || 'Keine Übereinstimmung',
      matchedRule: matchInfo?.rule || 'Keine Regel gefunden',
      notes: stage
        ? 'Erfolgreich zugeordnet'
        : requiresTnmPrefix(wileyEntity, t, n)
          ? 'Kein c/p-Präfix an T oder N; die Entität gruppiert klinisch und pathologisch getrennt'
          : 'Keine passende Staging-Regel'
    });
  }

  return rows;
}

/**
 * Convert staging export data to CSV format
 */
export function exportToCSV(rows: StagingExportRow[]): string {
  const headers = [
    'Patienten-ID',
    'ICD10',
    'Wiley-Entität',
    'T-Kategorie',
    'N-Kategorie',
    'M-Kategorie',
    'Ermitteltes Stadium',
    'Verwendete Regel',
    'Notizen'
  ];

  const csvRows = [
    headers.join(';'),
    ...rows.map(row => [
      row.patientId,
      row.icd10,
      row.entityName,
      row.tCategory,
      row.nCategory,
      row.mCategory,
      row.determinedStage,
      `"${row.matchedRule}"`, // Quote rule to handle commas
      row.notes
    ].join(';'))
  ];

  return csvRows.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'staging-validation.csv'): void {
  // Add BOM for proper Excel UTF-8 handling
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
