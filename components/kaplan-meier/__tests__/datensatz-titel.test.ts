import { describe, it, expect } from "vitest";
import { datensatzTitel } from "../datensatz-titel";

describe("datensatzTitel", () => {
  it("nimmt den Dateinamen einer hochgeladenen Datei", () => {
    expect(datensatzTitel({ name: "Mamma_2024.xlsx", source: "xlsx" })).toEqual({
      name: "Mamma_2024.xlsx",
      istSzenario: false,
      quelle: "xlsx",
    });
  });

  it("löst eine Testkohorte in ihren Übersetzungsschlüssel auf", () => {
    expect(datensatzTitel({ name: "mock-comprehensive", source: "mock" })).toEqual({
      name: "comprehensive",
      istSzenario: true,
      quelle: "mock",
    });
  });

  it("kennt den abweichenden Schlüssel der DFS-Kohorte", () => {
    // Ladeschlüssel und Zweig in den Sprachdateien gehen bei dieser einen
    // Kohorte auseinander.
    expect(datensatzTitel({ name: "mock-diseaseFreeSurvival", source: "mock" })?.name).toBe("dfs");
  });

  it("behandelt einen unbekannten mock-Namen wie einen Dateinamen", () => {
    expect(datensatzTitel({ name: "mock-gibtesnicht", source: "mock" })).toEqual({
      name: "mock-gibtesnicht",
      istSzenario: false,
      quelle: "mock",
    });
  });

  it("stuft eine unbekannte Quelle auf unknown zurück", () => {
    expect(datensatzTitel({ name: "daten.csv", source: "irgendwas" })?.quelle).toBe("unknown");
    expect(datensatzTitel({ name: "daten.csv" })?.quelle).toBe("unknown");
  });

  it("gibt ohne Dateinamen nichts zurück", () => {
    expect(datensatzTitel(null)).toBeNull();
    expect(datensatzTitel({})).toBeNull();
    expect(datensatzTitel({ name: "   " })).toBeNull();
  });
});
