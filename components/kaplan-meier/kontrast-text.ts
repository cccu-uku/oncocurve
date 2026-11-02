/**
 * Wählt die Schriftfarbe für Text, der auf einer farbigen Fläche steht.
 *
 * Nötig, seit die Beschriftung des Anteilsbalkens in den Segmenten selbst
 * sitzt: deren Farben stammen aus den Kurvenpaletten und reichen von hellem
 * Sand bis zu dunklem Indigo. Eine feste Schriftfarbe wäre auf der Hälfte
 * davon unlesbar, und gerade der Anteilsbalken landet als Ausschnitt in
 * Zertifizierungsscreenshots.
 *
 * Die Schwelle 0.179 statt der naheliegenden 0.5 folgt aus der WCAG-Formel:
 * bei dieser Leuchtdichte ist das Kontrastverhältnis gegen Schwarz und gegen
 * Weiss gleich gross, darüber gewinnt die dunkle Tinte.
 */

const TINTE_DUNKEL = "#111827";
const TINTE_HELL = "#ffffff";
const SCHWELLE = 0.179;

/** Ein Farbkanal von 0..255 auf den linearen Anteil nach WCAG. */
function linearerKanal(wert: number): number {
  const v = wert / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Erwartet #rrggbb. Bei allem anderen die dunkle Tinte, die auf den hellen
 *  Kartenflächen der Anwendung nie schlechter ist als gar keine Entscheidung. */
export function textfarbeAuf(hintergrund: string): string {
  const treffer = /^#?([0-9a-f]{6})$/i.exec(hintergrund.trim());
  if (!treffer) return TINTE_DUNKEL;
  const zahl = parseInt(treffer[1], 16);
  const leuchtdichte =
    0.2126 * linearerKanal((zahl >> 16) & 255) +
    0.7152 * linearerKanal((zahl >> 8) & 255) +
    0.0722 * linearerKanal(zahl & 255);
  return leuchtdichte > SCHWELLE ? TINTE_DUNKEL : TINTE_HELL;
}
