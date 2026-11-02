import { describe, expect, it } from "vitest";
import type { Patient } from "../obds-parser-new";
import { vorgewaehlterEndpunkt } from "../endpunkte/vorwahl";

describe("Vorwahl des Endpunkts aus der Kohorte", () => {
  it("wählt Gesamtüberleben als Voreinstellung", () => {
    const patient = { id: "1", survivalTime: 10, event: false } as unknown as Patient;

    expect(vorgewaehlterEndpunkt([patient])).toBe("oas");
  });

  // Der Parser markiert einen Datensatz mit Behandlungsdatumsspalte. Die
  // Markierung wählt vor, sie erzwingt nichts: umschalten muss möglich
  // bleiben, was mit dem alten isTTFT nicht ging.
  it("wählt die Zeit bis zur Ersttherapie bei markiertem Datensatz vor", () => {
    const patient = { id: "1", endpoint: "ttft" } as unknown as Patient;

    expect(vorgewaehlterEndpunkt([patient])).toBe("ttft");
  });

  it("wählt Gesamtüberleben bei leerer Kohorte", () => {
    expect(vorgewaehlterEndpunkt([])).toBe("oas");
  });
});
