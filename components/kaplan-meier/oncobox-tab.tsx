"use client";

import { useState } from "react";
import { Badge, Card, CardContent, Input } from "@/components/ui";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { loadOncoBoxSample } from "./oncobox-load-sample";
import { OncoBoxSampleCards } from "./oncobox-sample-cards";
import type { OncoBoxMeta } from "./oncobox/types";

const FILE_INPUT_ID = "oncobox-file-input";
const XML_SUFFIX = ".xml";

interface OncoBoxTabProps {
  meta: OncoBoxMeta | null;
  onFileSelected: (file: File) => void;
  /** Fehler beim Laden einer Musterlösung. Formatierung und Anzeige liegen bei
   *  der aufrufenden Seite, dieselbe Stelle, die auch die übrigen Upload-Fehler
   *  formatiert (siehe loadMetabric/loadAnomalyDemo in page.tsx). */
  onError: (error: unknown) => void;
}

export function OncoBoxTab({ meta, onFileSelected, onError }: OncoBoxTabProps) {
  const t = useTranslations("OncoBox");
  const tUpload = useTranslations("KaplanMeier");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
  };

  const handleDragOver = (event: React.DragEvent): void => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent): void => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent): void => {
    event.preventDefault();
    setIsDragOver(false);
    const file = Array.from(event.dataTransfer.files).find((candidate) =>
      candidate.name.toLowerCase().endsWith(XML_SUFFIX),
    );
    if (file) {
      onFileSelected(file);
      return;
    }
    onError(new Error(t("dropNeedsXml")));
  };

  const handleLoadSample = async (fileName: string): Promise<void> => {
    try {
      const file = await loadOncoBoxSample(fileName);
      onFileSelected(file);
    } catch (err) {
      onError(err);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
          }`}
          onClick={() => document.getElementById(FILE_INPUT_ID)?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">{t("dropPrompt")}</p>
          <Input id={FILE_INPUT_ID} type="file" accept=".xml" onChange={handleChange} className="hidden" />
        </div>

        {meta && (
          <div className="rounded-lg border p-4 space-y-1">
            <p className="font-medium">
              {t("detected", { box: t(`boxes.${meta.boxType}`), version: meta.schemaVersion })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("counts", {
                patients: meta.patientCount,
                cases: meta.caseCount,
                followUps: meta.followUpCount,
              })}
            </p>
          </div>
        )}

        {/* Die Zusage, dass nichts den Rechner verlässt, steht im alten
            Uploadbereich prominent. Eine zweite Ablagefläche ohne sie wäre eine
            Lücke genau an der Stelle, auf die es Nutzern am meisten ankommt. */}
        <p className="w-full text-center font-bold">{tUpload("upload.clientSideNotice")}</p>

        <OncoBoxSampleCards onLoadSample={handleLoadSample} />

        <Badge variant="secondary">{t("supported")}</Badge>
      </CardContent>
    </Card>
  );
}
