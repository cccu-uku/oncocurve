/// <reference lib="webworker" />
import { parseRows, xlsxCellToString, type CSVParseResult } from "./parse-rows";

self.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
  try {
    const { Workbook } = await import("exceljs");
    const wb = new Workbook();
    await wb.xlsx.load(e.data.buffer);

    const warnings: string[] = [];
    const sheet = wb.worksheets[0];
    if (!sheet) {
      const empty: CSVParseResult = { patients: [], errors: ["xlsxNoSheet"], warnings, extraColumns: { columns: {}, warnings: [] }, issues: [] };
      (self as unknown as Worker).postMessage(empty);
      return;
    }
    if (wb.worksheets.length > 1) {
      warnings.push(`multiSheet:${wb.worksheets.length}:${sheet.name}`);
    }

    // Headers from row 1 — index 0 is always null in exceljs row.values
    const headerVals = (sheet.getRow(1).values as unknown[]).slice(1);
    const headers = headerVals.map(xlsxCellToString);

    const dataRows: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row, idx) => {
      if (idx === 1) return;
      const vals = (row.values as unknown[]).slice(1);
      dataRows.push(vals.map(xlsxCellToString));
    });

    const result = parseRows(headers, dataRows, warnings);
    (self as unknown as Worker).postMessage(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const result: CSVParseResult = { patients: [], errors: [`xlsxParseError:${msg}`], warnings: [], extraColumns: { columns: {}, warnings: [] }, issues: [] };
    (self as unknown as Worker).postMessage(result);
  }
};
