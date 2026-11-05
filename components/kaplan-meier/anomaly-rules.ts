import type { Patient } from "./obds-parser-new";
import type { AnomalyIssue, AnomalyClass, AnomalySeverity, RuleDefinition } from "./anomaly-types";
import { findEntityByTumorCategory, requiresTnmPrefix, tnmForStaging } from "./tnm-wiley-staging";

// Patient date fields may arrive as Date objects (fresh parse) or as strings
// (after a JSON round-trip through sessionStorage or the mock-data API).
// Normalise defensively so rules never call .getTime() on a string.
const toTime = (value: unknown): number => {
  if (value == null) return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).getTime();
  }
  return NaN;
};

const toIso = (value: unknown): string => {
  const t = toTime(value);
  return isNaN(t) ? String(value ?? "") : new Date(t).toISOString();
};

const issue = (
  patient: Patient,
  ruleId: string,
  cls: AnomalyClass,
  severity: AnomalySeverity,
  fields: string[],
  values?: Record<string, string | number | boolean | null>,
): AnomalyIssue => ({
  patientId: patient.id,
  class: cls,
  severity,
  ruleId,
  messageKey: `Anomaly.rules.${ruleId}`,
  fields,
  values,
});

export const LOGIC_RULES: RuleDefinition[] = [
  {
    id: "death_before_diagnosis",
    class: "logic",
    severity: "block",
    scope: "patient",
    run: (p: Patient) => {
      // vitalStatus: true = alive, false = dead. Only check dead patients.
      if (p.vitalStatus !== false) return null;
      if (!p.followupDate || !p.diagnosisDate) return null;
      const diag = toTime(p.diagnosisDate);
      const followup = toTime(p.followupDate);
      if (isNaN(diag) || isNaN(followup)) return null;
      if (followup >= diag) return null;
      return issue(p, "death_before_diagnosis", "logic", "block",
        ["diagnosisDate", "followupDate"],
        { diagnosisDate: toIso(p.diagnosisDate), followupDate: toIso(p.followupDate) });
    },
  },
  {
    id: "last_contact_before_diagnosis",
    class: "logic",
    severity: "block",
    scope: "patient",
    run: (p: Patient) => {
      // Skip dead patients (covered by death_before_diagnosis).
      if (p.vitalStatus === false) return null;
      if (!p.followupDate || !p.diagnosisDate) return null;
      const diag = toTime(p.diagnosisDate);
      const followup = toTime(p.followupDate);
      if (isNaN(diag) || isNaN(followup)) return null;
      if (followup >= diag) return null;
      return issue(p, "last_contact_before_diagnosis", "logic", "block",
        ["diagnosisDate", "followupDate"]);
    },
  },
  {
    id: "diagnosis_in_future",
    class: "logic",
    severity: "block",
    scope: "patient",
    run: (p: Patient) => {
      if (!p.diagnosisDate) return null;
      const t = toTime(p.diagnosisDate);
      if (isNaN(t)) return null;
      if (t <= Date.now()) return null;
      return issue(p, "diagnosis_in_future", "logic", "block", ["diagnosisDate"]);
    },
  },
  {
    id: "negative_survival_time",
    class: "logic",
    severity: "block",
    scope: "patient",
    run: (p: Patient) => {
      if (p.survivalTime >= 0) return null;
      return issue(p, "negative_survival_time", "logic", "block",
        ["survivalTime"], { survivalTime: p.survivalTime });
    },
  },
  {
    id: "age_out_of_range",
    class: "logic",
    severity: "block",
    scope: "patient",
    run: (p: Patient) => {
      if (typeof p.age !== "number" || isNaN(p.age)) return null;
      if (p.age >= 0 && p.age <= 120) return null;
      return issue(p, "age_out_of_range", "logic", "block",
        ["age"], { age: p.age });
    },
  },
  {
    id: "dead_without_death_date",
    class: "logic",
    severity: "block",
    scope: "patient",
    run: (p: Patient) => {
      // Only flag dead patients (vitalStatus === false).
      if (p.vitalStatus !== false) return null;
      // An explicit follow-up / death date answers "when did they die".
      if (p.followupDate) return null;
      // CSV/Excel datasets (e.g. METABRIC) carry the timing as survivalTime
      // (months since diagnosis) instead of an explicit death date. That is
      // complete data, so a positive survival time means the timing is known —
      // don't flag it. Only a dead patient with neither is a real problem.
      if (typeof p.survivalTime === "number" && p.survivalTime > 0) return null;
      return issue(p, "dead_without_death_date", "logic", "block",
        ["vitalStatus", "followupDate"]);
    },
  },
];

