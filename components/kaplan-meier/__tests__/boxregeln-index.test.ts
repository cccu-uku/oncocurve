import { describe, expect, it } from "vitest";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import { tageZwischen } from "../endpunkte/boxregeln/zeit";

describe("Nachschlagetabelle der Boxregeln", () => {
  it("liefert null für eine Kohorte ohne Box", () => {
    expect(boxRegelFuer(null, "dfs")).toBeNull();
  });

  it("liefert null für eine Box ohne freigegebene Regel", () => {
    expect(boxRegelFuer("family-2", "ttft")).toBeNull();
  });

  it("liefert null für einen Endpunkt, den keine Box vorschreibt", () => {
    expect(boxRegelFuer("brust-1", "pps")).toBeNull();
  });
});

describe("Zeitabstand in Tagen", () => {
  it("zählt ganze Tage zwischen zwei Datumsangaben", () => {
    expect(tageZwischen("2019-01-10", "2019-02-10")).toBe(31);
  });

  it("liefert null, wenn ein Datum fehlt", () => {
    expect(tageZwischen(null, "2019-02-10")).toBeNull();
    expect(tageZwischen("2019-01-10", null)).toBeNull();
  });

  // Ein Ereignisdatum vor dem Diagnosedatum ist ein Datenfehler. Null statt
  // einer negativen Zeit, damit die Kurve ihn nicht stillschweigend schluckt.
  it("liefert null bei negativem Abstand", () => {
    expect(tageZwischen("2019-02-10", "2019-01-10")).toBeNull();
  });

  it("liefert null bei unlesbarem Datum", () => {
    expect(tageZwischen("2019-01-10", "unbekannt")).toBeNull();
  });
});
