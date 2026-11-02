// Spaltenbreiten der Patiententabelle im PDF-Bericht.
//
// Die Breiten standen fest im Code, und was nicht hineinpasste, wurde
// abgeschnitten: aus der Patienten-ID "TCGA-3C-AAAU" wurde "TCGA-3C-AAA", aus
// der Gruppe "Breast Invasive Mixed Mucinous Carcinoma" nur "Breast Invasive".
// Eine gekürzte ID ist schlimmer als ein gekürzter Name, weil sich die Zeile
// danach keinem Patienten mehr sicher zuordnen lässt.
//
// Jetzt richtet sich jede Spalte nach ihrem Inhalt. Die ID-Spalten behalten
// ihre volle Breite. Muss die Tabelle schmaler werden, gibt zuerst die Spalte
// mit dem meisten Spielraum ab, meist die Gruppenspalte, deren lange Namen
// ohnehin umbrechen. Verteilt auf alle Spalten rutschte jede ein wenig unter
// ihren Inhalt, und "Nicht verfügbar" brach in jeder Zeile um. Keine Spalte
// wird schmaler als das längste Wort, das in ihr vorkommt: sonst bräche eine
// Überschrift mitten im Wort oder eine Zahl wie "133.0506" nach der fünften
// Ziffer.

/**
 * Luft zwischen Text und Spaltenrand, links und rechts zusammen. Mit 4 stand
 * die breiteste Zelle zwei Punkte vor der nächsten Spalte; 6 lässt die volle
 * TCGA-Tabelle noch auf A4 passen, nur die Gruppenspalte bricht dann um.
 */
const INNENABSTAND = 6;
/** Eine längere ID bricht um, statt die Tabelle zu sprengen. Passt eine UUID. */
const MAX_ID = 150;
/** Längerer Text bricht um, statt die übrigen Spalten zu verdrängen. */
const MAX_TEXT = 130;
/** Schmaler wird keine Spalte. */
const MIN_BREITE = 24;

export const ID_SPALTEN = ["patientId", "caseId"];

export interface SpaltenBedarf {
  /** Breite der längsten Zelle. */
  inhalt: number;
  /** Breite des längsten Worts in Überschrift oder Zellen; darunter bräche es. */
  wort: number;
}

export function spaltenbreiten(
  spalten: string[],
  bedarf: Record<string, SpaltenBedarf>,
  verfuegbar: number,
): Record<string, number> {
  const natuerlich: Record<string, number> = {};
  const untergrenze: Record<string, number> = {};
  for (const spalte of spalten) {
    const b = bedarf[spalte] ?? { inhalt: 0, wort: 0 };
    const id = ID_SPALTEN.includes(spalte);
    const obergrenze = id ? MAX_ID : MAX_TEXT;
    // Auch das längste Wort nur bis zur Obergrenze: eine ID ohne Leerzeichen
    // ist ein einziges Wort und bräche sonst die Begrenzung auf.
    const wort = Math.min(b.wort + INNENABSTAND, obergrenze);
    natuerlich[spalte] = Math.max(MIN_BREITE, wort, Math.min(b.inhalt + INNENABSTAND, obergrenze));
    untergrenze[spalte] = id ? natuerlich[spalte] : Math.min(natuerlich[spalte], Math.max(MIN_BREITE, wort));
  }

  const breiten = { ...natuerlich };
  let zuViel = spalten.reduce((s, spalte) => s + natuerlich[spalte], 0) - verfuegbar;
  // Zuerst die Spalte mit dem meisten Spielraum. Reicht der Spielraum aller
  // Spalten nicht, bleibt jede an ihrer Untergrenze: eine Tabelle, die etwas
  // über den Rand ragt, liest sich besser als eine, in der Wörter brechen.
  const nachSpielraum = [...spalten].sort(
    (a, b) => (natuerlich[b] - untergrenze[b]) - (natuerlich[a] - untergrenze[a]),
  );
  for (const spalte of nachSpielraum) {
    if (zuViel <= 0) break;
    const abgabe = Math.min(zuViel, natuerlich[spalte] - untergrenze[spalte]);
    breiten[spalte] -= abgabe;
    zuViel -= abgabe;
  }
  return breiten;
}
