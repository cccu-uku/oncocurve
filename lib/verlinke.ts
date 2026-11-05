// Zerlegt eine Textzeile aus den Betreiberangaben in Text- und Linkteile.
// Verlinkt werden nur http(s)-Adressen, Adressen mit "www." und E-Mail-Adressen;
// alles andere (z. B. "javascript:") bleibt Text.

export interface Teil {
  text: string;
  href?: string;
}

const VORNE = `(<["'`;
const HINTEN = `).,;:!?>]"'`;

const EMAIL_ZEICHEN = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._%+-";

function nurZeichen(wert: string, erlaubt: string): boolean {
  return wert.length > 0 && [...wert].every((z) => erlaubt.includes(z));
}

function istDomain(wert: string): boolean {
  const teile = wert.split(".");
  return teile.length >= 2 && teile.every((t) => nurZeichen(t, EMAIL_ZEICHEN) && !t.includes("%"));
}

function istWebadresse(wert: string): boolean {
  try {
    const url = new URL(wert);
    return (url.protocol === "https:" || url.protocol === "http:") && istDomain(url.hostname);
  } catch {
    return false;
  }
}

function zielVon(kern: string): string | undefined {
  if (kern.startsWith("https://") || kern.startsWith("http://")) {
    return istWebadresse(kern) ? kern : undefined;
  }
  if (kern.startsWith("www.")) {
    const ziel = "https://" + kern;
    return istWebadresse(ziel) ? ziel : undefined;
  }
  const teile = kern.split("@");
  if (teile.length === 2 && nurZeichen(teile[0], EMAIL_ZEICHEN) && istDomain(teile[1])) {
    return "mailto:" + kern;
  }
  return undefined;
}

export function verlinke(zeile: string): Teil[] {
  const teile: Teil[] = [];
  const text = (t: string) => {
    if (t.length === 0) return;
    const letzter = teile[teile.length - 1];
    if (letzter && letzter.href === undefined) letzter.text += t;
    else teile.push({ text: t });
  };

  zeile.split(" ").forEach((wort, i) => {
    if (i > 0) text(" ");
    let anfang = 0;
    let ende = wort.length;
    while (anfang < ende && VORNE.includes(wort[anfang])) anfang++;
    while (ende > anfang && HINTEN.includes(wort[ende - 1])) ende--;
    const kern = wort.slice(anfang, ende);
    const href = kern.length > 0 ? zielVon(kern) : undefined;
    if (href === undefined) {
      text(wort);
      return;
    }
    text(wort.slice(0, anfang));
    teile.push({ text: kern, href });
    text(wort.slice(ende));
  });

  if (teile.length === 0) teile.push({ text: "" });
  return teile;
}
