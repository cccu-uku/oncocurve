/**
 * CSV Parser for Patient Data
 * Handles format detection and splitting; delegates patient construction to parse-rows.ts
 */

import { HEADER_ALIASES, type CSVParseResult, parseRows, parseTXTFormat } from "./parse-rows";

// Re-export for consumers that imported these from csv-parser
export type { CSVParseResult };
export { HEADER_ALIASES };

/**
 * Detect CSV delimiter from the first line of a file
 */
function detectDelimiter(line: string): string {
  const delimiters = [',', ';', '\t', '|', '$'];
  const counts = delimiters.map(d => line.split(d).length);
  const maxIndex = counts.indexOf(Math.max(...counts));
  return delimiters[maxIndex];
}

/**
 * Parse CSV/TXT text into Patient objects.
 * Auto-detects format (CSV with comma/semicolon/tab or TXT with $).
 */
export function parseCSV(csvText: string): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Auto-detect format by checking first line
    const firstLine = csvText.trim().split(/\r?\n/)[0];

    // If contains $ delimiter, treat as TXT format
    if (firstLine.includes('$')) {
      return parseTXTFormat(csvText);
    }

    const lines = csvText.trim().split(/\r?\n/);

    if (lines.length < 2) {
      errors.push('CSV file must contain at least a header row and one data row');
      return { patients: [], errors, warnings, extraColumns: { columns: {}, warnings: [] }, issues: [] };
    }

    // Detect delimiter from first line
    const delimiter = detectDelimiter(lines[0]);

    // Split and unquote header
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

    // Split and unquote data rows (skip empty lines)
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      rows.push(line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, '')));
    }

    return parseRows(headers, rows, warnings);

  } catch (err) {
    errors.push(`CSV parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return { patients: [], errors, warnings, extraColumns: { columns: {}, warnings: [] }, issues: [] };
  }
}