const ONE_DAY_MS = 86_400_000;

export const PLAUSIBILITY_RULES: RuleDefinition[] = [
  {
    id: "tnm_t0_with_metastasis",
    class: "plausibility",
    severity: "warn",
    scope: "patient",
    run: (p: Patient) => {
      const t = p.staging?.tCategory;
      const m = p.staging?.mCategory;
      if (t !== "T0" || m !== "M1") return null;
      return issue(p, "tnm_t0_with_metastasis", "plausibility", "warn",
        ["staging.tCategory", "staging.mCategory"], { tCategory: t, mCategory: m });
    },
  },
  {
    // Entitäten mit getrennter klinischer und pathologischer Stadiengruppierung
    // brauchen ein c/p-Präfix an T oder N; ohne Präfix wird kein Stadium berechnet.
    id: "tnm_prefix_missing",
    class: "plausibility",
    severity: "warn",
    scope: "patient",
    run: (p: Patient) => {
      const icd10 = p.tumorType?.match(/^([CDZ]\d{2})/)?.[1];
      if (!icd10) return null;
      const entity = findEntityByTumorCategory("", icd10, typeof p.age === "number" ? p.age : undefined);
      if (!entity) return null;
      const { t, n, m } = tnmForStaging(p.staging);
      if (!t || !n || !m) return null;
      if (!requiresTnmPrefix(entity, t, n)) return null;
      return issue(p, "tnm_prefix_missing", "plausibility", "warn",
        ["staging.tCategory", "staging.nCategory"], { tCategory: t, nCategory: n });
    },
  },
  {
    id: "survival_over_25_years",
    class: "plausibility",
    severity: "warn",
    scope: "patient",
    run: (p: Patient) => {
      if (p.survivalTime <= 300) return null;
      return issue(p, "survival_over_25_years", "plausibility", "warn",
        ["survivalTime"], { survivalTime: p.survivalTime });
    },
  },
  {
    id: "very_short_followup_alive",
    class: "plausibility",
    severity: "warn",
    scope: "patient",
    run: (p: Patient) => {
      // Only flag alive patients (vitalStatus === true).
      if (!p.vitalStatus) return null;
      if (!p.diagnosisDate || !p.followupDate) return null;
      const diag = toTime(p.diagnosisDate);
      const followup = toTime(p.followupDate);
      if (isNaN(diag) || isNaN(followup)) return null;
      const days = (followup - diag) / ONE_DAY_MS;
      if (days >= 30) return null;
      return issue(p, "very_short_followup_alive", "plausibility", "warn",
        ["followupDate"], { days: Math.round(days) });
    },
  },
  {
    id: "diagnosis_year_unrealistic",
    class: "plausibility",
    severity: "warn",
    scope: "patient",
    run: (p: Patient) => {
      if (!p.diagnosisDate) return null;
      const t = toTime(p.diagnosisDate);
      if (isNaN(t)) return null;
      const y = new Date(t).getFullYear();
      if (y >= 1950) return null;
      return issue(p, "diagnosis_year_unrealistic", "plausibility", "warn",
        ["diagnosisDate"], { year: y });
    },
  },
  {
    // Darm 1.0 kennt keinen Primärfallmarker; dort gilt jeder Zentrumsfall als
    // Primärfall (siehe countsAsPrimary in oncobox/to-patients.ts). Diese
    // Annahme soll sichtbar sein statt stillschweigend zu gelten.
    id: "oncobox_no_primary_marker",
    class: "plausibility",
    severity: "warn",
    scope: "cohort",
    run: (patients: Patient[]) =>
      patients
        .filter(p => p.oncoBox && p.oncoBox.isPrimary === null)
        .map(p => issue(p, "oncobox_no_primary_marker", "plausibility", "warn",
          ["oncoBox.isPrimary"])),
  },
];

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted[sorted.length - 1];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

// Percentile "outlier" rules were removed entirely. Flagging the extreme
// 2.5%/97.5% (previously also 1%/99%) of a cohort is circular: those tails are
// outliers by definition, not because the values are implausible. In practice
// it flagged ~5% of every dataset (e.g. ~90 spurious warnings on the clean
// METABRIC reference cohort) instead of surfacing real data-quality problems.
// `percentile` is kept as an exported helper for tests and potential reuse.
export const OUTLIER_RULES: RuleDefinition[] = [];

