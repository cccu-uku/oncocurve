import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { get, getAll, parseXml, readRootName } from "../oncobox/read-xml";

function sampleUrl(name: string): URL {
  return new URL(`../../../public/oncobox-samples/${name}`, import.meta.url);
}

describe("read-xml", () => {
  it("liest Elementnamen mit Umlauten", () => {
    const doc = parseXml("<Fallinfos><Primärtumor>P</Primärtumor></Fallinfos>");

    expect(get(doc, "Fallinfos/Primärtumor")).toBe("P");
  });

  it("liefert null für leere Elemente", () => {
    const doc = parseXml("<Stammdaten><Sterbedatum/></Stammdaten>");

    expect(get(doc, "Stammdaten/Sterbedatum")).toBeNull();
  });

  it("liefert null für fehlende Pfade statt zu werfen", () => {
    const doc = parseXml("<Stammdaten><Alter>70</Alter></Stammdaten>");

    expect(get(doc, "Stammdaten/Gibt/Es/Nicht")).toBeNull();
  });

  it("liefert wiederholbare Elemente auch bei einem Vorkommen als Liste", () => {
    const doc = parseXml("<Fall><Follow_Up><Vitalstatus>L</Vitalstatus></Follow_Up></Fall>");

    expect(getAll(doc, "Fall/Follow_Up")).toHaveLength(1);
  });

  it("löst Entities auf", () => {
    const doc = parseXml("<Studie><Name>A &amp; B</Name></Studie>");

    expect(get(doc, "Studie/Name")).toBe("A & B");
  });

  it("verkraftet ein BOM am Dateianfang", () => {
    const xml = readFileSync(sampleUrl("brust-2.xml"), "utf8");

    expect(xml.charCodeAt(0)).toBe(0xfeff);
    expect(readRootName(parseXml(xml))).toBe("OncoBoxBrust");
  });

  it("liest die Wurzel der Familie 1.0", () => {
    const doc = parseXml(readFileSync(sampleUrl("brust-1.xml"), "utf8"));

    expect(readRootName(doc)).toBe("Patienten");
  });
});
