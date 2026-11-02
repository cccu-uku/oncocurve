import { describe, it, expect } from "vitest";
import { verlinke } from "../verlinke";

const links = (zeile: string) => verlinke(zeile).filter((t) => t.href !== undefined);
const text = (zeile: string) => verlinke(zeile).map((t) => t.text).join("");

describe("verlinke", () => {
  it("lässt reinen Text unverändert", () => {
    expect(verlinke("Universitätsklinikum Ulm, 89070 Ulm")).toEqual([
      { text: "Universitätsklinikum Ulm, 89070 Ulm" },
    ]);
  });

  it("verlinkt https-Adressen", () => {
    const zeile = "Web: https://www.uniklinik-ulm.de/x.html";
    expect(links(zeile)).toEqual([
      { text: "https://www.uniklinik-ulm.de/x.html", href: "https://www.uniklinik-ulm.de/x.html" },
    ]);
    expect(text(zeile)).toBe(zeile);
  });

  it("ergänzt https bei www-Adressen", () => {
    expect(links("www.ccc-onconnect.de")).toEqual([
      { text: "www.ccc-onconnect.de", href: "https://www.ccc-onconnect.de" },
    ]);
  });

  it("verlinkt E-Mail-Adressen mit mailto", () => {
    expect(links("E-Mail: service.cccu@uniklinik-ulm.de")).toEqual([
      { text: "service.cccu@uniklinik-ulm.de", href: "mailto:service.cccu@uniklinik-ulm.de" },
    ]);
  });

  it("nimmt Klammer und Punkt nach der Adresse nicht in den Link", () => {
    const zeile = "Patientenvertretungen (www.ccc-onconnect.de).";
    expect(links(zeile)).toEqual([
      { text: "www.ccc-onconnect.de", href: "https://www.ccc-onconnect.de" },
    ]);
    expect(text(zeile)).toBe(zeile);
  });

  it("verlinkt keine javascript-Adressen", () => {
    expect(links("javascript:alert(1)")).toEqual([]);
    expect(text("javascript:alert(1)")).toBe("javascript:alert(1)");
  });

  it("verlinkt keine unvollständigen Adressen", () => {
    expect(links("https:// und www. und @ und a@b")).toEqual([]);
  });
});
