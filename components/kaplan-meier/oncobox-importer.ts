import { parseCases } from "./oncobox/parse-cases";
import { detectOncoBox, type DetectionReason } from "./oncobox/registry";
import { toPatients } from "./oncobox/to-patients";
import type { OncoBoxImportResult } from "./oncobox/types";

export type { OncoBoxImportResult, OncoBoxMeta } from "./oncobox/types";

const REASON_MESSAGES: Record<DetectionReason, (box: string, version: string) => string> = {
  notYetSupported: (box, version) =>
    `OncoBox ${box} ${version} erkannt, wird in dieser Version noch nicht unterstützt.`,
  diginet: (box, version) =>
    `OncoBox ${box} ${version} in der DIGINET-Fassung erkannt. Unterstützt wird die Fassung für die DKG-Zertifizierung.`,
};

export function detectOncoBoxXml(xml: string): boolean {
  return detectOncoBox(xml) !== null;
}

export function importOncoBox(xml: string): OncoBoxImportResult {
  const empty: OncoBoxImportResult = { patients: [], errors: [], warnings: [], meta: null };

  const detection = detectOncoBox(xml);
  if (!detection) {
    return { ...empty, errors: ["Die Datei konnte keiner OncoBox zugeordnet werden."] };
  }
  if (detection.kind === "known") {
    const message = REASON_MESSAGES[detection.reason];
    return {
      ...empty,
      errors: [message(detection.boxType, detection.schemaVersion)],
      unsupported: { boxType: detection.boxType, schemaVersion: detection.schemaVersion },
    };
  }

  const { cases, warnings } = parseCases(xml, detection.profile);
  if (cases.length === 0) {
    return { ...empty, errors: ["Keine Fälle in der Datei gefunden."], warnings };
  }

  const meta = {
    boxType: detection.boxType,
    profileId: detection.profile.id,
    schemaVersion: detection.schemaVersion,
    patientCount: new Set(cases.map((item) => item.patientId)).size,
    caseCount: cases.length,
    followUpCount: cases.reduce((sum, item) => sum + item.followUps.length, 0),
  };

  return { patients: toPatients(cases, meta), errors: [], warnings, meta };
}
