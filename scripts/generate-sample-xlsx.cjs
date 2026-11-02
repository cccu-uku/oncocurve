const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function main() {
  const csvPath = path.join(__dirname, "..", "public", "sample-extras", "sample-extras-cohort.csv");
  const xlsxPath = path.join(__dirname, "..", "public", "sample-extras", "sample-extras-cohort.xlsx");

  const csvText = fs.readFileSync(csvPath, "utf8");
  const lines = csvText.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const rows = lines.slice(1).map(line => line.split(","));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Patienten");
  ws.addRow(headers);
  rows.forEach(r => ws.addRow(r));

  // Header bold
  ws.getRow(1).font = { bold: true };

  await wb.xlsx.writeFile(xlsxPath);
  console.log(`Wrote ${xlsxPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
