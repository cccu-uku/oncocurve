import { generateMockXML, mockDataScenarios } from "@/components/kaplan-meier/mock-data-generator";
import type { Patient } from "@/components/kaplan-meier/obds-parser-new";

/**
 * Erzeugt die Downloaddateien der synthetischen Testkohorten. Der Inhalt
 * entsteht im Browser, wie alles andere in dieser Anwendung: es wird nichts
 * angefragt und nichts hochgeladen.
 */

const CSV_KOPF =
  "PatientID,Gender,Age,TumorType,TumorCategory,Staging,Grading,SurvivalTime,Event,DiagnosisDate,IsPrimaryCase,TNM_T,TNM_N,TNM_M,SpreadCategory";

function szenarioPatienten(key: string): Patient[] {
  return mockDataScenarios[key as keyof typeof mockDataScenarios]();
}

export function baueSzenarioXml(key: string): string {
  return generateMockXML(szenarioPatienten(key));
}

export function baueSzenarioCsv(key: string): string {
  const zeilen = szenarioPatienten(key).map((p) => {
    // Das Alter steckt in den erzeugten Daten nicht als Feld, sondern nur im
    // Diagnosejahr. Näherung über die Jahresdifferenz, wie schon zuvor.
    const alter = p.diagnosisDate ? new Date().getFullYear() - new Date(p.diagnosisDate).getFullYear() : "unknown";
    return [
      p.id,
      p.gender,
      alter,
      p.tumorType,
      p.tumorCategory || "unknown",
      p.staging?.uicc || "unknown",
      p.grading || "unknown",
      p.survivalTime,
      p.event ? "true" : "false",
      p.diagnosisDate || "unknown",
      p.isPrimaryCase ? "true" : "false",
      p.staging?.tCategory || "unknown",
      p.staging?.nCategory || "unknown",
      p.staging?.mCategory || "unknown",
      p.spreadCategory || "unknown",
    ].join(",");
  });
  return [CSV_KOPF, ...zeilen].join("\n");
}

/** Speichert einen erzeugten Text als Datei, ohne Umweg über einen Server. */
export function speichereAlsDatei(inhalt: string, dateiname: string, typ: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const link = document.createElement("a");
  link.href = url;
  link.download = dateiname;
  link.click();
  URL.revokeObjectURL(url);
}
