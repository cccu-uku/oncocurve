import { describe, expect, it } from "vitest";
import type { Patient } from "../obds-parser-new";
import { endpunktById } from "../endpunkte/registry";
import { kohorteFuerEndpunkt, zeitUndEreignis } from "../endpunkte/anwenden";
import type { EndpunktDefinition } from "../endpunkte/typen";

function definition(id: "oas" | "dfs" | "ttft"): EndpunktDefinition {
  const gefunden = endpunktById(id);
  if (!gefunden) throw new Error(`Endpunkt ${id} fehlt`);
  return gefunden;
}

describe("Endpunkt auf einen Fall anwenden", () => {
  // Regressionsschutz: Gesamtüberleben muss exakt liefern, was die Seite
  // vorher direkt aus dem Patienten gelesen hat.
  it("übernimmt bei Gesamtüberleben Zeit und Ereignis unverändert", () => {
    const patient = { id: "1", survivalTime: 42, event: true } as unknown as Patient;

    expect(zeitUndEreignis(definition("oas"), patient)).toEqual({
      survivalTime: 42,
      event: true,
      followupDate: null,
      zeitEinheit: "monate",
      konkurrenz: false,
    });
  });

  // Auch die Zeit bis zur Ersttherapie steht bereits fertig am Patienten,
  // genau wie das Gesamtüberleben.
  it("übernimmt bei der Zeit bis zur Ersttherapie Zeit und Ereignis unverändert", () => {
    const patient = { id: "1", survivalTime: 7, event: true } as unknown as Patient;

    expect(zeitUndEreignis(definition("ttft"), patient)).toEqual({
      survivalTime: 7,
      event: true,
      followupDate: null,
      zeitEinheit: "monate",
      konkurrenz: false,
    });
  });

  it("rechnet bei krankheitsfreiem Überleben aus den Ereignisdaten", () => {
    const patient = {
      id: "1",
      survivalTime: 60,
      event: false,
      diagnosisDate: "2020-01-01",
      rezidivDatum: "2020-07-01",
    } as unknown as Patient;

    const ergebnis = zeitUndEreignis(definition("dfs"), patient);

    expect(ergebnis.event).toBe(true);
    expect(ergebnis.survivalTime).toBeCloseTo(5.98, 1);
  });

  // Tabelle und Export zeigen das Datum neben der Zeit. Beide müssen sich auf
  // dasselbe Ereignis beziehen.
  it("liefert das Ereignisdatum passend zur Zeit", () => {
    const patient = {
      id: "1",
      survivalTime: 60,
      event: false,
      followupDate: new Date("2024-01-01"),
      diagnosisDate: "2020-01-01",
      rezidivDatum: "2020-07-01",
    } as unknown as Patient;

    const ergebnis = zeitUndEreignis(definition("dfs"), patient);

    expect(ergebnis.followupDate?.toISOString().slice(0, 10)).toBe("2020-07-01");
  });

  it("zensiert bei krankheitsfreiem Überleben ohne Ereignis", () => {
    const patient = {
      id: "1",
      survivalTime: 60,
      event: true,
      diagnosisDate: "2020-01-01",
      nachsorgeDatum: "2023-01-01",
    } as unknown as Patient;

    expect(zeitUndEreignis(definition("dfs"), patient).event).toBe(false);
  });

  // Ein gesperrter Endpunkt darf nie rechnen. Fällt er trotzdem hierher,
  // liefert er einen negativen Sentinelwert statt einer erfundenen Kurve.
  // Negativ, nicht null: eine echte Zensierung ohne bekanntes Datum liefert
  // bei den fünf allgemeinen Regeln ebenfalls die Zeit null, gehört aber in
  // die Kohorte, siehe kohorteFuerEndpunkt.
  it("liefert für einen Endpunkt ohne Regel eine negative Zeit", () => {
    const gesperrt = { ...definition("oas"), regel: null };
    const patient = { id: "1", survivalTime: 42, event: true } as unknown as Patient;

    expect(zeitUndEreignis(gesperrt, patient)).toEqual({
      survivalTime: -1,
      event: false,
      followupDate: null,
      zeitEinheit: "monate",
      konkurrenz: false,
    });
  });
});

describe("Endpunkt auf die Kohorte anwenden", () => {
  const MIT_REZIDIV = {
    id: "1",
    survivalTime: 60,
    event: false,
    diagnosisDate: "2020-01-01",
    rezidivDatum: "2020-07-01",
  } as unknown as Patient;

  // Beim Gesamtüberleben stehen Zeit und Ereignis schon am Fall. Die Kohorte
  // bleibt deshalb unangetastet, auch in ihrer Länge: alles andere wäre eine
  // stille Änderung des Regelfalls.
  it("gibt die Kohorte beim Gesamtüberleben unverändert zurück", () => {
    const ohneZeit = { id: "2", survivalTime: 0, event: false } as unknown as Patient;
    const kohorte = [MIT_REZIDIV, ohneZeit];

    expect(kohorteFuerEndpunkt(definition("oas"), kohorte)).toBe(kohorte);
  });

  it("gibt die Kohorte ohne bekannte Definition unverändert zurück", () => {
    const kohorte = [MIT_REZIDIV];

    expect(kohorteFuerEndpunkt(undefined, kohorte)).toBe(kohorte);
  });

  it("setzt Zeit und Ereignis jedes Falls auf den Endpunkt", () => {
    const [fall] = kohorteFuerEndpunkt(definition("dfs"), [MIT_REZIDIV]);

    expect(fall.event).toBe(true);
    expect(fall.survivalTime).toBeCloseTo(5.98, 1);
  });

  // Der Einschluss gilt nur für das krankheitsfreie Überleben und nur für
  // Quellen, die sich ausdrücklich äußern.
  it("schließt beim krankheitsfreien Überleben nicht auswertbare Fälle aus", () => {
    const nichtTumorfrei = { ...MIT_REZIDIV, id: "3", dfsEligible: false } as unknown as Patient;

    const kohorte = kohorteFuerEndpunkt(definition("dfs"), [MIT_REZIDIV, nichtTumorfrei]);

    expect(kohorte.map((patient) => patient.id)).toEqual(["1"]);
  });

  it("verwirft Fälle, für die der Endpunkt keine Zeit ergibt", () => {
    const ohneDaten = { id: "4", survivalTime: 60, event: false } as unknown as Patient;

    expect(kohorteFuerEndpunkt(definition("dfs"), [ohneDaten])).toHaveLength(0);
  });
});
