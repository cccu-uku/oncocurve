"use client";

import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { AlertCircle, AlertTriangle } from "lucide-react";
import type { ParseIssue } from "@/components/kaplan-meier/extra-columns";

interface UploadValidationModalProps {
  issues: ParseIssue[] | null;
  onProceed: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function UploadValidationModal({ issues, onProceed, onCancel, onClose }: UploadValidationModalProps) {
  const t = useTranslations("UploadValidation");

  if (!issues || issues.length === 0) return null;

  const requiredIssues = issues.filter(i => i.level === "required");
  const recommendedIssues = issues.filter(i => i.level === "recommended");
  const isHardBlock = requiredIssues.length > 0;
  const displayIssues = isHardBlock ? requiredIssues : recommendedIssues;

  // Translation key for known fields; fallback to the raw field name.
  const fieldLabel = (field: string): string => {
    const knownFields = ["event", "survivalTime", "id", "tumorType", "diagnosisDate"];
    return knownFields.includes(field) ? t(`fields.${field}`) : field;
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isHardBlock
              ? <AlertCircle className="h-5 w-5 text-red-600" />
              : <AlertTriangle className="h-5 w-5 text-amber-600" />}
            {isHardBlock ? t("required.title") : t("recommended.title")}
          </DialogTitle>
          <DialogDescription>
            {isHardBlock ? t("required.body") : t("recommended.body")}
          </DialogDescription>
        </DialogHeader>

        <ul className="text-sm space-y-1 list-disc pl-5">
          {displayIssues.map(issue => (
            <li key={issue.field}>
              <strong>{issue.field}</strong>
              <span className="text-muted-foreground"> - {fieldLabel(issue.field)}</span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          {isHardBlock ? (
            <Button onClick={onClose}>{t("required.button")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel}>{t("recommended.cancelButton")}</Button>
              <Button onClick={onProceed}>{t("recommended.proceedButton")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
