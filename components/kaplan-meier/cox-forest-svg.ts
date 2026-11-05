// Standalone Cox forest-plot SVG builder. Pure function, no DOM access
// beyond optional dark-mode check. Used by the in-page export buttons and
// by the PDF report so both render identically.

import type { CoxResult } from "@/utils/cox-regression";
import { kompakteZahl } from "./kompakte-zahl";

export interface CoxForestGroup {
  id: string;
  name: string;
  color?: string;
}

export interface BuildCoxForestSvgOptions {
  width?: number;
  rowHeight?: number;
  margin?: { left: number; right: number; top: number; bottom: number };
  title?: string;
  dark?: boolean;
  // Optional raw model statistics rendered as a block above the forest plot.
  stats?: { label: string; value: string }[];
  // Optional results table rendered below the forest plot.
  table?: { headers: string[]; rows: (string | number)[][] };
  // Text shown in place of the marker/CI/label for a row whose HR is not
  // estimable (zero-event group, complete separation). Falls back to English
  // so a caller that forgets to pass the translated string still gets sane
  // output instead of a silently wrong marker.
  notEstimableLabel?: string;
  // Short placeholder for the same case, used in the narrow right-hand value
  // column where the long notEstimableLabel would not fit next to short
  // numbers like "0.68 (0.52-0.85)".
  notEstimableShort?: string;
}

const BLUE_SCALE = ["#08306B", "#08519C", "#2171B5", "#4292C6", "#6BAED6", "#9ECAE1"];
const PINK = "#e6007a";

