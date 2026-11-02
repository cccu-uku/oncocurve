import { describe, it, expect } from "vitest";
import de from "@/locales/de.json";
import en from "@/locales/en.json";

/**
 * next-intl throws at render time when a key is missing from the active
 * locale, and it is easy to add a label to one catalogue and forget the
 * other. This pins both.
 */
describe("PlotDisplay translations", () => {
  it("labels the zero-event warning toggle in German", () => {
    expect(de.PlotDisplay.zeroEventWarningToggle).toBe(
      "Warnhinweis zu zensierten Gruppen anzeigen",
    );
  });

  it("labels the zero-event warning toggle in English", () => {
    expect(en.PlotDisplay.zeroEventWarningToggle).toBe(
      "Show censored-group warning",
    );
  });

  it("labels the x-axis-in-days toggle in German", () => {
    expect(de.PlotDisplay.xAxisInDays).toBe("x-Achse in Tagen (statt Monate)");
  });

  it("labels the x-axis-in-days toggle in English", () => {
    expect(en.PlotDisplay.xAxisInDays).toBe("X-axis in days (instead of months)");
  });

  it("beschriftet den Screenshot-Modus in beiden Sprachen", () => {
    expect(de.PlotDisplay.screenshotMode).toBe("Screenshot-Modus (große Schrift)");
    expect(en.PlotDisplay.screenshotMode).toBe("Screenshot mode (large text)");
  });
});
