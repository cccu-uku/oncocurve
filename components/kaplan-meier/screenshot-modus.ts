// Screenshot-Modus: größere, kräftigere und dunklere Schrift für Abbildungen,
// die im Manuskript stark verkleinert werden. Der Seiteninhalt stellt sich
// über CSS um (siehe styles/globals.css, [data-screenshot]). Plotly zeichnet
// seine Beschriftungen aber mit festen Pixelgrößen aus JavaScript, die CSS
// nicht erreicht, deshalb rechnen die Diagramme ihre Schrift hier um.

const SCHRIFTFAKTOR = 1.4;
const GEWICHT_NORMAL = 400;
const GEWICHT_SCREENSHOT = 600;

export interface PlotSchrift {
  size: number;
  weight: number;
}

export function plotSchrift(groesse: number, screenshot: boolean): PlotSchrift {
  return screenshot
    ? { size: Math.round(groesse * SCHRIFTFAKTOR), weight: GEWICHT_SCREENSHOT }
    : { size: groesse, weight: GEWICHT_NORMAL };
}

// Die Markierung sitzt am <html>-Element und überdauert damit den Wechsel
// zwischen Upload- und Ergebnisseite.
export function wendeScreenshotModusAn(aktiv: boolean): void {
  document.documentElement.toggleAttribute("data-screenshot", aktiv);
}
