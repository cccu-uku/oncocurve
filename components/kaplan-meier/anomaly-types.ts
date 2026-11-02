import type { Patient } from "./obds-parser-new";

export type AnomalyClass =
  | "logic"
  | "plausibility"
  | "outlier"
  | "duplicate_or_missing";

export type AnomalySeverity = "block" | "warn";

export interface AnomalyIssue {
  patientId: string;
  class: AnomalyClass;
  severity: AnomalySeverity;
  ruleId: string;
  messageKey: string; // i18n key under "Anomaly.rules.<ruleId>"
  fields?: string[];
  values?: Record<string, string | number | boolean | null>;
}

export interface AnomalyReport {
  issues: AnomalyIssue[];
  byPatient: Map<string, AnomalyIssue[]>;
  byClass: Record<AnomalyClass, AnomalyIssue[]>;
  hasBlockingIssues: boolean;
}

export type PatientLevelRule = (patient: Patient) => AnomalyIssue | null;
export type CohortLevelRule = (patients: Patient[]) => AnomalyIssue[];

export interface RuleDefinition {
  id: string;
  class: AnomalyClass;
  severity: AnomalySeverity;
  scope: "patient" | "cohort";
  run: PatientLevelRule | CohortLevelRule;
}

export const OUTLIER_MIN_COHORT = 30;
