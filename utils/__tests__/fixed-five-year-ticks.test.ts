import { describe, it, expect } from "vitest";
import { fixedFiveYearTicks, FIVE_YEAR_TICKS_MONTHS } from "../kaplan-meier";

describe("fixedFiveYearTicks", () => {
  it("reicht bis zur ersten Marke hinter der Kohorte", () => {
    expect(fixedFiveYearTicks(100)).toEqual([0, 60, 120]);
    expect(fixedFiveYearTicks(200)).toEqual([0, 60, 120, 180, 240]);
  });

  it("nimmt eine genau getroffene Marke als letzte", () => {
    expect(fixedFiveYearTicks(120)).toEqual([0, 60, 120]);
  });

  it("hört bei 420 Monaten auf, auch wenn die Kohorte länger läuft", () => {
    expect(fixedFiveYearTicks(1000)).toEqual(FIVE_YEAR_TICKS_MONTHS);
  });

  it("liefert auch bei winziger oder unbrauchbarer Kohorte zwei Marken", () => {
    // Eine einzelne Marke ergäbe eine Achse ohne Ausdehnung.
    expect(fixedFiveYearTicks(0)).toEqual([0, 60]);
    expect(fixedFiveYearTicks(3)).toEqual([0, 60]);
    expect(fixedFiveYearTicks(Number.NaN)).toEqual([0, 60]);
  });

  it("rechnet für eine Tageachse um und rundet auf ganze Tage", () => {
    // 60 Monate zu 30,4375 Tagen sind 1826,25 Tage; an der Achse stünde sonst
    // eine Zahl mit Nachkommastellen.
    expect(fixedFiveYearTicks(4000, "days")).toEqual([0, 1826, 3653, 5479]);
  });

  it("misst die Grenze in Monaten, auch wenn die Achse Tage trägt", () => {
    // 1000 Tage sind knapp 33 Monate, es reicht also bis zur Marke bei 60.
    expect(fixedFiveYearTicks(1000, "days")).toEqual([0, 1826]);
  });
});
