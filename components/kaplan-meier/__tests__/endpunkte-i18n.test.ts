import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { ENDPUNKTE } from "../endpunkte/registry";
import { ZENTRUMS_TYPEN } from "../endpunkte/typen";

function locale(name: "de" | "en"): Record<string, Record<string, unknown>> {
  const roh = readFileSync(new URL(`../../../locales/${name}.json`, import.meta.url), "utf8");
  return JSON.parse(roh);
}

const SCHLUESSEL = [
  "title",
  "titleCertification",
  "centerType",
  "centerTypeDetected",
  "required",
  "alternative",
  "lockedRule",
  "lockedData",
  "lockedTtftDataset",
];

describe("Übersetzungen der Endpunktsektion", () => {
  it.each(["de", "en"] as const)("%s trägt alle Schlüssel des Namensraums", (name) => {
    const endpoint = locale(name).Endpoint as Record<string, unknown>;

    expect(endpoint).toBeDefined();
    for (const schluessel of SCHLUESSEL) {
      expect(endpoint[schluessel], `${name}.Endpoint.${schluessel}`).toBeTruthy();
    }
  });

  it.each(["de", "en"] as const)("%s benennt jeden Endpunkt der Registry", (name) => {
    const namen = (locale(name).Endpoint as { names: Record<string, string> }).names;

    for (const endpunkt of ENDPUNKTE) {
      expect(namen[endpunkt.labelKey], `${name} fehlt ${endpunkt.labelKey}`).toBeTruthy();
    }
  });

  it.each(["de", "en"] as const)("%s benennt jeden Zentrumstyp", (name) => {
    const zentren = (locale(name).Endpoint as { centers: Record<string, string> }).centers;

    for (const typ of ZENTRUMS_TYPEN) {
      expect(zentren[typ], `${name} fehlt ${typ}`).toBeTruthy();
    }
  });

  // Ohne diese Prüfung fällt eine nur halb übersetzte Ergänzung erst im
  // Browser auf, und dort als leerer Text statt als Fehler.
  it("hält beide Sprachen auf demselben Schlüsselsatz", () => {
    const de = Object.keys(locale("de").Endpoint as object).sort();
    const en = Object.keys(locale("en").Endpoint as object).sort();

    expect(de).toEqual(en);
  });
});
