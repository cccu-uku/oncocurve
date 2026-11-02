/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadExclusions,
  saveExclusions,
  computeDatasetHash,
  exclusionsKey,
} from "../anomaly-exclusions";

beforeEach(() => sessionStorage.clear());

describe("exclusionsKey", () => {
  it("namespaces by dataset hash", () => {
    expect(exclusionsKey("abc123")).toBe("kma-anomaly-exclusions:abc123");
  });
});

describe("computeDatasetHash", () => {
  it("returns a stable string for the same metadata", () => {
    const h1 = computeDatasetHash("file.csv", 1234, "2026-05-10T12:00:00Z");
    const h2 = computeDatasetHash("file.csv", 1234, "2026-05-10T12:00:00Z");
    expect(h1).toBe(h2);
  });
  it("differs for different files", () => {
    const h1 = computeDatasetHash("a.csv", 1, "t");
    const h2 = computeDatasetHash("b.csv", 1, "t");
    expect(h1).not.toBe(h2);
  });
});

describe("load/save round-trip", () => {
  it("persists and rehydrates a Set<string>", () => {
    saveExclusions("h1", new Set(["A", "B"]));
    const loaded = loadExclusions("h1");
    expect(loaded.has("A")).toBe(true);
    expect(loaded.has("B")).toBe(true);
    expect(loaded.size).toBe(2);
  });
  it("returns empty set when nothing stored", () => {
    expect(loadExclusions("nothing").size).toBe(0);
  });
});
