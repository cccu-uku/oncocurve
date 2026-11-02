import type { Patient } from "./obds-parser-new";
import type { AnomalyClass, AnomalyIssue, AnomalyReport } from "./anomaly-types";
import { ALL_RULES } from "./anomaly-rules";

export function detectAnomalies(patients: Patient[]): AnomalyReport {
  const issues: AnomalyIssue[] = [];
  for (const rule of ALL_RULES) {
    if (rule.scope === "patient") {
      for (const p of patients) {
        const i = (rule.run as (p: Patient) => AnomalyIssue | null)(p);
        if (i) issues.push(i);
      }
    } else {
      const arr = (rule.run as (ps: Patient[]) => AnomalyIssue[])(patients);
      for (const i of arr) issues.push(i);
    }
  }

  const byPatient = new Map<string, AnomalyIssue[]>();
  const byClass: Record<AnomalyClass, AnomalyIssue[]> = {
    logic: [],
    plausibility: [],
    outlier: [],
    duplicate_or_missing: [],
  };
  for (const i of issues) {
    byClass[i.class].push(i);
    const arr = byPatient.get(i.patientId) ?? [];
    arr.push(i);
    byPatient.set(i.patientId, arr);
  }
  const hasBlockingIssues = issues.some(i => i.severity === "block");

  return { issues, byPatient, byClass, hasBlockingIssues };
}
