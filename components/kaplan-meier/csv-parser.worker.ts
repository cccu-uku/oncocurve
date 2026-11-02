/**
 * CSV Parser Web Worker
 * Parses CSV files in a separate thread to avoid blocking the main UI
 */

import { parseCSV } from './csv-parser';

// Worker message handler
self.onmessage = (event: MessageEvent<{ csv: string }>) => {
  try {
    const { csv } = event.data;
    
    
    if (!csv) {
      self.postMessage({
        patients: [],
        errors: ['No CSV data provided'],
        warnings: [],
        extraColumns: { columns: {}, warnings: [] },
        issues: []
      });
      return;
    }
    
    // Parse the CSV
    const result = parseCSV(csv);
    
    
    // Send result back to main thread
    self.postMessage(result);
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      patients: [],
      errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
      warnings: [],
      extraColumns: { columns: {}, warnings: [] },
      issues: []
    });
  }
};
