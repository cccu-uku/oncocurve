import { describe, expect, it } from "vitest";
import { parseCSV } from "../csv-parser";

// Aufbau wie in einer gelieferten Lungen-Datei: das c/p-Präfix steht in einer
// eigenen Spalte "p", die T-Kategorie nur als Ziffer in "T", und das Datum des
// letzten Kontakts heißt "LastContact".
const GETEILT = `Id,DiagnosisDate,LastContact,DeathDate,Event,p,T
1,01.01.2020,,22.12.2024,True,c,4
2,01.01.2020,01.01.2022,,False,p,2a`;

describe("CSV mit getrennter Präfix-Spalte", () => {
  it("liest LastContact als Datum des letzten Kontakts", () => {
    const r = parseCSV(GETEILT);
    const lebend = r.patients.find((p) => p.id === "2")!;
    expect(lebend.survivalTime).toBeGreaterThan(23);
    expect(lebend.survivalTime).toBeLessThan(25);
    expect(Object.keys(r.extraColumns?.columns ?? {})).not.toContain("LastContact");
  });

  it("setzt Präfix-Spalte und T-Ziffer zu cT4 und pT2a zusammen", () => {
    const r = parseCSV(GETEILT);
    const [eins, zwei] = r.patients;
    expect(eins.staging?.tCategory).toBe("cT4");
    expect(eins.staging?.tClinical).toBe("cT4");
    expect(zwei.staging?.tPathological).toBe("pT2a");
    expect(Object.keys(r.extraColumns?.columns ?? {})).not.toContain("p");
  });

  it("lässt eine Spalte p mit anderen Werten als c und p unangetastet", () => {
    const r = parseCSV(`Id,DiagnosisDate,LastContact,DeathDate,Event,p,T
1,01.01.2020,,22.12.2024,True,0.03,4
2,01.01.2020,01.01.2022,,False,0.20,2`);
    expect(r.patients[0].staging?.tCategory).toBe("4");
    expect(r.patients[0].staging?.tClinical).toBeNull();
    expect(Object.keys(r.extraColumns?.columns ?? {})).toContain("p");
  });
});
