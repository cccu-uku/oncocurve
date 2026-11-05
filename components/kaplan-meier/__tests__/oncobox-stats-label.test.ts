import { describe, expect, it } from "vitest";
import de from "@/locales/de.json";
import en from "@/locales/en.json";

/**
 * Bei OncoBox-Daten ist eine Zeile ein Primaerfall, nicht eine Person. Eine
 * Person kann mehrere Primaerfaelle haben, etwa bei beidseitigem Karzinom.
 * Die Ergebnisseite beschriftet die Kachel deshalb quellenabhaengig.
 */
describe("Beschriftung der Fallzahl", () => {
  it("hat die quellenabhaengigen Schluessel in beiden Katalogen", () => {
    for (const catalogue of [de, en]) {
      expect(catalogue.Results.statsCard.totalPatients).toBeTruthy();
      expect(catalogue.Results.statsCard.totalPrimaryCases).toBeTruthy();
      expect(catalogue.Results.statsCard.fromPersons).toContain("{count}");
    }
  });

  it("unterscheidet Faelle von Personen im Wortlaut", () => {
    expect(de.Results.statsCard.totalPrimaryCases).toBe("Primärfälle");
    expect(de.Results.statsCard.fromPersons).toBe("von {count} Personen");
    expect(en.Results.statsCard.totalPrimaryCases).toBe("Primary cases");
  });
});
