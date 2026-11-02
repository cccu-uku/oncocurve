import { describe, expect, it } from "vitest";
import { ICD_10_CODES, spellOutCode } from "../oncobox/code-label";

describe("spellOutCode", () => {
  it("schreibt einen bekannten ICD-Code aus und haengt ihn in Klammern an", () => {
    expect(spellOutCode("C50.2", ICD_10_CODES, "de")).toBe(
      "Oberer innerer Quadrant der Brustdrüse (C50.2)",
    );
  });

  // Der Platzhalter der 2.0-Boxen stand bisher nackt im Tooltip.
  it("erklaert den Platzhalter N", () => {
    expect(spellOutCode("N", ICD_10_CODES, "de")).toBe("Kein Primärtumor/Lokalrezidiv (N)");
  });

  it("nutzt die englische Beschriftung bei englischer Sprache", () => {
    const englisch = spellOutCode("N", ICD_10_CODES, "en");

    expect(englisch).toContain("(N)");
    expect(englisch).not.toBe("Kein Primärtumor/Lokalrezidiv (N)");
  });

  // Daten aus oBDS oder CSV duerfen nicht verstuemmelt werden.
  it("laesst unbekannte Codes unveraendert", () => {
    expect(spellOutCode("C99.9", ICD_10_CODES, "de")).toBe("C99.9");
  });

  it("liefert null fuer fehlende Werte", () => {
    expect(spellOutCode(null, ICD_10_CODES, "de")).toBeNull();
    expect(spellOutCode("", ICD_10_CODES, "de")).toBeNull();
  });
});
