import { describe, expect, it } from "vitest";
import type { Patient } from "../obds-parser-new";
import { calculateDFSFromOBDS } from "../endpunkte/dfs";

const DIAGNOSE = "2020-01-01";

function fall(felder: Record<string, unknown>): Patient {
  return { id: "1", diagnosisDate: DIAGNOSE, ...felder } as unknown as Patient;
}

describe("DFS-Berechnung", () => {
  it("nimmt das früheste Ereignis, nicht das erstbeste", () => {
    const ergebnis = calculateDFSFromOBDS(
      fall({ rezidivDatum: "2020-07-01", todDatum: "2020-12-01" }),
    );

    expect(ergebnis.dfsEvent).toBe(1);
    expect(ergebnis.eventType).toBe("rezidiv");
  });

  it("zensiert am Nachsorgedatum, wenn kein Ereignis vorliegt", () => {
    const ergebnis = calculateDFSFromOBDS(fall({ nachsorgeDatum: "2021-07-01" }));

    expect(ergebnis.dfsEvent).toBe(0);
    expect(ergebnis.eventType).toBe("zensiert");
    expect(ergebnis.dfsTimeMonths).toBeCloseTo(17.97, 1);
  });

  it("rechnet Fernmetastasen als Ereignis", () => {
    const ergebnis = calculateDFSFromOBDS(fall({ metastasenDatum: "2021-01-01" }));

    expect(ergebnis.dfsEvent).toBe(1);
    expect(ergebnis.eventType).toBe("metastasen");
  });

  it("fällt ohne gültiges Startdatum auf Zeit null zurück", () => {
    const ergebnis = calculateDFSFromOBDS(
      fall({ diagnosisDate: "", rezidivDatum: "2021-01-01" }),
    );

    expect(ergebnis.dfsTimeMonths).toBe(0);
    expect(ergebnis.dfsEvent).toBe(0);
  });

  // Datenfehler: ein Rezidiv vor der Diagnose. Die Zeit wird auf null geklemmt,
  // das Ereignis bleibt bestehen.
  it("klemmt ein Ereignis vor der Diagnose auf Zeit null", () => {
    const ergebnis = calculateDFSFromOBDS(fall({ rezidivDatum: "2019-07-01" }));

    expect(ergebnis.dfsTimeMonths).toBe(0);
    expect(ergebnis.dfsEvent).toBe(1);
  });

  it("startet auf Wunsch am Therapiebeginn", () => {
    const ergebnis = calculateDFSFromOBDS(
      fall({ therapieBeginn: "2020-04-01", rezidivDatum: "2020-10-01" }),
      "therapieBeginn",
    );

    expect(ergebnis.dfsTimeMonths).toBeCloseTo(6.01, 1);
  });
});
