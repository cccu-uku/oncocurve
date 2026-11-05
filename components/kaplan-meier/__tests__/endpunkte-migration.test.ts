import { describe, expect, it } from "vitest";
import { migriereStratifizierung } from "../endpunkte/migration";

describe("Migration gespeicherter Stratifizierungen", () => {
  // Eine laufende Sitzung kann diseaseFreeSurvival gespeichert haben. Ohne
  // Umsetzung liefe sie in ein Kriterium, das es nicht mehr gibt.
  it("setzt diseaseFreeSurvival auf keine Stratifizierung plus Endpunkt dfs", () => {
    const ergebnis = migriereStratifizierung({ criterion: "diseaseFreeSurvival" });

    expect(ergebnis).toEqual({
      criterion: "none",
      endpunkt: "dfs",
      gruppenZuruecksetzen: true,
    });
  });

  // Die gespeicherte Gruppenliste führt sonst weiter die alte DFS-Gruppe. Zu ihr
  // passt keine Gruppenkennung mehr, und die Cox-Analyse filtert daraufhin jeden
  // Patienten weg, ohne das anzuzeigen.
  it("verlangt beim Umsetzen, die Gruppenliste zu verwerfen", () => {
    const ergebnis = migriereStratifizierung({
      criterion: "diseaseFreeSurvival",
      groups: [{ id: "dfs", name: "DFS", color: "#000", enabled: true }],
    });

    expect(ergebnis.gruppenZuruecksetzen).toBe(true);
  });

  it("lässt jedes andere Kriterium unverändert", () => {
    const ergebnis = migriereStratifizierung({ criterion: "gender" });

    expect(ergebnis).toEqual({
      criterion: "gender",
      endpunkt: null,
      gruppenZuruecksetzen: false,
    });
  });

  it("fällt bei unbrauchbarem Inhalt auf keine Stratifizierung zurück", () => {
    const leer = { criterion: "none", endpunkt: null, gruppenZuruecksetzen: false };

    expect(migriereStratifizierung(null)).toEqual(leer);
    expect(migriereStratifizierung("kaputt")).toEqual(leer);
  });
});
