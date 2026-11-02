import { describe, it, expect } from "vitest";
import { coxFaelle, hatAuswertbareZeit } from "../auswertbare-faelle";
import type { Patient } from "../obds-parser-new";

// Ein Patient mit genau den Feldern, auf die der Filter schaut.
function fall(survivalTime: unknown, gruppe = "A"): Patient {
  return { id: gruppe + String(survivalTime), survivalTime, event: true, gender: gruppe } as unknown as Patient;
}

describe("hatAuswertbareZeit", () => {
  it("wirft die Zeit null in Monaten heraus", () => {
    expect(hatAuswertbareZeit(fall(0), "monate")).toBe(false);
  });

  it("behält die Zeit null in Tagen, das ist ein Ereignis am Diagnosetag", () => {
    expect(hatAuswertbareZeit(fall(0), "tage")).toBe(true);
  });

  it("behält übliche Zeiten in beiden Einheiten", () => {
    expect(hatAuswertbareZeit(fall(12.5), "monate")).toBe(true);
    expect(hatAuswertbareZeit(fall(380), "tage")).toBe(true);
  });

  it("wirft negative Zeiten heraus", () => {
    expect(hatAuswertbareZeit(fall(-1), "monate")).toBe(false);
    expect(hatAuswertbareZeit(fall(-1), "tage")).toBe(false);
  });

  it("wirft fehlende und unbrauchbare Angaben heraus", () => {
    expect(hatAuswertbareZeit(fall(NaN), "monate")).toBe(false);
    expect(hatAuswertbareZeit(fall(undefined), "monate")).toBe(false);
    expect(hatAuswertbareZeit(fall(null), "tage")).toBe(false);
    expect(hatAuswertbareZeit(fall("12"), "monate")).toBe(false);
  });
});

describe("coxFaelle", () => {
  const gruppeVon = (p: Patient) => (p.gender as string) || null;

  it("übergibt nur Fälle, die auch in der Kurve stehen", () => {
    // Der reproduzierte Fehler: eine Zeit null in einer Monatskohorte fehlt in
    // der Kurve, lief aber in die Regression und in ihr n.
    const patients = [fall(10, "A"), fall(0, "A"), fall(20, "B"), fall(30, "B")];
    const faelle = coxFaelle(patients, gruppeVon, "monate");
    expect(faelle).toHaveLength(3);
    expect(faelle.map((f) => f.survivalTime)).toEqual([10, 20, 30]);
  });

  it("behält die Zeit null in einer Tageskohorte", () => {
    const patients = [fall(10, "A"), fall(0, "A"), fall(20, "B")];
    expect(coxFaelle(patients, gruppeVon, "tage")).toHaveLength(3);
  });

  it("lässt Fälle ohne Gruppe weg", () => {
    const ohne = { id: "x", survivalTime: 5, event: false, gender: null } as unknown as Patient;
    expect(coxFaelle([fall(10, "A"), ohne], gruppeVon, "monate")).toHaveLength(1);
  });

  it("übernimmt Zeit, Ereignis und Gruppe unverändert", () => {
    const p = { id: "1", survivalTime: 7, event: false, gender: "B" } as unknown as Patient;
    expect(coxFaelle([p], gruppeVon, "monate")).toEqual([
      { survivalTime: 7, event: false, group: "B" },
    ]);
  });
});
