import { describe, expect, it } from "vitest";
import de from "@/locales/de.json";
import en from "@/locales/en.json";

/**
 * next-intl wirft beim Rendern, wenn ein Schlüssel in der aktiven Sprache
 * fehlt. Beide Kataloge müssen dieselben Schlüssel tragen.
 */
describe("OncoBox-Übersetzungen", () => {
  it("hat in beiden Sprachen dieselben Schlüssel", () => {
    expect(Object.keys(en.OncoBox).sort()).toEqual(Object.keys(de.OncoBox).sort());
    expect(Object.keys(en.OncoBox.boxes).sort()).toEqual(Object.keys(de.OncoBox.boxes).sort());
  });

  it("benennt den Tab in beiden Sprachen", () => {
    expect(de.OncoBox.tabTitle).toBe("OncoBoxen");
    expect(en.OncoBox.tabTitle).toBe("OncoBoxes");
  });
});
