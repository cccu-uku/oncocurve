import { describe, it, expect } from "vitest";
import { umbrechen } from "../label-umbruch";

// Jedes Zeichen sechs Pixel breit. Im Browser misst ein Canvas, hier genügt
// eine feste Breite, damit die Erwartungen nachrechenbar bleiben.
const messe = (text: string) => text.length * 6;

describe("umbrechen", () => {
  it("lässt einen kurzen Namen in einer Zeile", () => {
    expect(umbrechen("Luminal A", 120, messe)).toEqual(["Luminal A"]);
  });

  it("bricht an Wortgrenzen um, sobald die Breite erreicht ist", () => {
    // 20 Zeichen je Zeile passen in 120 Pixel.
    expect(umbrechen("Breast Invasive Mixed Mucinous Carcinoma", 120, messe)).toEqual([
      "Breast Invasive",
      "Mixed Mucinous",
      "Carcinoma",
    ]);
  });

  it("füllt eine Zeile so weit, wie sie reicht", () => {
    expect(umbrechen("Invasive Breast Carcinoma", 120, messe)).toEqual([
      "Invasive Breast",
      "Carcinoma",
    ]);
  });

  it("teilt ein einzelnes Wort, das allein zu breit ist", () => {
    const zeilen = umbrechen("Plattenepithelkarzinomvariante", 120, messe);
    expect(zeilen.every((z) => messe(z) <= 120)).toBe(true);
    expect(zeilen.join("")).toBe("Plattenepithelkarzinomvariante");
  });

  it("kürzt nach der letzten erlaubten Zeile mit Auslassungszeichen", () => {
    const zeilen = umbrechen(
      "Mary Bird Perkins Cancer Center Our Lady of the Lake Regional Medical",
      120,
      messe,
      2,
    );
    expect(zeilen).toHaveLength(2);
    expect(zeilen[1].endsWith("…")).toBe(true);
    expect(messe(zeilen[1])).toBeLessThanOrEqual(120);
  });

  it("hält jede Zeile innerhalb der Breite", () => {
    const zeilen = umbrechen("Breast Invasive Lobular Carcinoma with extensive features", 90, messe);
    expect(zeilen.every((z) => messe(z) <= 90)).toBe(true);
  });

  it("fasst mehrfache Leerzeichen zusammen und liefert für leeren Text eine leere Zeile", () => {
    expect(umbrechen("  Luminal   B  ", 120, messe)).toEqual(["Luminal B"]);
    expect(umbrechen("", 120, messe)).toEqual([""]);
  });
});
