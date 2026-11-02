import { importOncoBox, type OncoBoxImportResult } from "./oncobox-importer";

export interface OncoBoxWorkerRequest {
  xml: string;
}

self.onmessage = (event: MessageEvent<OncoBoxWorkerRequest>): void => {
  try {
    postMessage(importOncoBox(event.data.xml));
  } catch (error) {
    const result: OncoBoxImportResult = {
      patients: [],
      errors: [error instanceof Error ? error.message : "Unbekannter Fehler beim Einlesen"],
      warnings: [],
      meta: null,
    };
    postMessage(result);
  }
};
