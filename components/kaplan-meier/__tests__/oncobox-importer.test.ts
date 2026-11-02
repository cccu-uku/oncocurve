import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { detectOncoBoxXml, importOncoBox } from "../oncobox-importer";

function sample(name: string): string {
  return readFileSync(new URL(`../../../public/oncobox-samples/${name}`, import.meta.url), "utf8");
}

// Prostata 1.0 hat jetzt ein Profil (siehe oncobox/profiles/prostata-1.ts) und
// taugt hier nicht mehr als Beispiel für eine erkannte, aber unterstützte
// Box. Eine fremde 2.0-Box vertritt den Fall stattdessen.
const UNTERSTUETZTE_BOX_FEHLT = `<?xml version="1.0" encoding="utf-8"?>
  <OncoBoxPankreas>
    <ImportInfo><DatumXML>2026-01-01</DatumXML></ImportInfo>
    <Patienten>
      <Patient>
        <Stammdaten><OncoBoxID>1</OncoBoxID><Geburtsjahr>1960</Geburtsjahr></Stammdaten>
        <Fall><Diagnose><ICD_10>C25.0</ICD_10></Diagnose></Fall>
      </Patient>
    </Patienten>
  </OncoBoxPankreas>`;

describe("importOncoBox", () => {
  it("liefert Patienten und Kennzahlen für eine unterstützte Datei", () => {
    const result = importOncoBox(sample("brust-2.xml"));

    expect(result.errors).toEqual([]);
    expect(result.meta).toMatchObject({ boxType: "brust", schemaVersion: "2.0", caseCount: 39 });
    expect(result.patients.length).toBeGreaterThan(0);
  });

  it("meldet ein erkanntes, noch nicht unterstütztes Format als Fehler", () => {
    const result = importOncoBox(UNTERSTUETZTE_BOX_FEHLT);

    expect(result.patients).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("pankreas");
  });

  it("meldet unbrauchbares XML als Fehler statt zu werfen", () => {
    const result = importOncoBox("<kaputt");

    expect(result.errors).toHaveLength(1);
    expect(result.meta).toBeNull();
  });

  it("erkennt oBDS nicht als OncoBox", () => {
    expect(detectOncoBoxXml("<oBDS_v3_4_0><Patientendaten/></oBDS_v3_4_0>")).toBe(false);
  });

  it("erkennt eine OncoBox-Datei", () => {
    expect(detectOncoBoxXml(sample("lunge-2.xml"))).toBe(true);
  });
});

describe("importOncoBox: erkannt, aber nicht unterstuetzt", () => {
  // Eine erkannte Box ist kein Lesefehler. Die Oberflaeche unterscheidet das,
  // damit sie nicht auf Dateiformat und Zeichencodierung verweist, wenn beide
  // in Ordnung sind.
  it("kennzeichnet eine erkannte, noch nicht unterstützte Box als erkannt statt als Lesefehler", () => {
    const result = importOncoBox(UNTERSTUETZTE_BOX_FEHLT);

    expect(result.unsupported).toEqual({ boxType: "pankreas", schemaVersion: "2.0" });
    expect(result.errors).toHaveLength(1);
  });

  it("kennzeichnet eine unlesbare Datei nicht als erkannt", () => {
    const result = importOncoBox("<kaputt");

    expect(result.unsupported).toBeUndefined();
    expect(result.errors).toHaveLength(1);
  });

  it("kennzeichnet eine unterstuetzte Box nicht als unsupported", () => {
    const result = importOncoBox(sample("brust-2.xml"));

    expect(result.unsupported).toBeUndefined();
    expect(result.errors).toEqual([]);
  });
});
