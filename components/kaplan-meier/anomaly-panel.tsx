"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@/components/ui";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { Patient } from "@/components/kaplan-meier/obds-parser-new";
import { detectAnomalies } from "@/components/kaplan-meier/anomaly-detection";
import type { AnomalyClass, AnomalyIssue } from "@/components/kaplan-meier/anomaly-types";

interface Props {
  patients: Patient[];
  excludedIds: Set<string>;
  onExcludedChange: (next: Set<string>) => void;
  // When set (e.g. the guided tour reaches the anomaly step) the panel expands.
  forceOpen?: boolean;
  // Increments each time the compact indicator above the chart is clicked.
  // Any change (including the first, from undefined/0) opens the panel, so
  // clicking the indicator again after manually closing the panel reopens it.
  expandSignal?: number;
}

const PANEL_CLASSES: AnomalyClass[] = [
  "logic",
  "plausibility",
  "outlier",
  "duplicate_or_missing",
];

// Virtual tab id for the "Excluded" view — not an AnomalyClass, lives next
// to the four detection classes in the tab bar.
const EXCLUDED_TAB = "__excluded__" as const;
type TabId = AnomalyClass | typeof EXCLUDED_TAB;

// Cap the number of issue rows rendered at once. Without a cap, a cohort with
// e.g. 3000 patients all missing vital_status would mount 3000 <tr> elements
// and re-reconcile them on every parent render (stratification change, theme
// change, etc.), which freezes the tab.
const INITIAL_ROW_CAP = 50;

