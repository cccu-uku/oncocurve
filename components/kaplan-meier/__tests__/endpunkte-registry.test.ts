import { describe, expect, it } from "vitest";
import {
  ENDPUNKTE,
  endpunktById,
  endpunkteFuerZentrum,
  kennzeichnungFuer,
} from "../endpunkte/registry";
import type { EndpunktId, ZentrumsTyp } from "../endpunkte/typen";

// Aus dem Erhebungsbogen, Abschnitt "Parameter Ergebnisqualität".
// Diese Tabelle ist die Prüfvorlage: weicht die Registry ab, ist die Registry
// falsch, nicht der Test.
const ERWARTET: Record<ZentrumsTyp, EndpunktId[]> = {
  BZ: ["oas", "lrr", "mfs", "dfs", "pfs", "pps"],
  DZ: ["oas", "lrr", "mfs", "dfs", "pfs", "pps"],
  LZ: ["oas", "lrfs", "pps"],
  PZ: ["oas", "dfs"],
  OZ: ["oas", "lrfs", "mfs"],
  GZ: ["oas", "pfs"],
  HZ: ["oas", "pfs"],
  HAEZ: ["oas", "pfs", "pps"],
  MB: ["oas", "lrfs", "pps"],
  MH: ["oas", "lrfs", "pps"],
  MN: ["oas", "lrfs", "pps"],
  MP: ["oas", "lrr", "mfs", "dfs", "pfs", "pps"],
  MPEN: ["oas"],
};

describe("Endpunkt-Registry", () => {
  for (const [typ, erwartet] of Object.entries(ERWARTET)) {
    it(`liefert für ${typ} genau die Endpunkte des Erhebungsbogens`, () => {
      const ids = endpunkteFuerZentrum(typ as ZentrumsTyp).map((e) => e.id);

      expect([...ids].sort()).toEqual([...erwartet].sort());
    });
  }

  // TTFT steht in keinem Erhebungsbogen und darf im Zertifizierungsmodus nicht
  // als Pflichtendpunkt auftauchen.
  it("bietet TTFT keinem Zentrumstyp an", () => {
    const ttft = endpunktById("ttft");

    expect(ttft).toBeDefined();
    expect(ttft?.pflichtFuer).toHaveLength(0);
    expect(ttft?.alternativFuer).toHaveLength(0);
  });

  it("kennt jeden Endpunkt genau einmal", () => {
    const ids = ENDPUNKTE.map((e) => e.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  // Der Sperrmechanismus: ohne freigegebene Rechenvorschrift bleibt ein
  // Endpunkt unwählbar. Inzwischen tragen alle acht Endpunkte eine Regel.
  it("trägt für jeden Endpunkt eine Regel", () => {
    const mitRegel = ENDPUNKTE.filter((e) => e.regel !== null).map((e) => e.id);

    expect([...mitRegel].sort()).toEqual(
      ["dfs", "lrfs", "lrr", "mfs", "oas", "pfs", "pps", "ttft"].sort(),
    );
  });

  it("nennt zu jeder Regel eine Belegstelle", () => {
    for (const endpunkt of ENDPUNKTE) {
      if (endpunkt.regel) expect(endpunkt.regel.quelle.length).toBeGreaterThan(0);
    }
  });
});

describe("Kennzeichnung als Pflicht oder Alternative", () => {
  function definition(id: EndpunktId) {
    const gefunden = endpunktById(id);
    if (!gefunden) throw new Error(`Endpunkt ${id} fehlt in der Registry`);
    return gefunden;
  }

  it("kennzeichnet das Gesamtüberleben als Pflicht", () => {
    expect(kennzeichnungFuer(definition("oas"), "BZ")).toBe("pflicht");
  });

  // Ein Brustkrebszentrum wählt zwischen DFS und PFS; die Oberfläche muss das
  // zeigen, sonst wirken sechs Einträge gleichwertig.
  it("kennzeichnet DFS und PFS für ein Brustkrebszentrum als Alternative", () => {
    expect(kennzeichnungFuer(definition("dfs"), "BZ")).toBe("alternativ");
    expect(kennzeichnungFuer(definition("pfs"), "BZ")).toBe("alternativ");
  });

  // Derselbe Endpunkt kann anderswo Pflicht sein.
  it("kennzeichnet DFS für ein Prostatakrebszentrum als Pflicht", () => {
    expect(kennzeichnungFuer(definition("dfs"), "PZ")).toBe("pflicht");
  });

  it("kennzeichnet in der freien Analyse nichts", () => {
    expect(kennzeichnungFuer(definition("oas"), null)).toBeNull();
  });

  it("kennzeichnet einen Endpunkt nicht, den der Zentrumstyp nicht führt", () => {
    expect(kennzeichnungFuer(definition("ttft"), "BZ")).toBeNull();
  });
});