export const DUPLICATE_MISSING_RULES: RuleDefinition[] = [
  {
    id: "duplicate_patient_id",
    class: "duplicate_or_missing",
    severity: "warn",
    scope: "cohort",
    run: (patients: Patient[]) => {
      const counts = new Map<string, number>();
      for (const p of patients) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
      const out: AnomalyIssue[] = [];
      for (const p of patients) {
        if ((counts.get(p.id) ?? 0) > 1) {
          out.push(issue(p, "duplicate_patient_id", "duplicate_or_missing", "warn",
            ["id"], { id: p.id }));
        }
      }
      return out;
    },
  },
  {
    id: "missing_diagnosis_date",
    class: "duplicate_or_missing",
    severity: "warn",
    scope: "cohort",
    run: (patients: Patient[]) =>
      patients
        .filter(p => !p.diagnosisDate)
        .map(p => issue(p, "missing_diagnosis_date", "duplicate_or_missing", "warn",
          ["diagnosisDate"])),
  },
  {
    id: "missing_vital_status",
    class: "duplicate_or_missing",
    severity: "warn",
    scope: "cohort",
    run: (patients: Patient[]) =>
      patients
        // vitalStatus is a boolean: false (=dead) is a valid value, so only
        // treat null/undefined as missing.
        .filter(p => p.vitalStatus == null)
        .map(p => issue(p, "missing_vital_status", "duplicate_or_missing", "warn",
          ["vitalStatus"])),
  },
  {
    // Eine Person mit mehreren Primärfällen (z.B. bilaterales Mammakarzinom,
    // Zweittumor) zählt beim Gesamtüberleben mehrfach, ihr Sterbedatum geht in
    // mehrere Zeilen ein. Für die Fallzahl des Zentrums korrekt, für eine
    // Auswertung sind das keine unabhängigen Beobachtungen mehr.
    id: "oncobox_multiple_primaries",
    class: "duplicate_or_missing",
    severity: "warn",
    scope: "cohort",
    run: (patients: Patient[]) => {
      const casesPerPerson = new Map<string, number>();
      for (const p of patients) {
        const personId = p.oncoBox?.patientId;
        if (!personId) continue;
        casesPerPerson.set(personId, (casesPerPerson.get(personId) ?? 0) + 1);
      }
      return patients
        .filter(p => p.oncoBox && (casesPerPerson.get(p.oncoBox.patientId) ?? 0) > 1)
        .map(p => issue(p, "oncobox_multiple_primaries", "duplicate_or_missing", "warn",
          ["oncoBox.patientId"], { patientId: p.oncoBox!.patientId }));
    },
  },
  {
    // Fälle ohne Verlaufsdaten und ohne Sterbedatum tragen nichts zur Kurve
    // bei; die veröffentlichte Darm-1.0-Stichprobe besteht ausschließlich aus
    // solchen Fällen.
    id: "oncobox_no_follow_up",
    class: "duplicate_or_missing",
    severity: "warn",
    scope: "cohort",
    run: (patients: Patient[]) =>
      patients
        .filter(p => p.oncoBox && p.oncoBox.followUps.length === 0 && !p.oncoBox.deathDate)
        .map(p => issue(p, "oncobox_no_follow_up", "duplicate_or_missing", "warn",
          ["oncoBox.followUps", "oncoBox.deathDate"])),
  },
  {
    // Die 2.0-Boxen tragen im ICD-Feld auch den Platzhalter "N" für "Kein
    // Primärtumor/Lokalrezidiv" (dreimal in brust-2.xml); to-patients.ts
    // wandelt das bereits in tumorType "Unbekannt". Solche Fälle haben keine
    // Tumorentität und lassen sich nicht nach ICD-10 filtern.
    id: "oncobox_no_diagnosis_code",
    class: "duplicate_or_missing",
    severity: "warn",
    scope: "cohort",
    run: (patients: Patient[]) =>
      patients
        .filter(p => p.oncoBox && p.tumorType === "Unbekannt")
        .map(p => issue(p, "oncobox_no_diagnosis_code", "duplicate_or_missing", "warn",
          ["tumorType", "oncoBox.icd10"], { icd10: p.oncoBox!.icd10 })),
  },
];

export const ALL_RULES: RuleDefinition[] = [
  ...LOGIC_RULES,
  ...PLAUSIBILITY_RULES,
  ...OUTLIER_RULES,
  ...DUPLICATE_MISSING_RULES,
];
