import { describe, expect, it } from "vitest";
import { PALETTE_IDS, paletteEntry } from "../curve-palettes";

describe("Palette Monochrom Lila", () => {
  it("ist in der Auswahl enthalten", () => {
    expect(PALETTE_IDS).toContain("monoPurple");
  });

  it("beginnt mit Lila, Stahlblau, Hellblau und Lavendel", () => {
    const farben: string[] = [0, 1, 2, 3].map((i) => paletteEntry("monoPurple", i).color);
    expect(farben).toEqual(["#A855F7", "#4F86C6", "#8DB7E2", "#B9A7E8"]);
  });

  it("wiederholt keine Farbe, bevor die Palette durchlaufen ist", () => {
    const farben: string[] = Array.from({ length: 8 }, (_, i) => paletteEntry("monoPurple", i).color);
    expect(new Set(farben).size).toBe(farben.length);
  });
});
