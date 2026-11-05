import { describe, it, expect } from "vitest";
import { normalizeTOneDigit, normalizeTTwoDigit, T_UNKNOWN } from "../tnm-normalize";

// Prefixes seen in registry exports: none, clinical (c), pathological (p),
// post-neoadjuvant (y), recurrence (r), and combinations.
const PREFIXES = ["", "c", "p", "yc", "yp", "rc", "rp"];
const MAIN = ["0", "1", "2", "3", "4", "IS", "X"];
const SUBS = ["", "a", "b", "c"];

describe("normalizeTOneDigit — every main category collapses regardless of prefix/sub", () => {
  it.each(MAIN)("T%s* -> T%s for all prefixes and sub-categories", (main) => {
    for (const pre of PREFIXES) {
      for (const sub of SUBS) {
        // e.g. "ypT3c", "cT2", "TIS"
        expect(normalizeTOneDigit(`${pre}T${main}${sub}`)).toBe(`T${main}`);
      }
    }
  });

  it.each([["", T_UNKNOWN], [null, T_UNKNOWN], ["N2", T_UNKNOWN], ["unknown", T_UNKNOWN]])(
    "%s -> Keine Angabe",
    (input, expected) => {
      expect(normalizeTOneDigit(input as string | null)).toBe(expected);
    },
  );
});

describe("normalizeTTwoDigit — keeps the sub-category, drops the prefix", () => {
  it.each(MAIN)("keeps sub-category for T%s", (main) => {
    for (const pre of PREFIXES) {
      expect(normalizeTTwoDigit(`${pre}T${main}`)).toBe(`T${main}`);
      expect(normalizeTTwoDigit(`${pre}T${main}a`)).toBe(`T${main}A`);
    }
  });

  it("maps empty / unrecognised to Keine Angabe", () => {
    expect(normalizeTTwoDigit("")).toBe(T_UNKNOWN);
    expect(normalizeTTwoDigit("foo")).toBe(T_UNKNOWN);
  });
});

describe("kind: field decides the kind, opposite prefix is excluded, labels carry the prefix", () => {
  it("clinical keeps cT* and bare T* (from a clinical column), labelled cT…", () => {
    expect(normalizeTOneDigit("cT4", "clinical")).toBe("cT4");
    expect(normalizeTTwoDigit("cT1a", "clinical")).toBe("cT1A");
    expect(normalizeTOneDigit("ycT3", "clinical")).toBe("cT3"); // y/r dropped from label
    // bare value in a clinical column -> belongs to clinical, gets the c label
    expect(normalizeTOneDigit("T4", "clinical")).toBe("cT4");
    expect(normalizeTTwoDigit("T1a", "clinical")).toBe("cT1A");
    // opposite prefix (pT in a clinical field) -> excluded (not "Keine Angabe")
    expect(normalizeTOneDigit("pT4", "clinical")).toBeNull();
    expect(normalizeTTwoDigit("pT4a", "clinical")).toBeNull();
    expect(normalizeTOneDigit("", "clinical")).toBeNull();
  });

  it("pathological keeps pT* and bare T* (from a pathological column), labelled pT…", () => {
    expect(normalizeTOneDigit("pT2", "pathological")).toBe("pT2");
    expect(normalizeTOneDigit("pTX", "pathological")).toBe("pTX");
    expect(normalizeTTwoDigit("pT2b", "pathological")).toBe("pT2B");
    expect(normalizeTOneDigit("T2", "pathological")).toBe("pT2"); // bare -> pT label
    // opposite prefix (cT in a pathological field) -> excluded
    expect(normalizeTOneDigit("cT2", "pathological")).toBeNull();
    expect(normalizeTTwoDigit("cT2b", "pathological")).toBeNull();
  });

  it("Tis and TX are preserved as their own categories (with prefix under kind)", () => {
    expect(normalizeTOneDigit("Tis")).toBe("TIS");
    expect(normalizeTOneDigit("TX")).toBe("TX");
    expect(normalizeTOneDigit("pTis", "pathological")).toBe("pTIS");
    expect(normalizeTOneDigit("cTX", "clinical")).toBe("cTX");
    expect(normalizeTTwoDigit("pTis", "pathological")).toBe("pTIS");
    // opposite prefix still excluded for Tis/TX
    expect(normalizeTOneDigit("cTis", "pathological")).toBeNull();
  });

  it("without kind (general T category) collapses across prefixes", () => {
    expect(normalizeTOneDigit("cT1")).toBe("T1");
    expect(normalizeTOneDigit("pT1")).toBe("T1");
    expect(normalizeTOneDigit("")).toBe(T_UNKNOWN);
  });
});
