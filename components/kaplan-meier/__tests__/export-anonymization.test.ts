import { describe, it, expect } from "vitest";
import {
  MAX_SHIFT_DAYS,
  dateOffsetDaysFor,
  shiftDate,
  pseudonymFor,
  pseudonymizeTableRows,
  type RawPatientDates,
} from "../export-anonymization";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS);

describe("dateOffsetDaysFor", () => {
  it("is deterministic — the same id always yields the same offset", () => {
    for (const id of ["PAT-1", "abc", "0", "ÄÖÜ-42"]) {
      expect(dateOffsetDaysFor(id)).toBe(dateOffsetDaysFor(id));
    }
  });

  it("always stays within [-MAX_SHIFT_DAYS, +MAX_SHIFT_DAYS]", () => {
    for (let i = 0; i < 5000; i++) {
      const off = dateOffsetDaysFor(`PAT-${i}`);
      expect(off).toBeGreaterThanOrEqual(-MAX_SHIFT_DAYS);
      expect(off).toBeLessThanOrEqual(MAX_SHIFT_DAYS);
    }
  });

  it("spreads across the range — no single value dominates", () => {
    // Collisions are unavoidable (57 possible offsets), so we assert spread,
    // not uniqueness.
    const counts = new Map<number, number>();
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const off = dateOffsetDaysFor(`PAT-${i}`);
      counts.set(off, (counts.get(off) ?? 0) + 1);
    }
    expect(counts.size).toBeGreaterThan(30);
    expect(Math.max(...counts.values())).toBeLessThan(n * 0.15);
  });
});

describe("shiftDate", () => {
  it("returns null for null input", () => {
    expect(shiftDate(null, 5)).toBeNull();
  });

  it("shifts by the given number of days, across month boundaries", () => {
    const out = shiftDate(new Date(2020, 0, 30), 5); // 30.01.2020 + 5
    expect(out!.getFullYear()).toBe(2020);
    expect(out!.getMonth()).toBe(1); // Februar
    expect(out!.getDate()).toBe(4);
  });

  it("does not mutate the input date", () => {
    const input = new Date(2020, 0, 30);
    const copy = new Date(input.getTime());
    shiftDate(input, 10);
    expect(input.getTime()).toBe(copy.getTime());
  });
});

describe("pseudonymFor", () => {
  it("is 1-based and zero-padded to four digits", () => {
    expect(pseudonymFor(0)).toBe("P0001");
    expect(pseudonymFor(41)).toBe("P0042");
    expect(pseudonymFor(9999)).toBe("P10000");
  });
});

describe("pseudonymizeTableRows", () => {
  const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  const rows = [
    { patientId: "REAL-A", diagnosisDate: "2020-01-03", vitalDate: "2022-01-03", months: 24 },
    { patientId: "REAL-B", diagnosisDate: "2019-06-10", vitalDate: "2020-06-10", months: 12 },
  ];
  const raw = new Map<string, RawPatientDates>([
    ["REAL-A", { diagnosis: new Date(2020, 0, 3), vital: new Date(2022, 0, 3) }],
    ["REAL-B", { diagnosis: new Date(2019, 5, 10), vital: new Date(2020, 5, 10) }],
  ]);

  it("replaces every real id with a sequential pseudonym", () => {
    const out = pseudonymizeTableRows(rows, raw, fmt);
    expect(out.map(r => r.patientId)).toEqual(["P0001", "P0002"]);
    expect(JSON.stringify(out)).not.toContain("REAL-A");
    expect(JSON.stringify(out)).not.toContain("REAL-B");
  });

  it("shifts BOTH dates of a patient by the same amount, preserving the interval", () => {
    const out = pseudonymizeTableRows(rows, raw, fmt);
    for (const [i, id] of ["REAL-A", "REAL-B"].entries()) {
      const before = raw.get(id)!;
      const originalSpan = daysBetween(before.diagnosis!, before.vital!);
      const shiftedSpan = daysBetween(new Date(out[i].diagnosisDate), new Date(out[i].vitalDate));
      expect(shiftedSpan).toBe(originalSpan);
    }
  });

  it("actually moves the dates", () => {
    // At least one of the two rows must differ; an offset of 0 is possible per
    // patient but both being 0 would mean the transform did nothing.
    const out = pseudonymizeTableRows(rows, raw, fmt);
    const unchanged = out.every((r, i) => r.diagnosisDate === rows[i].diagnosisDate);
    expect(unchanged).toBe(false);
  });

  it("leaves non-date columns untouched", () => {
    const out = pseudonymizeTableRows(rows, raw, fmt);
    expect(out.map(r => r.months)).toEqual([24, 12]);
  });

  it("does not mutate the input rows", () => {
    const snapshot = JSON.stringify(rows);
    pseudonymizeTableRows(rows, raw, fmt);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  it("handles patients missing from the lookup and null dates without throwing", () => {
    const orphan = [{ patientId: "GONE", diagnosisDate: "x", vitalDate: "y", months: 1 }];
    const emptyRaw = new Map<string, RawPatientDates>([
      ["GONE", { diagnosis: null, vital: null }],
    ]);
    expect(() => pseudonymizeTableRows(orphan, emptyRaw, fmt)).not.toThrow();
    expect(() => pseudonymizeTableRows(orphan, new Map(), fmt)).not.toThrow();
    const out = pseudonymizeTableRows(orphan, emptyRaw, fmt);
    expect(out[0].patientId).toBe("P0001");
    expect(out[0].diagnosisDate).toBe("");
  });
});
