import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { ONCOBOX_SAMPLES } from "../oncobox-sample-cards";
import { detectOncoBox } from "../oncobox/registry";

function samplePath(fileName: string): URL {
  return new URL(`../../../public/oncobox-samples/${fileName}`, import.meta.url);
}

describe("Beispielkarten", () => {
  it("verweist nur auf vorhandene Dateien", () => {
    for (const sample of ONCOBOX_SAMPLES) {
      expect(existsSync(samplePath(sample.fileName))).toBe(true);
    }
  });

  // Eine Karte, die auf ein nicht unterstütztes Format zeigt, erzeugt beim
  // Klick nur eine Fehlermeldung.
  it("bietet nur unterstützte Boxen an", () => {
    for (const sample of ONCOBOX_SAMPLES) {
      const xml = readFileSync(samplePath(sample.fileName), "utf8");
      expect(detectOncoBox(xml)?.kind).toBe("supported");
    }
  });

  it("kennzeichnet Darm 1.0 als Datei ohne Verlaufsdaten", () => {
    const darm1 = ONCOBOX_SAMPLES.find((sample) => sample.fileName === "darm-1.xml");

    expect(darm1?.withoutFollowUps).toBe(true);
  });

  it("hält die Herkunft fest", () => {
    const origin = readFileSync(new URL("../../../public/oncobox-samples/SOURCE.md", import.meta.url), "utf8");

    expect(origin).toContain("OnkoZert");
    expect(origin).toContain("https://www.xml-oncobox.de/de/Home/FuerHersteller");
  });
});