export function buildCoxForestSvg(
  results: CoxResult[],
  groups: CoxForestGroup[],
  opts: BuildCoxForestSvgOptions = {},
): { svg: string; width: number; height: number } {
  const width = opts.width ?? 800;
  const rowH = opts.rowHeight ?? 28;
  const margin = opts.margin ?? { left: 220, right: 140, top: 44, bottom: 30 };
  const title = opts.title ?? "Cox forest plot";
  const dark = opts.dark ?? false;

  const forestData = results.map(r => ({
    ...r,
    color: groups.find(g => g.id === r.group)?.color || "#888",
  }));
  const center = width / 2;
  const xScale = (hr: number) => Math.log(hr) * 60;
  const axisTicks = [0.5, 1, 2, 4];
  const bg = dark ? "#0b0f14" : "#ffffff";
  const titleFill = dark ? "#9ca3af" : "#555";
  const muted = dark ? "#9ca3af" : "#6b7280";
  const fg = dark ? "#e5e7eb" : "#374151";

  // Vertical layout: title, optional stats block, forest, optional table.
  const stats = opts.stats ?? [];
  const statsH = stats.length ? stats.length * 15 + 12 : 0;
  const plotTop = margin.top + statsH;
  const forestH = forestData.length * rowH;
  const table = opts.table;
  const tableRowH = 17;
  const tableH = table ? (table.rows.length + 1) * tableRowH + 26 : 0;
  const height = plotTop + forestH + tableH + margin.bottom;

  let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="100%" height="100%" fill="${bg}"/>`;
  if (title) svg += `<text x="${width / 2}" y="16" text-anchor="middle" font-size="13" font-weight="bold" fill="${titleFill}">${escape(title)}</text>`;

  // raw model statistics
  stats.forEach((s, i) => {
    const sy = margin.top + 4 + i * 15;
    svg += `<text x="40" y="${sy}" font-size="11" fill="${muted}">${escape(s.label)}: <tspan fill="${fg}" font-weight="bold">${escape(s.value)}</tspan></text>`;
  });

  // forest plot
  svg += `<line x1="${center}" y1="${plotTop}" x2="${center}" y2="${plotTop + forestH}" stroke="#d1d5db" stroke-width="1"/>`;
  for (const t of axisTicks) {
    const x = center + xScale(t);
    svg += `<line x1="${x}" y1="${plotTop - 8}" x2="${x}" y2="${plotTop}" stroke="#9ca3af" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${plotTop - 12}" text-anchor="middle" font-size="10" fill="${muted}">${t}</text>`;
  }
  const notEstimableLabel = opts.notEstimableLabel ?? "not estimable";
  const notEstimableShort = opts.notEstimableShort ?? "n/a";
  forestData.forEach((row, i) => {
    const y = plotTop + i * rowH + rowH / 2;
    const baseBlue = BLUE_SCALE[i % BLUE_SCALE.length];
    const name = groups.find(g => g.id === row.group)?.name || row.group;

    // Zero-event group: the HR is not estimable (complete separation). Its
    // position would be a meaningless artefact of where the optimiser
    // stopped, so no marker/CI is drawn - only the row label and a text note.
    // The plot area is wide enough for the long phrase (unlike the narrow
    // right-hand value column, which gets the short placeholder instead).
    if (row.notEstimable) {
      svg += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="${baseBlue}">${escape(name)}</text>`;
      svg += `<text x="${center}" y="${y + 4}" text-anchor="middle" font-size="11" fill="${muted}">${escape(notEstimableLabel)}</text>`;
      svg += `<text x="${width - margin.right + 10}" y="${y + 4}" font-size="11" fill="${fg}">${escape(notEstimableShort)}</text>`;
      return;
    }

    const x = center + xScale(row.hazardRatio);
    const xL = center + xScale(Math.max(row.ciLower, 1e-12));
    const xU = center + xScale(Math.max(row.ciUpper, 1e-12));
    const significant = (row.ciLower > 1 || row.ciUpper < 1) && row.pValue < 0.05;
    const color = significant ? PINK : baseBlue;
    const ciColor = significant ? PINK : "#4292C6";
    svg += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="${color}">${escape(name)}</text>`;
    svg += `<line x1="${xL}" y1="${y}" x2="${xU}" y2="${y}" stroke="${ciColor}" stroke-width="2"/>`;
    svg += `<line x1="${xL}" y1="${y - 5}" x2="${xL}" y2="${y + 5}" stroke="${ciColor}" stroke-width="2"/>`;
    svg += `<line x1="${xU}" y1="${y - 5}" x2="${xU}" y2="${y + 5}" stroke="${ciColor}" stroke-width="2"/>`;
    svg += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${color}"/>`;
    svg += `<text x="${width - margin.right + 10}" y="${y + 4}" font-size="11" fill="${fg}">${kompakteZahl(row.hazardRatio)} (${kompakteZahl(row.ciLower)}-${kompakteZahl(row.ciUpper)})</text>`;
  });

  // results table below the forest
  if (table) {
    const tLeft = 40;
    const tWidth = width - 80;
    const colW = tWidth / table.headers.length;
    const tTop = plotTop + forestH + 24;
    table.headers.forEach((h, c) => {
      const right = c > 0;
      const tx = tLeft + c * colW + (right ? colW - 6 : 4);
      svg += `<text x="${tx}" y="${tTop}" text-anchor="${right ? 'end' : 'start'}" font-size="11" font-weight="bold" fill="${fg}">${escape(String(h))}</text>`;
    });
    svg += `<line x1="${tLeft}" y1="${tTop + 6}" x2="${tLeft + tWidth}" y2="${tTop + 6}" stroke="#d1d5db" stroke-width="1"/>`;
    table.rows.forEach((rrow, r) => {
      const ry = tTop + 22 + r * tableRowH;
      rrow.forEach((cell, c) => {
        const right = c > 0;
        const tx = tLeft + c * colW + (right ? colW - 6 : 4);
        svg += `<text x="${tx}" y="${ry}" text-anchor="${right ? 'end' : 'start'}" font-size="10" fill="${fg}">${escape(String(cell))}</text>`;
      });
    });
  }

  svg += `</svg>`;
  return { svg, width, height };
}

// Render an SVG string to a PNG data URL via an offscreen canvas.
export async function svgToPngDataUrl(svg: string, width: number, height: number, scale = 2): Promise<string> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
