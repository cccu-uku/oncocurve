import { describe, it, expect } from "vitest";
import {
  STEP_REGISTRY,
  TOUR_PLAYLISTS,
  playlistFor,
  resolveStep,
  normalizeVariant,
} from "@/components/guided-tour-steps";

describe("guided tour engine", () => {
  it("quick playlist starts at the upload area, then test data", () => {
    expect(TOUR_PLAYLISTS.quick).toEqual([
      "upload", "testdata", "strat", "km-chart", "cox", "quick-export",
    ]);
  });

  it("full playlist has 16 steps", () => {
    expect(TOUR_PLAYLISTS.full).toHaveLength(16);
  });

  it("full playlist follows the sidebar order: filters, then stratification, then plot display", () => {
    expect(TOUR_PLAYLISTS.full).toEqual([
      "upload", "testdata", "anomalies", "filters", "strat", "plot", "km-chart",
      "cohort", "table", "cox", "figures", "export", "lang", "theme", "helpicon",
      "help",
    ]);
  });

  it("every id in every playlist exists in the registry", () => {
    for (const ids of Object.values(TOUR_PLAYLISTS)) {
      for (const id of ids) {
        expect(STEP_REGISTRY[id], `missing registry entry: ${id}`).toBeDefined();
      }
    }
  });

  it("resolveStep returns the right step, or null out of range", () => {
    expect(resolveStep("quick", 0)?.id).toBe("upload");
    expect(resolveStep("quick", 5)?.id).toBe("quick-export");
    expect(resolveStep("quick", 6)).toBeNull();
    expect(resolveStep("quick", -1)).toBeNull();
    expect(resolveStep("full", 0)?.id).toBe("upload");
    expect(resolveStep("full", 15)?.id).toBe("help");
  });

  it("normalizeVariant defaults to full for anything but 'quick'", () => {
    expect(normalizeVariant("quick")).toBe("quick");
    expect(normalizeVariant("full")).toBe("full");
    expect(normalizeVariant(null)).toBe("full");
    expect(normalizeVariant("garbage")).toBe("full");
  });

  it("playlistFor maps ids to defs in order", () => {
    expect(playlistFor("quick").map(s => s.id)).toEqual(TOUR_PLAYLISTS.quick);
  });
});
