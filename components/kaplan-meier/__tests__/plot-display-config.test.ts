import { describe, it, expect, afterEach, vi } from "vitest";
import {
  DEFAULT_PLOT_DISPLAY,
  PLOT_DISPLAY_STORAGE_KEY,
  loadPlotDisplay,
  savePlotDisplay,
} from "@/components/kaplan-meier/plot-display-config";

/**
 * The module guards on `typeof window === "undefined"` and then talks to the
 * global `sessionStorage`. The vitest environment is "node", so both globals
 * have to be stubbed in for the persistence paths to run at all.
 */
function fakeSessionStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
  };
}

describe("plot display config", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the zero-event warning by default", () => {
    expect(DEFAULT_PLOT_DISPLAY.showZeroEventWarning).toBe(true);
  });

  it("defaults the x-axis to months, not days", () => {
    expect(DEFAULT_PLOT_DISPLAY.showXAxisInDays).toBe(false);
  });

  it("keeps the warning visible for sessions stored before the toggle existed", () => {
    const storage = fakeSessionStorage();
    storage.setItem(
      PLOT_DISPLAY_STORAGE_KEY,
      JSON.stringify({ showMedianLines: false }),
    );
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", storage);

    const cfg = loadPlotDisplay();

    expect(cfg.showMedianLines).toBe(false);
    expect(cfg.showZeroEventWarning).toBe(true);
  });

  it("round-trips a disabled warning through sessionStorage", () => {
    const storage = fakeSessionStorage();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", storage);

    savePlotDisplay({ ...DEFAULT_PLOT_DISPLAY, showZeroEventWarning: false });

    expect(loadPlotDisplay().showZeroEventWarning).toBe(false);
  });

  it("startet ohne Screenshot-Modus", () => {
    expect(DEFAULT_PLOT_DISPLAY.screenshotMode).toBe(false);
  });

  it("merkt sich den Screenshot-Modus über sessionStorage", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", fakeSessionStorage());

    savePlotDisplay({ ...DEFAULT_PLOT_DISPLAY, screenshotMode: true });

    expect(loadPlotDisplay().screenshotMode).toBe(true);
  });
});
