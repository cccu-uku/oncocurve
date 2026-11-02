import { describe, expect, it } from "vitest";
import { boxRegelFuer } from "../endpunkte/boxregeln";
import { ENDPUNKTE } from "../endpunkte/registry";
import type { EndpunktId } from "../endpunkte/typen";

const BOXEN = ["brust-1", "darm-1", "prostata-1", "family-2"];

function alleBoxregeln(): { box: string; id: EndpunktId; regel: NonNullable<ReturnType<typeof boxRegelFuer>> }[] {
  const treffer = [];
  for (const box of BOXEN) {
    for (const endpunkt of ENDPUNKTE) {
      const regel = boxRegelFuer(box, endpunkt.id);
      if (regel) treffer.push({ box, id: endpunkt.id, regel });
    }
  }
  return treffer;
}

describe("Jede Boxregel ist belegt", () => {
  // Die Hilfeseite zeigt Quelle und Herkunft je Regel an. Eine Regel ohne
  // Angabe erschiene dort als leere Zeile, und niemand könnte nachschlagen,
  // woher die Kurve kommt.
  it("nennt für jede Regel eine Quelle und eine Herkunft", () => {
    const regeln = alleBoxregeln();
    expect(regeln.length).toBeGreaterThanOrEqual(24);
    for (const { box, id, regel } of regeln) {
      expect(regel.quelle, `${box}/${id}`).not.toBe("");
      expect(["spezifikation", "abgeleitet", "literatur"]).toContain(regel.herkunft);
      expect(regel.id).toBe(`${box}/${id}`);
    }
  });

  // Die Kennzeichnung ist der Kern der Sache: DFS und OAS stehen wörtlich in
  // den 1.0-Blättern, die übrigen fünf nicht, und die 2.0-Boxen schreiben
  // gar keine Kurve vor. Wer das gleich beschriftet, behauptet zu viel.
  it("unterscheidet Vorschrift, Ableitung und Literatur", () => {
    expect(boxRegelFuer("brust-1", "dfs")!.herkunft).toBe("spezifikation");
    expect(boxRegelFuer("darm-1", "oas")!.herkunft).toBe("spezifikation");
    expect(boxRegelFuer("prostata-1", "dfs")!.herkunft).toBe("spezifikation");
    expect(boxRegelFuer("family-2", "dfs")!.herkunft).toBe("abgeleitet");
    expect(boxRegelFuer("brust-1", "lrr")!.herkunft).toBe("literatur");
  });

  it("begrenzt allein Darm den Beobachtungszeitraum", () => {
    expect(boxRegelFuer("brust-1", "dfs")!.beobachtungsfensterTage).toBeNull();
    expect(boxRegelFuer("prostata-1", "dfs")!.beobachtungsfensterTage).toBeNull();
    expect(boxRegelFuer("family-2", "dfs")!.beobachtungsfensterTage).toBeNull();
    expect(boxRegelFuer("darm-1", "dfs")!.beobachtungsfensterTage).toBe(1826);
  });

  it("nutzt allein die Lokalrezidivrate die kumulative Inzidenz", () => {
    for (const { id, regel } of alleBoxregeln()) {
      expect(regel.schaetzer).toBe(id === "lrr" ? "kumulativeInzidenz" : "kaplanMeier");
    }
  });
});
