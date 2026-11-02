import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { importOncoBox } from "../oncobox-importer";
import type { Patient } from "../obds-parser-new";
import { zentrumsTypAusKohorte } from "../endpunkte/zentrumstyp";

function kohorte(datei: string): Patient[] {
  const xml = readFileSync(
    new URL(`../../../public/oncobox-samples/${datei}`, import.meta.url),
    "utf8",
  );
  return importOncoBox(xml).patients as Patient[];
}

describe("Zentrumstyp aus der Kohorte", () => {
  it.each([
    ["brust-1.xml", "BZ"],
    ["brust-2.xml", "BZ"],
    ["darm-1.xml", "DZ"],
    ["darm-2.xml", "DZ"],
    ["lunge-2.xml", "LZ"],
  ])("erkennt %s als %s", (datei, erwartet) => {
    expect(zentrumsTypAusKohorte(kohorte(datei))).toBe(erwartet);
  });

  // Die freie Analyse hat keinen Zentrumstyp. Ein geratener Wert wäre dort
  // schlimmer als keiner, weil er eine Pflichtliste vortäuschte.
  it("liefert null für eine Kohorte ohne OncoBox-Herkunft", () => {
    const csvArtig = [{ id: "1", gender: "female" }] as unknown as Patient[];

    expect(zentrumsTypAusKohorte(csvArtig)).toBeNull();
  });

  it("liefert null für eine leere Kohorte", () => {
    expect(zentrumsTypAusKohorte([])).toBeNull();
  });
});
