// Umbruch langer Gruppennamen für Plotly-Beschriftungen.
//
// Plotly bricht Beschriftungen nicht selbst um. Eine Achsenbeschriftung, die
// breiter ist als der Rand, läuft links aus der Grafik und wird abgeschnitten.
// Diese Funktion verteilt einen Namen auf mehrere Zeilen, die jeweils in die
// vorgegebene Breite passen; Plotly setzt sie danach mit <br> untereinander.
//
// Gemessen wird über die übergebene Funktion. Im Browser ist das ein Canvas
// mit derselben Schrift, die Plotly verwendet, in den Tests eine feste Breite
// je Zeichen.

const AUSLASSUNG = "…";

/** Schriftfamilie, mit der Plotly ohne eigene Angabe zeichnet. */
export const PLOTLY_SCHRIFT = '"Open Sans", verdana, arial, sans-serif';

/**
 * Misst Text im Browser über ein Canvas mit der angegebenen Schrift. Die
 * gemessene Breite stimmt mit der von Plotly gezeichneten auf den Pixel
 * überein, weil beide dieselbe Ersatzschrift auflösen. Ohne DOM, etwa beim
 * Vorrendern, bleibt eine grobe Schätzung je Zeichen.
 */
export function canvasMesser(schrift: string): (s: string) => number {
  const kontext = typeof document !== "undefined"
    ? document.createElement("canvas").getContext("2d")
    : null;
  if (!kontext) return (s: string) => s.length * 6;
  kontext.font = schrift;
  return (s: string) => kontext.measureText(s).width;
}

/** Ein Wort, das allein zu breit ist, zeichenweise auf Zeilen verteilen. */
function wortTeilen(wort: string, maxBreite: number, messe: (s: string) => number): string[] {
  const teile: string[] = [];
  let aktuell = "";
  for (const zeichen of wort) {
    if (aktuell && messe(aktuell + zeichen) > maxBreite) {
      teile.push(aktuell);
      aktuell = zeichen;
    } else {
      aktuell += zeichen;
    }
  }
  if (aktuell) teile.push(aktuell);
  return teile;
}

/** Die letzte Zeile so kürzen, dass sie mit Auslassungszeichen noch passt. */
function mitAuslassung(zeile: string, maxBreite: number, messe: (s: string) => number): string {
  let gekuerzt = zeile.trimEnd();
  while (gekuerzt && messe(gekuerzt + AUSLASSUNG) > maxBreite) {
    gekuerzt = gekuerzt.slice(0, -1).trimEnd();
  }
  return gekuerzt + AUSLASSUNG;
}

export function umbrechen(
  text: string,
  maxBreite: number,
  messe: (s: string) => number,
  maxZeilen = 3,
): string[] {
  const woerter = text.split(/\s+/).filter(Boolean);
  if (woerter.length === 0) return [""];

  const zeilen: string[] = [];
  let aktuell = "";
  for (const wort of woerter) {
    const kandidat = aktuell ? `${aktuell} ${wort}` : wort;
    if (messe(kandidat) <= maxBreite) {
      aktuell = kandidat;
      continue;
    }
    if (aktuell) zeilen.push(aktuell);
    if (messe(wort) <= maxBreite) {
      aktuell = wort;
      continue;
    }
    const teile = wortTeilen(wort, maxBreite, messe);
    zeilen.push(...teile.slice(0, -1));
    aktuell = teile[teile.length - 1] ?? "";
  }
  if (aktuell) zeilen.push(aktuell);

  if (zeilen.length <= maxZeilen) return zeilen;
  const behalten = zeilen.slice(0, maxZeilen);
  behalten[maxZeilen - 1] = mitAuslassung(behalten[maxZeilen - 1], maxBreite, messe);
  return behalten;
}
