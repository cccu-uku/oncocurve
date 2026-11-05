import { describe, expect, it } from "vitest";
import { HEADER_ALIASES } from "../parse-rows";

describe("Spaltenerkennung für Ereignisdaten", () => {
  it.each([
    ["rezidivDatum", ["rezidivdatum", "recurrence_date", "rezidiv_datum"]],
    ["metastasenDatum", ["metastasendatum", "metastasis_date"]],
    ["progressionsDatum", ["progressionsdatum", "progression_date"]],
    // 'followup_date' fehlt hier bewusst: der Alias gehört schon
    // lastContactDate, siehe Doppelvergabe-Test unten.
    ["nachsorgeDatum", ["nachsorgedatum", "follow_up_datum"]],
  ])("kennt %s", (feld, schreibweisen) => {
    const aliase = HEADER_ALIASES[feld];

    expect(aliase).toBeDefined();
    for (const schreibweise of schreibweisen) {
      expect(aliase).toContain(schreibweise);
    }
  });

  // Rein additiv: kein Alias darf durch die Erweiterung in zwei Feldern
  // gleichzeitig stehen, sonst hängt die Zuordnung an der Reihenfolge.
  //
  // Zwei Doppelvergaben bestehen bereits vor dieser Aufgabe: lastcontactdate
  // und last_contact stehen bei endDate und bei lastContactDate. Das ist ein
  // echter Mangel, aber ein vorbestehender; ihn hier zu beheben würde das
  // Verhalten bestehender CSV-Uploads ändern und gehört nicht in diese
  // Aufgabe. Der Test hält sie fest, damit sie sichtbar bleiben, und schlägt
  // an, sobald eine dritte hinzukommt.
  const BEKANNTE_DOPPELVERGABEN = ["lastcontactdate", "last_contact"];

  it("vergibt keinen Alias doppelt, abgesehen von zwei bekannten Altfällen", () => {
    const gesehen = new Map<string, string>();
    const doppelt: string[] = [];

    for (const [feld, aliase] of Object.entries(HEADER_ALIASES)) {
      for (const alias of aliase) {
        if (gesehen.has(alias)) doppelt.push(`${alias} (${gesehen.get(alias)} und ${feld})`);
        gesehen.set(alias, feld);
      }
    }

    expect(doppelt.map((eintrag) => eintrag.split(" ")[0]).sort()).toEqual(
      [...BEKANNTE_DOPPELVERGABEN].sort(),
    );
  });
});
