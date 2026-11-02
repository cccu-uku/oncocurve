import { describe, it, expect } from "vitest";
import { deriveTStaging, tnmDesignatorKind } from "../parse-rows";
import { normalizeTOneDigit } from "../tnm-normalize";

describe("tnmDesignatorKind", () => {
  it.each([
    ["p", "pathological"],
    ["pathologisch", "pathological"],
    ["pathological", "pathological"],
    ["c", "clinical"],
    ["clinical", "clinical"],
    ["k", "clinical"],
    ["klinisch", "clinical"],
    ["", null],
    [null, null],
    ["x", null],
  ])("%s -> %s", (input, expected) => {
    expect(tnmDesignatorKind(input as string | null)).toBe(expected);
  });
});

describe("deriveTStaging routes every supported column layout", () => {
  it("dedicated cT and pT columns", () => {
    expect(deriveTStaging({ cT: "cT2", pT: "pT3" })).toEqual({
      tCategory: "pT3", tClinical: "cT2", tPathological: "pT3",
    });
  });

  it("dedicated columns without a prefix in the value", () => {
    const r = deriveTStaging({ cT: "T2", pT: "T3" });
    expect(r.tClinical).toBe("T2");
    expect(r.tPathological).toBe("T3");
    // downstream labelling still adds the prefix
    expect(normalizeTOneDigit(r.tClinical, "clinical")).toBe("cT2");
    expect(normalizeTOneDigit(r.tPathological, "pathological")).toBe("pT3");
  });

  it("shared TNM_T column with the prefix embedded in the value", () => {
    expect(deriveTStaging({ tnm_t: "cT4" })).toEqual({
      tCategory: "cT4", tClinical: "cT4", tPathological: null,
    });
    expect(deriveTStaging({ tnm_t: "pT4" })).toEqual({
      tCategory: "pT4", tClinical: null, tPathological: "pT4",
    });
  });

  it("shared TNM_T column qualified by a separate designator column", () => {
    expect(deriveTStaging({ tnm_t: "T4", tnmType: "pathologisch" })).toEqual({
      tCategory: "pT4", tClinical: null, tPathological: "pT4",
    });
    expect(deriveTStaging({ tnm_t: "T2", tnmType: "klinisch" })).toEqual({
      tCategory: "cT2", tClinical: "cT2", tPathological: null,
    });
  });

  it("setzt Präfix und bloße Ziffer zu einer vollständigen T-Kategorie zusammen", () => {
    expect(deriveTStaging({ tnm_t: "4", tnmType: "c" })).toEqual({
      tCategory: "cT4", tClinical: "cT4", tPathological: null,
    });
    expect(deriveTStaging({ tnm_t: "2a", tnmType: "p" })).toEqual({
      tCategory: "pT2a", tClinical: null, tPathological: "pT2a",
    });
  });

  it("value prefix wins over the designator column", () => {
    expect(deriveTStaging({ tnm_t: "pT4", tnmType: "klinisch" })).toEqual({
      tCategory: "pT4", tClinical: null, tPathological: "pT4",
    });
  });

  it("unprefixed value with no designator only feeds the general bucket", () => {
    expect(deriveTStaging({ tnm_t: "T4" })).toEqual({
      tCategory: "T4", tClinical: null, tPathological: null,
    });
  });

  it("empty row -> all null", () => {
    expect(deriveTStaging({})).toEqual({ tCategory: null, tClinical: null, tPathological: null });
  });
});
