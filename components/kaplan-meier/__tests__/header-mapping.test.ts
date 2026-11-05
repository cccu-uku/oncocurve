import { describe, it, expect } from "vitest";
import { mapHeader } from "../parse-rows";

describe("mapHeader: bare 'G' column maps to gender, not grading", () => {
  it("maps a bare 'G' header to gender", () => {
    expect(mapHeader("G")).toBe("gender");
    expect(mapHeader("g")).toBe("gender");
  });

  it("still maps the full words to grading", () => {
    expect(mapHeader("Grading")).toBe("grading");
    expect(mapHeader("Grade")).toBe("grading");
  });
});
