// Colour scales for the Kaplan-Meier curves. A palette maps a group index to a
// { colour, dash } pair, so the plot line, its markers and the (native Plotly)
// legend entry all share one visual identity per group.
//
// - "standard"  : the vibrant default the app has always shown.
// - "monoPurple": Lila- und Blautöne einer Familie, ohne Pink.
// - "cvdSafe"   : Okabe-Ito — safe for protan-, deutan- and tritanopia at once.
// - "grayscale" : greyscale shades combined with distinct dash patterns so every
//                 group stays distinguishable in black-and-white print.

export type PaletteId = "standard" | "vibrant" | "monoPurple" | "cvdSafe" | "grayscale";

// Plotly line.dash values we use.
export type DashPattern =
  | "solid"
  | "dot"
  | "dash"
  | "dashdot"
  | "longdash"
  | "longdashdot";

export interface PaletteEntry {
  color: string;
  dash: DashPattern;
}

export const PALETTE_IDS: PaletteId[] = ["standard", "vibrant", "monoPurple", "cvdSafe", "grayscale"];

// The default palette: soft, muted "pastel" tones that still read as distinct.
// Based on ColorBrewer "Set2" (a qualitative, colour-blind-aware scheme),
// extended with a few more muted hues. Ordered so consecutive indices stay well
// separated, so the common 2- and 3-group cases never land on similar colours.
// The lighter tones (yellow/tan/grey) sit at the back where they are reached
// less often.
const PASTEL_COLORS = [
  "#66C2A5", // Petrolgrün
  "#FC8D62", // Koralle
  "#8DA0CB", // Blauviolett
  "#E78AC3", // Rosé
  "#A6D854", // Limettgrün
  "#BC80BD", // Malve
  "#80B1D3", // Taubenblau
  "#FDB462", // Ocker
  "#B3B3B3", // Grau
  "#E5C494", // Sand
  "#FFD92F", // Gelb
];

// Die kräftige Palette, wählbar als "Bunt". Blau, Violett und Pink, kein Rot
// und kein Orange: dieselbe Familie, in der die Anwendung sonst auch bleibt.
// Aufeinanderfolgende Indizes wechseln bewusst Farbton und Helligkeit, damit
// zwei benachbarte Kurven nie ähnlich aussehen. Die blassen Töne stehen hinten,
// sie werden seltener erreicht und tragen auf Weiß weniger.
const VIBRANT_COLORS = [
  "#0094FB", // Azur
  "#DB2777", // Magenta
  "#7C3AED", // Violett
  "#1E40AF", // Indigoblau
  "#EC4899", // Pink
  "#6D28D9", // Dunkelviolett
  "#3B82F6", // Blau
  "#A855F7", // Purpur
  "#E26BAA", // Rosé
  "#4F46E5", // Indigo
  "#60A5FA", // Helles Blau
  "#C084FC", // Helles Purpur
  "#F472B6", // Helles Pink
  "#818CF8", // Helles Indigo
  "#F9A8D4", // Blasses Pink
  "#93C5FD", // Blasses Blau
];

// Monochrom Lila: nur Lila, Violett und Blau. Die ersten vier Töne wechseln
// zwischen Lila und Blau und zwischen kräftig und hell, damit die häufigen
// Fälle mit zwei bis vier Gruppen gut auseinanderzuhalten sind.
const MONO_PURPLE_COLORS = [
  "#A855F7", // Lila
  "#4F86C6", // Stahlblau
  "#8DB7E2", // Hellblau
  "#B9A7E8", // Lavendel
  "#6D28D9", // Dunkelviolett
  "#2B5797", // Dunkelblau
  "#C084FC", // Helles Lila
  "#818CF8", // Helles Indigo
];

// Okabe-Ito, ordered for maximum contrast between the first few strata.
const CVD_SAFE_COLORS = [
  "#0072B2", // blue
  "#D55E00", // vermillion
  "#009E73", // green
  "#CC79A7", // reddish purple
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#F0E442", // yellow
  "#000000", // black
];

// Greyscale shades cycled slower than the dash patterns, so the first six groups
// are pure black with six different line styles, then mid-grey, then light grey.
const GRAY_SHADES = ["#000000", "#555555", "#999999"];
const GRAY_DASHES: DashPattern[] = [
  "solid",
  "dash",
  "dot",
  "dashdot",
  "longdash",
  "longdashdot",
];

export function paletteEntry(id: PaletteId, index: number): PaletteEntry {
  const i = index < 0 ? 0 : index;
  if (id === "grayscale") {
    const dash = GRAY_DASHES[i % GRAY_DASHES.length];
    const color =
      GRAY_SHADES[Math.floor(i / GRAY_DASHES.length) % GRAY_SHADES.length];
    return { color, dash };
  }
  const colors =
    id === "cvdSafe" ? CVD_SAFE_COLORS
      : id === "vibrant" ? VIBRANT_COLORS
      : id === "monoPurple" ? MONO_PURPLE_COLORS
      : PASTEL_COLORS;
  return { color: colors[i % colors.length], dash: "solid" };
}
