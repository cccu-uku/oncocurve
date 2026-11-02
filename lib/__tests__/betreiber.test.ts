import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pruefeBetreiber, ladeBetreiber } from "../betreiber";

const gueltig = {
  impressum: {
    de: [{ titel: "Anbieter", text: "Musterklinik\n12345 Musterstadt" }],
    en: [{ titel: "Provider", text: "Sample Hospital\n12345 Sample City" }],
  },
};

const alt = { de: "x", en: "x" };
const mitLogo = (logo: unknown) => ({ ...gueltig, logo });

let tmp: string;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "betreiber-"));
});
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("pruefeBetreiber", () => {
  it("akzeptiert gültige Angaben ohne Logo", () => {
    expect(pruefeBetreiber(gueltig).impressum.de[0].titel).toBe("Anbieter");
  });

  it("akzeptiert ein Logo mit lokalem Pfad", () => {
    const b = pruefeBetreiber(mitLogo({ src: "/betreiber/logo.png", alt: { de: "Logo", en: "Logo" }, breite: 152, hoehe: 40 }));
    expect(b.logo?.src).toBe("/betreiber/logo.png");
  });

  it("akzeptiert einen Pfad mit Bindestrich, Unterstrich und Ziffern", () => {
    expect(pruefeBetreiber(mitLogo({ src: "/betreiber/logo-1_v2.png", alt, breite: 1, hoehe: 1 })).logo?.src).toBe("/betreiber/logo-1_v2.png");
  });

  const schlechtePfade: [string, string][] = [
    ["fremder Server", "https://example.org/logo.png"],
    ["protokollrelativ", "//evil.org/x.png"],
    ["Backslash", "/" + String.fromCharCode(92) + "evil.org/x.png"],
    ["Tabulator", "/" + String.fromCharCode(9) + "/evil.org"],
    ["Zeilenumbruch", "/" + String.fromCharCode(10) + "/evil.org"],
    ["javascript-Schema", "javascript:alert(1)"],
    ["data-Schema", "data:image/png;base64,AAAA"],
    ["relativ", "logo.png"],
    ["leer", ""],
    ["Elternverzeichnis", "/a/../b.png"],
  ];
  it.each(schlechtePfade)("lehnt logo.src ab: %s", (_name, src) => {
    expect(() => pruefeBetreiber(mitLogo({ src, alt, breite: 1, hoehe: 1 }))).toThrow(/logo.src/);
  });

  it.each([
    ["Zeichenkette", { breite: "152", hoehe: 40 }],
    ["NaN", { breite: NaN, hoehe: 40 }],
    ["negativ", { breite: -1, hoehe: 40 }],
    ["Null", { breite: 0, hoehe: 1 }],
    ["fehlende Höhe", { breite: 10 }],
  ])("lehnt ungültige Maße ab: %s", (_name, masse) => {
    expect(() => pruefeBetreiber(mitLogo({ src: "/l.png", alt, ...masse }))).toThrow(/logo.breite/);
  });

  it("behandelt logo: null wie ein fehlendes Logo", () => {
    expect(pruefeBetreiber(mitLogo(null)).logo).toBeUndefined();
  });

  it("verlangt Impressum in beiden Sprachen", () => {
    expect(() => pruefeBetreiber({ impressum: { de: gueltig.impressum.de } })).toThrow(/impressum.en/);
  });

  it("lehnt ein leeres Impressum-Array ab", () => {
    expect(() => pruefeBetreiber({ impressum: { de: [], en: gueltig.impressum.en } })).toThrow(/impressum.de/);
  });

  it("verlangt Titel und Text je Abschnitt", () => {
    expect(() => pruefeBetreiber({ impressum: { de: [{ titel: "A" }], en: gueltig.impressum.en } })).toThrow(/impressum.de\[0\].text/);
  });

  it("lehnt einen Titel aus Leerzeichen ab", () => {
    expect(() => pruefeBetreiber({ impressum: { de: [{ titel: "   ", text: "x" }], en: gueltig.impressum.en } })).toThrow(/impressum.de\[0\].titel/);
  });
});

describe("ladeBetreiber", () => {
  const umgebung = process.env.ONCOCURVE_BETREIBER;
  afterEach(() => {
    vi.restoreAllMocks();
    if (umgebung === undefined) delete process.env.ONCOCURVE_BETREIBER;
    else process.env.ONCOCURVE_BETREIBER = umgebung;
  });

  const schreibe = (name: string, inhalt: string) => {
    const datei = path.join(tmp, name);
    fs.writeFileSync(datei, inhalt);
    return datei;
  };

  it("liefert null, wenn am Standardpfad keine Datei vorhanden ist", async () => {
    delete process.env.ONCOCURVE_BETREIBER;
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    expect(await ladeBetreiber()).toBeNull();
  });

  it("behandelt eine leere Umgebungsvariable wie nicht gesetzt", async () => {
    process.env.ONCOCURVE_BETREIBER = "";
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    expect(await ladeBetreiber()).toBeNull();
  });

  it("liest den Standardpfad relativ zum Arbeitsverzeichnis", async () => {
    delete process.env.ONCOCURVE_BETREIBER;
    fs.mkdirSync(path.join(tmp, "config"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "config", "betreiber.json"), JSON.stringify(gueltig));
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    expect((await ladeBetreiber())?.impressum.de[0].titel).toBe("Anbieter");
  });

  it("verwendet die Umgebungsvariable und meldet eine fehlende Datei als Fehler", async () => {
    process.env.ONCOCURVE_BETREIBER = path.join(tmp, "gibt-es-nicht.json");
    await expect(ladeBetreiber()).rejects.toThrow(/nicht gefunden, obwohl ONCOCURVE_BETREIBER gesetzt ist/);
  });

  it("meldet einen fehlenden, ausdrücklich angegebenen Pfad als Fehler ohne Hinweis auf die Umgebungsvariable", async () => {
    const fehler = await ladeBetreiber(path.join(tmp, "gibt-es-nicht.json")).catch((e: Error) => e);
    expect(fehler).toBeInstanceOf(Error);
    expect((fehler as Error).message).toMatch(/nicht gefunden/);
    expect((fehler as Error).message).not.toMatch(/ONCOCURVE_BETREIBER/);
  });

  it("meldet Lesefehler außer fehlender Datei", async () => {
    await expect(ladeBetreiber(tmp)).rejects.toThrow();
  });

  it("liest und prüft eine vorhandene Datei", async () => {
    const datei = schreibe("gueltig.json", JSON.stringify(gueltig));
    expect((await ladeBetreiber(datei))?.impressum.en[0].titel).toBe("Provider");
  });

  it("liest eine Datei mit UTF-8-BOM", async () => {
    const datei = schreibe("bom.json", String.fromCharCode(0xfeff) + JSON.stringify(gueltig));
    expect((await ladeBetreiber(datei))?.impressum.de[0].titel).toBe("Anbieter");
  });

  it("meldet ungültige Dateien als Fehler statt sie zu ignorieren", async () => {
    const datei = schreibe("kaputt.json", "{ kein json");
    await expect(ladeBetreiber(datei)).rejects.toThrow(/betreiber.json/);
  });
});
