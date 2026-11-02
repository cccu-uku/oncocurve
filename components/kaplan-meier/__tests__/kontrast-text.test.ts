import { describe, it, expect } from "vitest";
import { textfarbeAuf } from "../kontrast-text";
import KAPLAN_MEIER_COLORS from "../kaplan-meier-colors";

const DUNKEL = "#111827";
const HELL = "#ffffff";

describe("textfarbeAuf", () => {
  it("setzt helle Schrift auf das kräftige Blau der gefilterten Kohorte", () => {
    expect(textfarbeAuf("#2563eb")).toBe(HELL);
  });

  it("setzt dunkle Schrift auf das helle Grau der ausgeschlossenen Kohorte", () => {
    expect(textfarbeAuf("#e5e7eb")).toBe(DUNKEL);
  });

  it("entscheidet für jede Farbe der Kurvenpalette", () => {
    for (const farbe of KAPLAN_MEIER_COLORS) {
      expect([DUNKEL, HELL]).toContain(textfarbeAuf(farbe));
    }
  });

  it("hält das Kontrastverhältnis der gewählten Tinte über 4.5:1", () => {
    // Gegenprobe zur Schwelle: die gewählte Tinte muss auf jeder
    // Palettenfarbe die Textstufe AA erreichen, sonst ist der Balken in
    // einem Screenshot nicht mehr lesbar.
    const kanal = (w: number) => {
      const v = w / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const leuchtdichte = (hex: string) => {
      const z = parseInt(hex.slice(1), 16);
      return 0.2126 * kanal((z >> 16) & 255) + 0.7152 * kanal((z >> 8) & 255) + 0.0722 * kanal(z & 255);
    };
    for (const farbe of [...KAPLAN_MEIER_COLORS, "#2563eb", "#e5e7eb"]) {
      const tinte = textfarbeAuf(farbe);
      const a = leuchtdichte(farbe);
      const b = leuchtdichte(tinte);
      const verhaeltnis = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      expect(verhaeltnis, `${farbe} mit ${tinte}`).toBeGreaterThan(4.5);
    }
  });

  it("fällt bei unbekanntem Farbformat auf die dunkle Tinte zurück", () => {
    expect(textfarbeAuf("rgb(0,0,0)")).toBe(DUNKEL);
    expect(textfarbeAuf("")).toBe(DUNKEL);
  });
});
