import { describe, it, expect } from "vitest";
import { xlsxCellToString } from "../parse-rows";

describe("xlsxCellToString", () => {
  it("formats a Date cell as DD.MM.YYYY (parseable by parseDate)", () => {
    expect(xlsxCellToString(new Date(2022, 2, 11))).toBe("11.03.2022");
    expect(xlsxCellToString(new Date(2026, 0, 5))).toBe("05.01.2026");
  });

  it("passes through primitives", () => {
    expect(xlsxCellToString("cT4")).toBe("cT4");
    expect(xlsxCellToString(42)).toBe("42");
    expect(xlsxCellToString(true)).toBe("true");
  });

  it("maps null/undefined to empty string", () => {
    expect(xlsxCellToString(null)).toBe("");
    expect(xlsxCellToString(undefined)).toBe("");
  });

  it("unwraps a hyperlink cell to its display text", () => {
    expect(xlsxCellToString({ text: "cT4", hyperlink: "https://example.com" })).toBe("cT4");
  });

  it("unwraps a rich-text cell by concatenating fragments", () => {
    expect(xlsxCellToString({ richText: [{ text: "c" }, { text: "T4" }] })).toBe("cT4");
  });

  it("unwraps a formula cell's result, including a Date result", () => {
    expect(xlsxCellToString({ formula: "=A1", result: "cT4" })).toBe("cT4");
    expect(xlsxCellToString({ formula: "=A1", result: new Date(2022, 2, 11) })).toBe("11.03.2022");
    expect(xlsxCellToString({ sharedFormula: "A1", result: 42 })).toBe("42");
  });

  it("maps an error cell to empty string", () => {
    expect(xlsxCellToString({ error: "#N/A" })).toBe("");
  });
});
