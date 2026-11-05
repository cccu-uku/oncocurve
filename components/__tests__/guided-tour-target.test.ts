// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { placeTooltip, whenElementPresent } from "@/components/guided-tour-target";

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("whenElementPresent", () => {
  it("calls back immediately when the target already exists", () => {
    document.body.innerHTML = '<div data-tour="anomalies"></div>';
    const onFound = vi.fn();
    whenElementPresent('[data-tour="anomalies"]', onFound);
    expect(onFound).toHaveBeenCalledTimes(1);
    expect(onFound.mock.calls[0][0]).toBe(document.querySelector('[data-tour="anomalies"]'));
  });

  it("waits for a target that is rendered later and calls back once", async () => {
    const onFound = vi.fn();
    whenElementPresent('[data-tour="anomalies"]', onFound);
    expect(onFound).not.toHaveBeenCalled();

    const el = document.createElement("div");
    el.setAttribute("data-tour", "anomalies");
    document.body.appendChild(el);
    await flush();
    expect(onFound).toHaveBeenCalledTimes(1);
    expect(onFound.mock.calls[0][0]).toBe(el);

    document.body.appendChild(document.createElement("span"));
    await flush();
    expect(onFound).toHaveBeenCalledTimes(1);
  });

  it("does not call back after cleanup", async () => {
    const onFound = vi.fn();
    const stop = whenElementPresent('[data-tour="anomalies"]', onFound);
    stop();

    const el = document.createElement("div");
    el.setAttribute("data-tour", "anomalies");
    document.body.appendChild(el);
    await flush();
    expect(onFound).not.toHaveBeenCalled();
  });
});

describe("placeTooltip", () => {
  const viewport = { width: 1440, height: 900 };
  const tip = { width: 352, height: 200 };
  const target = (top: number, height: number, left = 400, width = 600) =>
    ({ top, bottom: top + height, left, right: left + width });

  it("places the tooltip below a target when it fits", () => {
    expect(placeTooltip(target(100, 80), tip, viewport).top).toBe(192);
  });

  it("places the tooltip above a target near the bottom", () => {
    expect(placeTooltip(target(600, 200), tip, viewport).top).toBe(388);
  });

  it("keeps the head of a tall target visible by using the bottom edge", () => {
    const { top } = placeTooltip(target(140, 620), tip, viewport);
    expect(top).toBe(688);
    expect(top).toBeGreaterThan(140 + 100);
  });

  it("uses the measured tooltip height", () => {
    expect(placeTooltip(target(600, 200), { width: 352, height: 150 }, viewport).top).toBe(438);
  });

  it("keeps the tooltip horizontally inside the viewport", () => {
    expect(placeTooltip(target(100, 80, 1300, 100), tip, viewport).left).toBe(1440 - 352 - 12);
    expect(placeTooltip(target(100, 80, -50, 100), tip, viewport).left).toBe(12);
  });
});
