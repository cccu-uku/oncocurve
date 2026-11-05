import fs from "node:fs/promises";
import path from "node:path";

// Angaben des Betreibers einer ONCOcurve-Instanz (Impressum, Logo). Werden zur
// Laufzeit aus config/betreiber.json gelesen, damit ein fertiges Image ohne
// Neubau für jede Einrichtung passt. Pfad überschreibbar mit ONCOCURVE_BETREIBER.

export interface Abschnitt {
  titel: string;
  text: string;
}

export interface Betreiber {
  logo?: { datei: string; alt: { de: string; en: string }; breite: number; hoehe: number };
  impressum: { de: Abschnitt[]; en: Abschnitt[] };
}

export function standardPfad(): string {
  return path.join(process.cwd(), "config", "betreiber.json");
}

function fehler(feld: string): never {
  throw new Error(`betreiber.json: Feld ${feld} fehlt oder ist ungültig`);
}

// Logo: reiner Dateiname im Ordner der Betreiberdatei, nur Bildformate.
const LOGO_TYPEN = {
  png: "image/png",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
} as const;
const LOGO_DATEI = new RegExp(`^[A-Za-z0-9_.-]+\\.(${Object.keys(LOGO_TYPEN).join("|")})$`, "i");
const istLogoDatei = (v: unknown): v is string => typeof v === "string" && LOGO_DATEI.test(v) && !v.includes("..");

const istObjekt = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const istText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const istMass = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

function pruefeAbschnitte(wert: unknown, feld: string): Abschnitt[] {
  if (!Array.isArray(wert) || wert.length === 0) fehler(feld);
  return wert.map((a: unknown, i) => {
    const abschnitt = istObjekt(a) ? a : {};
    const { titel, text } = abschnitt;
    if (!istText(titel)) fehler(`${feld}[${i}].titel`);
    if (!istText(text)) fehler(`${feld}[${i}].text`);
    return { titel, text };
  });
}

export function pruefeBetreiber(roh: unknown): Betreiber {
  const b = istObjekt(roh) ? roh : {};
  const imp = istObjekt(b.impressum) ? b.impressum : {};
  const impressum = {
    de: pruefeAbschnitte(imp.de, "impressum.de"),
    en: pruefeAbschnitte(imp.en, "impressum.en"),
  };
  if (b.logo === undefined || b.logo === null) return { impressum };
  const l = istObjekt(b.logo) ? b.logo : {};
  const { datei, breite, hoehe } = l;
  const logoAlt = istObjekt(l.alt) ? l.alt : {};
  if (!istLogoDatei(datei)) fehler("logo.datei");
  if (!istText(logoAlt.de) || !istText(logoAlt.en)) fehler("logo.alt");
  if (!istMass(breite) || !istMass(hoehe)) fehler("logo.breite/hoehe");
  return {
    impressum,
    logo: { datei, alt: { de: logoAlt.de, en: logoAlt.en }, breite, hoehe },
  };
}

// Ohne Argument: ONCOCURVE_BETREIBER (falls nicht leer), sonst der Standardpfad.
// Nur am Standardpfad bedeutet eine fehlende Datei "keine Angaben" (null); ein
// ausdrücklich angegebener Pfad muss existieren.
export async function ladeBetreiber(pfad?: string): Promise<Betreiber | null> {
  const ausdruecklich = pfad ?? (process.env.ONCOCURVE_BETREIBER || undefined);
  const ziel = ausdruecklich ?? standardPfad();
  let inhalt: string;
  try {
    // Laufzeitdatei der Instanz: nicht in die Build-Ausgabe mitverfolgen (sonst
    // nimmt Turbopack das ganze Projekt in die Standalone-Ausgabe auf).
    inhalt = await fs.readFile(/*turbopackIgnore: true*/ ziel, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      if (ausdruecklich === undefined) return null;
      const hinweis = pfad === undefined ? ", obwohl ONCOCURVE_BETREIBER gesetzt ist" : "";
      throw new Error(`betreiber.json (${ziel}) nicht gefunden${hinweis}`);
    }
    throw e;
  }
  try {
    return pruefeBetreiber(JSON.parse(inhalt.charCodeAt(0) === 0xfeff ? inhalt.slice(1) : inhalt));
  } catch (e) {
    throw new Error(`betreiber.json (${ziel}) ist ungültig: ${(e as Error).message}`);
  }
}

/** Ordner der Betreiberdatei; dort liegt auch das Logo. */
export function betreiberOrdner(): string {
  return path.dirname(process.env.ONCOCURVE_BETREIBER || standardPfad());
}

/** Liest die Logodatei; null, wenn der Name ungültig ist oder die Datei fehlt. */
export async function ladeLogo(datei: string, ordner = betreiberOrdner()): Promise<{ inhalt: Buffer; typ: string } | null> {
  if (!istLogoDatei(datei)) return null;
  const endung = datei.slice(datei.lastIndexOf(".") + 1).toLowerCase() as keyof typeof LOGO_TYPEN;
  const typ = LOGO_TYPEN[endung];
  try {
    // Laufzeitdatei der Instanz, nicht in die Build-Ausgabe mitverfolgen.
    const inhalt = await fs.readFile(/*turbopackIgnore: true*/ path.join(ordner, datei));
    return { inhalt, typ };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Prüft, ob die Logodatei vorhanden und eine Datei ist (ohne sie zu lesen). */
export async function logoVorhanden(datei: string, ordner = betreiberOrdner()): Promise<boolean> {
  if (!istLogoDatei(datei)) return false;
  try {
    return (await fs.stat(/*turbopackIgnore: true*/ path.join(ordner, datei))).isFile();
  } catch {
    return false;
  }
}
