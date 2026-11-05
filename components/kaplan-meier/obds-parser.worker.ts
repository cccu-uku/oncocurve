// Web-Worker für oBDS-Parsing (rein clientseitig)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { parseOBDSXMLNew } from "@/components/kaplan-meier/obds-parser-new";

export type WorkerParseRequest = {
  xml: string;
};

export type WorkerParseResponse = {
  patients: any[];
  errors: string[];
  warnings: string[];
};

// eslint-disable-next-line no-restricted-globals
self.onmessage = (e: MessageEvent<WorkerParseRequest>) => {
  try {
    const { xml } = e.data;
    const result = parseOBDSXMLNew(xml);
    const response: WorkerParseResponse = {
      patients: result.patients,
      errors: result.errors || [],
      warnings: result.warnings || [],
    };
    // eslint-disable-next-line no-restricted-globals
    (self as any).postMessage(response);
  } catch (err: any) {
    const response: WorkerParseResponse = {
      patients: [],
      errors: [err?.message || "Unbekannter Fehler beim Parsen"],
      warnings: [],
    };
    // eslint-disable-next-line no-restricted-globals
    (self as any).postMessage(response);
  }
};


