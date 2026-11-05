// Shared colour palette for Kaplan-Meier plots and stratification badges.
//
// Colour-vision-deficiency (CVD) safe AND vibrant: the first six colours are
// Paul Tol's "vibrant" qualitative scheme, which is markedly more saturated than
// Okabe-Ito while staying distinguishable under deuteranopia and protanopia.
// This was checked by simulating both deficiencies (Machado 2009) and measuring
// the smallest pairwise CIELAB distance: min dE ~= 24 (normal), ~20 (protan),
// ~16 (deutan) for the first six. Highly saturated "punchy" palettes were
// rejected because they collapse under deuteranopia (min dE 3-7).
//
// Order: blue + pink come first (the common two-group case); orange, cyan, red
// and teal follow. Beyond six strata we extend with Paul Tol's muted set (also
// CVD-safe).
//
// Note: a genuinely CVD-safe palette cannot be only blue/pink/purple, because
// red-green deficiency relies on the blue<->yellow/orange axis; orange and a
// blue-leaning teal are therefore intentionally included rather than a pure
// red/green pair.

const KAPLAN_MEIER_COLORS = [
  "#0077BB",  // blue            (Tol vibrant)
  "#EE3377",  // magenta / pink  (Tol vibrant)
  "#EE7733",  // orange          (Tol vibrant)
  "#33BBEE",  // cyan            (Tol vibrant)
  "#CC3311",  // red             (Tol vibrant)
  "#009988",  // teal            (Tol vibrant)
  "#AA4499",  // purple          (Tol muted)
  "#332288",  // indigo          (Tol muted)
  "#882255",  // wine            (Tol muted)
  "#999933",  // olive           (Tol muted)
  "#DDCC77",  // sand            (Tol muted)
  "#117733",  // dark green      (Tol muted)
  "#F0E442",  // yellow          (Okabe-Ito; later: low contrast on white)
  "#000000",  // black           (last; for overall/"all patients")
];

export default KAPLAN_MEIER_COLORS;
