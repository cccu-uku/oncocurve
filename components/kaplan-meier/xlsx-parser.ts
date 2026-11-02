import { parseRows, xlsxCellToString, type CSVParseResult } from "./parse-rows";

export async function parseXLSX(buffer: ArrayBuffer): Promise<CSVParseResult> {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  await wb.xlsx.load(buffer);

  const warnings: string[] = [];
  const sheet = wb.worksheets[0];
  if (!sheet) return { patients: [], errors: ["xlsxNoSheet"], warnings, extraColumns: { columns: {}, warnings: [] }, issues: [] };
  if (wb.worksheets.length > 1) warnings.push(`multiSheet:${wb.worksheets.length}:${sheet.name}`);

  const headerVals = (sheet.getRow(1).values as unknown[]).slice(1);
  const headers = headerVals.map(xlsxCellToString);

  const dataRows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, idx) => {
    if (idx === 1) return;
    const vals = (row.values as unknown[]).slice(1);
    dataRows.push(vals.map(xlsxCellToString));
  });

  return parseRows(headers, dataRows, warnings);
}
