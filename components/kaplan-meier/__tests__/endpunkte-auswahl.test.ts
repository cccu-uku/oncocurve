import { describe, expect, it } from "vitest";
import type { Patient } from "../obds-parser-new";
import { gepruefterEndpunkt } from "../endpunkte/auswahl";

const BASIS = { id: "1", survivalTime: 12, event: false } as unknown as Patient;
const MIT_REZIDIV = { ...BASIS, rezidivDatum: "2021-05-01" } as unknown as Patient;
const MIT_THERAPIE = {
  ...BASIS,
  endpoint: "ttft",
  firstTreatmentDate: "2020-03-01",
} as unknown as Patient;
const ONCOBOX = { ...BASIS, oncoBox: { boxType: "brust" } } as unknown as Patient;
const THERAPIE_UND_REZIDIV = {
  ...MIT_THERAPIE,
  rezidivDatum: "2021-05-01",
} as unknown as Patient;

describe("Gespeicherten Endpunkt gegen die Kohorte prüfen", () => {
  // Eine bewusste Auswahl des Anwenders muss die Sitzung überleben. Der
  // Rückfall darf nur greifen, wenn der Wert unbrauchbar ist.
  it("behält eine gültige gespeicherte Auswahl", () => {
    expect(gepruefterEndpunkt("dfs", [MIT_REZIDIV], null)).toBe("dfs");
  });

  it("verwirft einen Wert, den die Registry nicht kennt", () => {
    expect(gepruefterEndpunkt("krebsfrei", [MIT_REZIDIV], null)).toBe("oas");
  });

  it("verwirft einen Wert, der kein Endpunktschlüssel ist", () => {
    expect(gepruefterEndpunkt(null, [BASIS], null)).toBe("oas");
    expect(gepruefterEndpunkt(17, [BASIS], null)).toBe("oas");
  });

  // Der Fall aus dem Review: oBDS laden, DFS wählen, dann eine CSV ohne
  // Ereignisdaten laden. Ohne Prüfung rechnete die Seite weiter DFS und der
  // Plot blieb ohne Begründung leer.
  it("verwirft einen Endpunkt, den die neue Kohorte nicht hergibt", () => {
    expect(gepruefterEndpunkt("dfs", [BASIS], null)).toBe("oas");
  });

  // Der zweite Fall: freie Analyse mit TTFT, dann eine OncoBox-Datei. Im
  // Zertifizierungsmodus steht TTFT nicht zur Wahl, kein Radio wäre markiert.
  it("verwirft einen Endpunkt, den der Zentrumstyp nicht führt", () => {
    expect(gepruefterEndpunkt("ttft", [ONCOBOX], "BZ")).toBe("oas");
  });

  it("nimmt ohne gespeicherten Wert die Vorwahl der Kohorte", () => {
    expect(gepruefterEndpunkt(null, [MIT_THERAPIE], null)).toBe("ttft");
  });

  it("fällt bei leerer Kohorte auf das Gesamtüberleben zurück", () => {
    expect(gepruefterEndpunkt("dfs", [], null)).toBe("oas");
  });

  // Der Rückfall darf nicht blind aufs Gesamtüberleben zeigen. Eine CSV mit
  // Behandlungsdatumsspalte sperrt genau dieses, und im Zertifizierungsmodus
  // steht der Ersatz TTFT nicht in der Liste des Zentrumstyps. Zurückgegeben
  // gehört der erste Endpunkt, den die Kohorte wirklich hergibt: inzwischen
  // trägt auch die Lokalrezidivrate eine Regel und steht für BZ vor DFS.
  it("überspringt ein gesperrtes Gesamtüberleben beim Rückfall", () => {
    expect(gepruefterEndpunkt("ttft", [THERAPIE_UND_REZIDIV], "BZ")).toBe("lrr");
  });

  // Gibt die Kohorte gar nichts her, bleibt das Gesamtüberleben stehen. Die
  // Oberfläche sperrt dann jedes Radio und nennt den Grund; jede andere Wahl
  // wäre genauso gesperrt und erklärte weniger.
  it("bleibt beim Gesamtüberleben, wenn kein Endpunkt wählbar ist", () => {
    expect(gepruefterEndpunkt("ttft", [MIT_THERAPIE], "BZ")).toBe("oas");
  });
});
