/**
 * Zahl für eine schmale, feste Spalte.
 *
 * Die Wertespalte des Forest-Plots ist auf Werte wie "1.00" ausgelegt. Eine
 * Zahl mit dreizehn Stellen sprengt sie und läuft über den Kartenrand hinaus.
 * Sehr grosse und sehr kleine Werte bekommen deshalb die Exponentialform:
 * "4.6e+9" statt "4554813973.59". Die Grenzen sind so gewählt, dass jeder
 * Wert, den man in einem Hazard Ratio wirklich abliest, ausgeschrieben
 * bleibt.
 */
export function kompakteZahl(wert: number): string {
  if (Number.isNaN(wert)) return "n/a";
  if (!isFinite(wert)) return wert > 0 ? "\u221e" : "-\u221e";
  const betrag = Math.abs(wert);
  if (betrag !== 0 && (betrag >= 1000 || betrag < 0.01)) return wert.toExponential(1);
  return wert.toFixed(2);
}
