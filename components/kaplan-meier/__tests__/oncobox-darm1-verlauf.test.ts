import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { parseCases } from "../oncobox/parse-cases";
import { detectOncoBox } from "../oncobox/registry";
import { toPatients } from "../oncobox/to-patients";

/**
 * Die Darm-1.0-Musterlösung darm-1.xml enthält keinen einzigen Follow-up,
 * weshalb die Verlaufspfade dieses Profils dort nicht prüfbar sind. OnkoZert
 * liefert eine zweite Variante mit Verlaufsdaten, die genau diese Lücke deckt.
 *
 * Wichtig, weil Darm 1.0 einen anderen Follow-up-Block als Brust 1.0 führt:
 * der Vitalstatus heißt Verstorben und trägt Zahlencodes, der lokale Status
 * heißt LokoregionaeresRezidiv, und einen Gesamtstatus gibt es nicht.
 */
function parseVerlaufsdatei() {
  const xml = readFileSync(
    new URL("../../../public/oncobox-samples/darm-1-verlauf.xml", import.meta.url),
    "utf8",
  );
  const detection = detectOncoBox(xml);
  if (detection?.kind !== "supported") throw new Error("darm-1-verlauf nicht als unterstuetzt erkannt");
  return { ...parseCases(xml, detection.profile), profile: detection.profile };
}

describe("Darm 1.0 mit Verlaufsdaten", () => {
  it("wird als Darm 1.0 erkannt", () => {
    const xml = readFileSync(
      new URL("../../../public/oncobox-samples/darm-1-verlauf.xml", import.meta.url),
      "utf8",
    );

    expect(detectOncoBox(xml)).toMatchObject({ kind: "supported", boxType: "darm", schemaVersion: "1.0" });
  });

  it("liest 11 Faelle und 27 Follow-ups", () => {
    const { cases } = parseVerlaufsdatei();

    expect(cases).toHaveLength(11);
    expect(cases.reduce((summe, fall) => summe + fall.followUps.length, 0)).toBe(27);
  });

  // Ohne diesen Test stuetzt sich das Feld Verstorben allein auf die
  // Spezifikationstabelle: 0 nicht verstorben, 1 bis 3 verstorben.
  it("deutet den Zahlencode des Feldes Verstorben", () => {
    const { cases } = parseVerlaufsdatei();
    const status = cases.flatMap((fall) => fall.followUps.map((f) => f.vitalStatus));

    expect(status.filter((s) => s === "alive").length).toBeGreaterThan(0);
    expect(status.filter((s) => s === "dead").length).toBeGreaterThan(0);
    expect(status.filter((s) => s === null)).toHaveLength(0);
  });

  it("liest den lokalen Status aus LokoregionaeresRezidiv", () => {
    const { cases } = parseVerlaufsdatei();
    const werte = new Set(cases.flatMap((fall) => fall.followUps.map((f) => f.localStatus)));

    expect(werte.has(null)).toBe(false);
    expect([...werte].every((w) => ["0", "1", "2", "3"].includes(w as string))).toBe(true);
  });

  // Darm 1.0 kennt keinen Gesamtstatus, das Profilfeld ist null.
  it("liefert keinen Gesamtstatus", () => {
    const { cases } = parseVerlaufsdatei();

    expect(cases.flatMap((fall) => fall.followUps).every((f) => f.overallStatus === null)).toBe(true);
  });

  it("zensiert am spaetesten Follow-up und erkennt Ereignisse", () => {
    const { cases } = parseVerlaufsdatei();
    const patients = toPatients(cases, {
      boxType: "darm",
      profileId: "darm-1",
      schemaVersion: "1.0",
      patientCount: 11,
      caseCount: 11,
      followUpCount: 27,
    });

    expect(patients.length).toBeGreaterThan(0);
    expect(patients.some((p) => p.event)).toBe(true);
    expect(patients.every((p) => p.survivalTime >= 0)).toBe(true);
  });
});
