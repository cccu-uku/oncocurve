import { describe, it, expect } from "vitest";
import { patientGruppe } from "../patient-gruppe";
import type { Patient } from "../obds-parser-new";

function fall(felder: Record<string, unknown>): Patient {
  return { id: "1", survivalTime: 10, event: true, ...felder } as unknown as Patient;
}

describe("patientGruppe: Kriterien aus Datei- und Boxspalten", () => {
  // Diese sieben kannte die Zuordnung der Cox-Analyse nicht. Sie fiel dort auf
  // "all" zurück, die Regression sah eine einzige Gruppe und meldete, es gebe
  // keine Daten, während Kurve und Log-Rank daneben stratifizierten.
  const faelle: [string, Record<string, unknown>, string][] = [
    ["cT", { cT: "cT2" }, "cT2"],
    ["pT", { pT: "pT3a" }, "pT3a"],
    ["primaerfall", { primaerfall: "Ja" }, "Ja"],
    ["lokalisation", { lokalisation: "C50.4" }, "C50.4"],
    ["tumorid", { tumorid: 4711 }, "4711"],
    ["startdatum", { startdatum: "2020-01-15" }, "2020-01-15"],
    ["endedatum", { endedatum: "2022-03-01" }, "2022-03-01"],
  ];

  for (const [kriterium, felder, erwartet] of faelle) {
    it(`ordnet ${kriterium} zu`, () => {
      expect(patientGruppe(fall(felder), kriterium as never)).toBe(erwartet);
    });

    it(`meldet ${kriterium} ohne Angabe als unbekannt`, () => {
      expect(patientGruppe(fall({}), kriterium as never)).toBe("unknown");
    });
  }
});

describe("patientGruppe: entitätsspezifisches Stadium", () => {
  it("nimmt das Präfix aus der pT-Spalte, wenn der Wert selbst keines trägt", () => {
    const p = fall({ tumorType: "C61", staging: { tCategory: "T2", tPathological: "T2", nCategory: "N0", mCategory: "M0" } });
    expect(patientGruppe(p, "entityStaging")).toBe("C61__II");
  });

  it("gruppiert ohne c/p-Angabe nicht, wenn die Entität klinisch und pathologisch trennt", () => {
    const p = fall({ tumorType: "C61", staging: { tCategory: "T2", nCategory: "N0", mCategory: "M0" } });
    expect(patientGruppe(p, "entityStaging")).toBe("no_match");
  });
});

describe("patientGruppe: bestehende Kriterien", () => {
  it("nimmt das Geschlecht unverändert", () => {
    expect(patientGruppe(fall({ gender: "Weiblich" }), "gender")).toBe("Weiblich");
  });

  it("lässt eine unbekannte Altersgruppe aus der Auswertung heraus", () => {
    expect(patientGruppe(fall({ age: 0 }), "ageGroup")).toBeNull();
    expect(patientGruppe(fall({ age: 70 }), "ageGroup")).toBe("senior");
  });

  it("führt fehlende Angaben als unbekannt", () => {
    expect(patientGruppe(fall({}), "grading")).toBe("unknown");
    expect(patientGruppe(fall({}), "staging")).toBe("unknown");
    expect(patientGruppe(fall({}), "tumorType")).toBe("unknown");
  });

  it("liest das Diagnosejahr aus dem Datum", () => {
    expect(patientGruppe(fall({ diagnosisDate: "2019-06-01" }), "diagnosisYear")).toBe("2019");
  });

  it("fasst ohne Stratifizierung alles zu einer Gruppe", () => {
    expect(patientGruppe(fall({}), "none")).toBe("all");
  });
});

describe("patientGruppe: Zusatzspalten", () => {
  const kontext = {
    extraColumns: {
      columns: { PAM50: { type: "categorical" as const, values: ["Luminal A"] } },
    },
  } as never;

  it("nimmt den Wert einer kategorialen Zusatzspalte", () => {
    const p = fall({ extras: { PAM50: "Luminal A" } });
    expect(patientGruppe(p, "extra:PAM50" as never, kontext)).toBe("Luminal A");
  });

  it("kennzeichnet eine leere Zusatzspalte", () => {
    const p = fall({ extras: { PAM50: "" } });
    expect(patientGruppe(p, "extra:PAM50" as never, kontext)).toBe("__missing__");
  });

  it("meldet eine unbekannte Zusatzspalte als unbekannt", () => {
    expect(patientGruppe(fall({}), "extra:GibtsNicht" as never, kontext)).toBe("unknown");
  });
});
