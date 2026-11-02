"use client";

// Plotly nur mit den kartesischen Diagrammtypen (scatter): kleiner und ohne die
// Kartenbibliothek des Vollpakets. PDF- und SVG-Export auf der Ergebnisseite
// greifen über window.Plotly auf toImage zu.
import Plotly from "plotly.js-cartesian-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";

if (typeof window !== "undefined") {
  (window as unknown as { Plotly?: unknown }).Plotly ??= Plotly;
}

const Plot = createPlotlyComponent(Plotly);

export default Plot;
