import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pruefeBetreiber, ladeBetreiber, ladeLogo, logoVorhanden } from "../betreiber";

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

  it("akzeptiert ein Logo als Dateiname", () => {
    const b = pruefeBetreiber(mitLogo({ datei: "cccu_logo.png", alt: { de: "Logo", en: "Logo" }, breite: 152, hoehe: 40 }));
    expect(b.logo?.datei).toBe("cccu_logo.png");
  });

  it.each(["logo-1_v2.svg", "Logo.PNG", "a.jpeg", "a.jpg", "a.webp"])("akzeptiert den Dateinamen %s", (datei) => {
    expect(pruefeBetreiber(mitLogo({ datei, alt, breite: 1, hoehe: 1 })).logo?.datei).toBe(datei);
  });

  const schlechteDateien: [string, string][] = [
    ["Unterordner", "bilder/logo.png"],
    ["absoluter Pfad", "/logo.png"],
    ["Backslash", "a" + String.fromCharCode(92) + "b.png"],
    ["Elternverzeichnis", "../logo.png"],
    ["fremder Server", "https://example.org/logo.png"],
    ["falsche Endung", "logo.gif"],
    ["Punkt fehlt", "logoXpng"],
    ["keine Endung", "logo"],
    ["Skriptendung", "logo.png.js"],
    ["Leerzeichen", "mein logo.png"],
    ["leer", ""],
  ];
  it.each(schlechteDateien)("lehnt logo.datei ab: %s", (_name, datei) => {
    expect(() => pruefeBetreiber(mitLogo({ datei, alt, breite: 1, hoehe: 1 }))).toThrow(/logo.datei/);
  });

  it("lehnt das frühere Feld src ab", () => {
    expect(() => pruefeBetreiber(mitLogo({ src: "/logo.png", alt, breite: 1, hoehe: 1 }))).toThrow(/logo.datei/);
  });

  it.each([
    ["Zeichenkette", { breite: "152", hoehe: 40 }],
    ["NaN", { breite: NaN, hoehe: 40 }],
    ["negativ", { breite: -1, hoehe: 40 }],
    ["Null", { breite: 0, hoehe: 1 }],
    ["fehlende Höhe", { breite: 10 }],
  ])("lehnt ungültige Maße ab: %s", (_name, masse) => {
    expect(() => pruefeBetreiber(mitLogo({ datei: "l.png", alt, ...masse }))).toThrow(/logo.breite/);
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

describe("ladeLogo", () => {
  const umgebung = process.env.ONCOCURVE_BETREIBER;
  afterEach(() => {
    if (umgebung === undefined) delete process.env.ONCOCURVE_BETREIBER;
    else process.env.ONCOCURVE_BETREIBER = umgebung;
    vi.restoreAllMocks();
  });

  it("liefert Inhalt und Content-Type", async () => {
    fs.writeFileSync(path.join(tmp, "logo.png"), Buffer.from([137, 80, 78, 71]));
    const logo = await ladeLogo("logo.png", tmp);
    expect(logo?.typ).toBe("image/png");
    expect(logo?.inhalt.length).toBe(4);
  });

  it("erkennt die Endung unabhängig von der Schreibweise", async () => {
    fs.writeFileSync(path.join(tmp, "Logo.SVG"), "<svg/>");
    expect((await ladeLogo("Logo.SVG", tmp))?.typ).toBe("image/svg+xml");
  });

  it("liefert null, wenn die Datei fehlt", async () => {
    expect(await ladeLogo("gibt-es-nicht.png", tmp)).toBeNull();
  });

  it("liefert null für ungültige Namen, auch wenn die Datei existiert", async () => {
    fs.writeFileSync(path.join(tmp, "geheim.json"), "{}");
    expect(await ladeLogo("../geheim.json", tmp)).toBeNull();
    expect(await ladeLogo("geheim.json", tmp)).toBeNull();
  });

  it("sucht ohne Ordnerangabe im Ordner von ONCOCURVE_BETREIBER", async () => {
    process.env.ONCOCURVE_BETREIBER = path.join(tmp, "betreiber.json");
    fs.writeFileSync(path.join(tmp, "env-logo.webp"), "x");
    expect((await ladeLogo("env-logo.webp"))?.typ).toBe("image/webp");
  });

  it("meldet Lesefehler außer fehlender Datei", async () => {
    fs.mkdirSync(path.join(tmp, "ordner.png"), { recursive: true });
    await expect(ladeLogo("ordner.png", tmp)).rejects.toThrow();
  });

  it("sucht bei leerer Umgebungsvariable im config-Ordner des Arbeitsverzeichnisses", async () => {
    process.env.ONCOCURVE_BETREIBER = "";
    fs.mkdirSync(path.join(tmp, "config"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "config", "cwd-logo.jpg"), "x");
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    expect((await ladeLogo("cwd-logo.jpg"))?.typ).toBe("image/jpeg");
  });
});

describe("logoVorhanden", () => {
  it("erkennt eine vorhandene Datei", async () => {
    fs.writeFileSync(path.join(tmp, "da.png"), "x");
    expect(await logoVorhanden("da.png", tmp)).toBe(true);
  });

  it("verneint eine fehlende Datei", async () => {
    expect(await logoVorhanden("fehlt.png", tmp)).toBe(false);
  });

  it("verneint ein Verzeichnis", async () => {
    fs.mkdirSync(path.join(tmp, "verzeichnis.png"), { recursive: true });
    expect(await logoVorhanden("verzeichnis.png", tmp)).toBe(false);
  });

  it("verneint einen ungültigen Namen", async () => {
    expect(await logoVorhanden("../x.png", tmp)).toBe(false);
  });
});
