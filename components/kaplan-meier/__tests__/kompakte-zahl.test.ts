import { describe, it, expect } from "vitest";
import { kompakteZahl } from "../kompakte-zahl";

describe("kompakteZahl", () => {
  it("schreibt gewöhnliche Werte mit zwei Nachkommastellen aus", () => {
    expect(kompakteZahl(1)).toBe("1.00");
    expect(kompakteZahl(0.6789)).toBe("0.68");
    expect(kompakteZahl(999.994)).toBe("999.99");
  });

  it("kürzt sehr grosse Werte, die die Spalte sprengen würden", () => {
    expect(kompakteZahl(4554813973.59)).toBe("4.6e+9");
    expect(kompakteZahl(1000)).toBe("1.0e+3");
  });

  it("kürzt sehr kleine Werte statt sie auf 0.00 zu runden", () => {
    // 0.00 sähe aus wie ein echter Wert von null.
    expect(kompakteZahl(0.0001)).toBe("1.0e-4");
    expect(kompakteZahl(0.01)).toBe("0.01");
  });

  it("behält die Null als Null", () => {
    expect(kompakteZahl(0)).toBe("0.00");
  });

  it("benennt Unendlich und keine Zahl, statt sie auszuschreiben", () => {
    expect(kompakteZahl(Infinity)).toBe("\u221e");
    expect(kompakteZahl(-Infinity)).toBe("-\u221e");
    expect(kompakteZahl(NaN)).toBe("n/a");
  });
});
