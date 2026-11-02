"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, Download } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import type { AnomalyIssue, AnomalyReport } from "@/components/kaplan-meier/anomaly-types";

interface Props {
  report: AnomalyReport | null;
  onCancel: () => void;
}

export function UploadAnomalyModal({ report, onCancel }: Props) {
  const t = useTranslations("Anomaly");

  if (!report || !report.hasBlockingIssues) return null;

  const blocking = report.byClass.logic;
  const grouped = new Map<string, AnomalyIssue[]>();
  for (const i of blocking) {
    const arr = grouped.get(i.ruleId) ?? [];
    arr.push(i);
    grouped.set(i.ruleId, arr);
  }

  const downloadCsv = () => {
    const header = ["patient_id", "rule", "fields"];
    const rows = blocking.map(i => [
      i.patientId,
      i.ruleId,
      (i.fields ?? []).join(";"),
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anomalies-logic-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("upload.title")}
          </DialogTitle>
          <DialogDescription>{t("upload.intro")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-3 text-sm">
          {[...grouped.entries()].map(([ruleId, issues]) => (
            <details key={ruleId} className="border rounded p-2">
              <summary className="font-medium cursor-pointer">
                {t("upload.groupedHeader", {
                  ruleLabel: t(`rules.${ruleId}`),
                  count: issues.length,
                })}
              </summary>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {issues.map(i => (
                  <li key={`${i.patientId}-${i.ruleId}`}>{i.patientId}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-2" /> {t("upload.downloadCsv")}
          </Button>
          <Button variant="default" onClick={onCancel}>
            {t("upload.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