function AnomalyPanelImpl({ patients, excludedIds, onExcludedChange, forceOpen, expandSignal }: Props) {
  const t = useTranslations("Anomaly");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);
  useEffect(() => {
    if (expandSignal) setOpen(true);
  }, [expandSignal]);
  const [activeTab, setActiveTab] = useState<TabId>("logic");
  const [showAll, setShowAll] = useState<Partial<Record<TabId, boolean>>>({});

  const report = useMemo(() => detectAnomalies(patients), [patients]);

  const classesWithIssues = useMemo(
    () => PANEL_CLASSES.filter(c => report.byClass[c].length > 0),
    [report],
  );

  const findingsCount = useMemo(
    () => PANEL_CLASSES.reduce((acc, c) => acc + report.byClass[c].length, 0),
    [report],
  );

  // All hooks MUST be declared before any early return. React enforces
  // identical hook order across renders.
  const toggle = useCallback((id: string) => {
    const next = new Set(excludedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onExcludedChange(next);
  }, [excludedIds, onExcludedChange]);

  const excludeClass = useCallback((cls: AnomalyClass) => {
    const next = new Set(excludedIds);
    for (const i of report.byClass[cls]) next.add(i.patientId);
    onExcludedChange(next);
  }, [excludedIds, onExcludedChange, report]);

  const excludeAll = useCallback(() => {
    const next = new Set(excludedIds);
    for (const cls of PANEL_CLASSES) {
      for (const i of report.byClass[cls]) next.add(i.patientId);
    }
    onExcludedChange(next);
  }, [excludedIds, onExcludedChange, report]);

  const reset = useCallback(() => onExcludedChange(new Set()), [onExcludedChange]);

  // Excluded-tab data: one row per excluded patient with all detected classes.
  // Built from byPatient so the list is stable even after a patient is
  // un-excluded mid-session (they stay listed in their detection tab).
  // MUST be declared before the early return below to keep hook order stable.
  const excludedRows = useMemo(() => {
    const out: { patientId: string; classes: AnomalyClass[]; firstRuleId: string }[] = [];
    for (const id of excludedIds) {
      const issues = report.byPatient.get(id);
      if (issues && issues.length > 0) {
        const classes = Array.from(new Set(issues.map(i => i.class)));
        out.push({ patientId: id, classes, firstRuleId: issues[0].ruleId });
      } else {
        // Manually excluded patient with no anomaly (defensive).
        out.push({ patientId: id, classes: [], firstRuleId: "" });
      }
    }
    return out.sort((a, b) => a.patientId.localeCompare(b.patientId));
  }, [excludedIds, report]);

  if (findingsCount === 0 && excludedRows.length === 0) return null;

  // Effective tab logic: if the active tab still has data, keep it.
  // Otherwise fall back to "excluded" (when there are exclusions) or the first
  // class with issues.
  const isClassTab = (t: TabId): t is AnomalyClass => t !== EXCLUDED_TAB;
  const effectiveTab: TabId =
    (activeTab === EXCLUDED_TAB && excludedRows.length > 0)
      ? EXCLUDED_TAB
      : (isClassTab(activeTab) && classesWithIssues.includes(activeTab))
        ? activeTab
        : (classesWithIssues[0] ?? (excludedRows.length > 0 ? EXCLUDED_TAB : "plausibility"));
  const issuesForTab = isClassTab(effectiveTab) ? (report.byClass[effectiveTab] ?? []) : [];

  return (
    <Card id="anomaly-panel" data-tour="anomalies" className="border-yellow-500/60 bg-yellow-50/40 dark:bg-yellow-950/20">
      <CardHeader className="cursor-pointer pb-3" onClick={() => setOpen(o => !o)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          {t("title")}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {t("findingsCount", { count: findingsCount })}
          </span>
          <ChevronDown
            className={`h-4 w-4 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={excludeAll}>
              {t("excludeAll")}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              {t("resetSelection")}
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {t("excludedCount", { excluded: excludedIds.size, total: patients.length })}
            </span>
          </div>

          <div className="flex gap-2 border-b flex-wrap">
            {classesWithIssues.map(cls => (
              <button
                key={cls}
                className={`px-3 py-1 text-sm border-b-2 -mb-px ${
                  effectiveTab === cls
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setActiveTab(cls)}
              >
                {t(`tabs.${cls}`)} ({report.byClass[cls].length})
              </button>
            ))}
            {excludedRows.length > 0 && (
              <button
                key={EXCLUDED_TAB}
                className={`px-3 py-1 text-sm border-b-2 -mb-px ${
                  effectiveTab === EXCLUDED_TAB
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setActiveTab(EXCLUDED_TAB)}
              >
                {t("tabs.excluded")} ({excludedRows.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isClassTab(effectiveTab) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => excludeClass(effectiveTab)}
              >
                {t("tabs.excludeAllInClass")}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            {effectiveTab === EXCLUDED_TAB ? (
              <table className="w-full text-xs table-fixed">
                <colgroup>
                  <col style={{ width: "2rem" }} />
                  <col style={{ width: "8rem" }} />
                  <col />
                </colgroup>
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-1"></th>
                    <th className="text-left p-1">{t("columnPatientId")}</th>
                    <th className="text-left p-1">{t("tabs.excludedClasses")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAll[EXCLUDED_TAB] ? excludedRows : excludedRows.slice(0, INITIAL_ROW_CAP)).map(row => (
                    <ExcludedRow
                      key={row.patientId}
                      patientId={row.patientId}
                      classes={row.classes}
                      onToggle={toggle}
                      classLabel={(cls) => t(`tabs.${cls}`)}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs table-fixed">
                <colgroup>
                  <col style={{ width: "2rem" }} />
                  <col style={{ width: "8rem" }} />
                  <col style={{ width: "14rem" }} />
                  <col />
                </colgroup>
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-1"></th>
                    <th className="text-left p-1">{t("columnPatientId")}</th>
                    <th className="text-left p-1">{t("columnRule")}</th>
                    <th className="text-left p-1">{t("columnFields")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAll[effectiveTab] ? issuesForTab : issuesForTab.slice(0, INITIAL_ROW_CAP)).map((i, idx) => (
                    <IssueRow
                      key={`${i.patientId}-${i.ruleId}-${idx}`}
                      issue={i}
                      excluded={excludedIds.has(i.patientId)}
                      onToggle={toggle}
                      ruleLabel={t(`rules.${i.ruleId}`)}
                    />
                  ))}
                </tbody>
              </table>
            )}
            {(() => {
              const len = effectiveTab === EXCLUDED_TAB ? excludedRows.length : issuesForTab.length;
              return len > INITIAL_ROW_CAP && !showAll[effectiveTab];
            })() && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAll(prev => ({ ...prev, [effectiveTab]: true }))}
                >
                  {t("showAllRows", {
                    shown: INITIAL_ROW_CAP,
                    total: effectiveTab === EXCLUDED_TAB ? excludedRows.length : issuesForTab.length,
                  })}
                </Button>
              </div>
            )}
          </div>

          {excludedIds.size === patients.length && (
            <p className="text-xs text-destructive">{t("emptyAfterExclusion")}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export const AnomalyPanel = memo(AnomalyPanelImpl);

const IssueRow = memo(function IssueRow({
  issue,
  excluded,
  onToggle,
  ruleLabel,
}: {
  issue: AnomalyIssue;
  excluded: boolean;
  onToggle: (id: string) => void;
  ruleLabel: string;
}) {
  return (
    <tr className="border-t">
      <td className="p-1 align-top">
        <input type="checkbox" checked={excluded} onChange={() => onToggle(issue.patientId)} />
      </td>
      <td className="p-1 font-mono align-top break-all">{issue.patientId}</td>
      <td className="p-1 align-top">{ruleLabel}</td>
      <td className="p-1 align-top text-muted-foreground break-all">
        {(issue.fields ?? []).join(", ")}
      </td>
    </tr>
  );
});

// Row in the "Excluded" tab. Checkbox is initially checked (the row is here
// BECAUSE the patient is excluded). Unchecking removes them from the set and
// thus re-includes them in the analysis immediately.
const ExcludedRow = memo(function ExcludedRow({
  patientId,
  classes,
  onToggle,
  classLabel,
}: {
  patientId: string;
  classes: AnomalyClass[];
  onToggle: (id: string) => void;
  classLabel: (cls: AnomalyClass) => string;
}) {
  return (
    <tr className="border-t">
      <td className="p-1 align-top">
        <input type="checkbox" checked onChange={() => onToggle(patientId)} />
      </td>
      <td className="p-1 font-mono align-top break-all">{patientId}</td>
      <td className="p-1 align-top text-muted-foreground break-all">
        {classes.length === 0 ? "-" : classes.map(classLabel).join(", ")}
      </td>
    </tr>
  );
});
