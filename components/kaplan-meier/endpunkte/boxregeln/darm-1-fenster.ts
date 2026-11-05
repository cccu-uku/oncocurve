/**
 * Beobachtungszeitraum der Darm-Spezifikation: höchstens 5 Jahre. Gilt für
 * DFS und OAS ebenso wie für die fünf übrigen Endpunkte, eine Eigenschaft
 * der Box, nicht eines einzelnen Endpunkts. In einer eigenen Datei, damit
 * weder darm-1.ts noch darm-1-endpunkte.ts die Konstante besitzt und beide
 * sie ohne Ringimport teilen können.
 */
export const FUENF_JAHRE_TAGE = 1826;
