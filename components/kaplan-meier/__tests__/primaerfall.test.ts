import { describe, it, expect } from "vitest";
import { istPrimaerfall } from "../primaerfall";

describe("istPrimaerfall", () => {
  it("erkennt die Kennzeichnung aus oBDS und OncoBox", () => {
    expect(istPrimaerfall("1")).toBe(true);
    expect(istPrimaerfall("0")).toBe(false);
  });

  it("erkennt die deutsche Schreibweise der Testszenarien", () => {
    // Sieben der neun mitgelieferten Szenarien führen "ja" und "nein". Die
    // Ergebnisseite verglich nur mit "1": dort stand bei jedem Fall "Nein",
    // und der Filter "Primärfall" liess keinen einzigen übrig.
    expect(istPrimaerfall("ja")).toBe(true);
    expect(istPrimaerfall("nein")).toBe(false);
  });

  it("nimmt englische und boolesche Schreibweisen aus CSV-Dateien", () => {
    expect(istPrimaerfall("true")).toBe(true);
    expect(istPrimaerfall("yes")).toBe(true);
    expect(istPrimaerfall("false")).toBe(false);
    expect(istPrimaerfall("no")).toBe(false);
  });

  it("ignoriert Gross- und Kleinschreibung sowie Leerzeichen", () => {
    expect(istPrimaerfall(" Ja ")).toBe(true);
    expect(istPrimaerfall("TRUE")).toBe(true);
    expect(istPrimaerfall("J")).toBe(true);
    expect(istPrimaerfall("Y")).toBe(true);
  });

  it("wertet fehlende und unbekannte Angaben nicht als Primärfall", () => {
    expect(istPrimaerfall(undefined)).toBe(false);
    expect(istPrimaerfall(null)).toBe(false);
    expect(istPrimaerfall("")).toBe(false);
    expect(istPrimaerfall("vielleicht")).toBe(false);
  });
});
