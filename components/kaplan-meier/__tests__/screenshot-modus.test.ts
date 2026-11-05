import { afterEach, describe, expect, it, vi } from "vitest";
import { plotSchrift, wendeScreenshotModusAn } from "../screenshot-modus";

describe("plotSchrift", () => {
  it("lässt die Schrift ohne Screenshot-Modus unverändert", () => {
    expect(plotSchrift(12, false)).toEqual({ size: 12, weight: 400 });
  });

  it("macht die Schrift im Screenshot-Modus größer und kräftiger", () => {
    const schrift = plotSchrift(12, true);
    expect(schrift.size).toBeGreaterThanOrEqual(16);
    expect(Number.isInteger(schrift.size)).toBe(true);
    expect(schrift.weight).toBeGreaterThan(400);
  });
});

describe("wendeScreenshotModusAn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("setzt und entfernt die Markierung am Dokument", () => {
    const attribute = new Set<string>();
    vi.stubGlobal("document", {
      documentElement: {
        toggleAttribute: (name: string, an: boolean): void => {
          if (an) attribute.add(name);
          else attribute.delete(name);
        },
      },
    });

    wendeScreenshotModusAn(true);
    expect(attribute.has("data-screenshot")).toBe(true);

    wendeScreenshotModusAn(false);
    expect(attribute.has("data-screenshot")).toBe(false);
  });
});
