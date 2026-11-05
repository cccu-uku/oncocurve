import { describe, it, expect } from "vitest";
import { getAgeGroup } from "../age-group";

describe("getAgeGroup", () => {
  it("buckets 1-17 as child", () => {
    expect(getAgeGroup(1)).toBe("child");
    expect(getAgeGroup(17)).toBe("child");
  });

  it("buckets 18-64 as adult", () => {
    expect(getAgeGroup(18)).toBe("adult");
    expect(getAgeGroup(64)).toBe("adult");
  });

  it("buckets 65+ as senior", () => {
    expect(getAgeGroup(65)).toBe("senior");
    expect(getAgeGroup(100)).toBe("senior");
  });

  it("treats 0, negative, NaN as unknown (the parsers' sentinel for missing age)", () => {
    expect(getAgeGroup(0)).toBe("unknown");
    expect(getAgeGroup(-1)).toBe("unknown");
    expect(getAgeGroup(NaN)).toBe("unknown");
  });
});
