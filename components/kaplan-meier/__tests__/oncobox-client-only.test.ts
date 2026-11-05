import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "app");
// Erfasst statische Importe ("from ..."), dynamische Importe (import("..."),
// auch als dynamic(() => import("...")) verpackt) und require(...). In dieser
// Codebasis sind dynamische Importe ueblich (z. B. app/[locale]/(app)/page.tsx),
// eine reine "from"-Pruefung wuerde daran vorbeilaufen.
const ONCOBOX_IMPORT = /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)["'][^"']*oncobox[^"']*["']/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/**
 * "use client" wirkt nur als Direktive, wenn es die allererste Anweisung der
 * Datei ist, vor jedem Import. Ein Treffer weiter unten (etwa in einem
 * Kommentar) zaehlt nicht: darum wird ausschließlich die erste Zeile geprueft.
 */
function hasLeadingUseClientDirective(source: string): boolean {
  const firstLine = source.split(/\r?\n/, 1)[0]?.trim() ?? "";
  return /^["']use client["'];?$/.test(firstLine);
}

/**
 * Patientendaten duerfen die Serverseite nicht erreichen. Ein Import in eine
 * Server Component wuerde genau das bewirken, ohne dass es beim Testen im
 * Browser auffaellt.
 */
describe("OncoBox-Module bleiben clientseitig", () => {
  it("wird nur aus Dateien mit use client importiert", () => {
    const files = sourceFiles(APP_DIR);
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return ONCOBOX_IMPORT.test(source) && !hasLeadingUseClientDirective(source);
    });

    expect(offenders).toEqual([]);
  });
});
