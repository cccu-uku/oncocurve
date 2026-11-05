import { describe, it, expect } from "vitest";
import { parseCSV } from "../csv-parser";

// Regression test: toISODateString() previously converted a locally-
// constructed Date via .toISOString() (always UTC), shifting the stored
// diagnosisDate back by one day in any timezone ahead of UTC (e.g. Germany/
// Austria, UTC+1/+2) — 01.01.2020 silently became "2019-12-31". This must
// hold regardless of the machine's local timezone running the test.
describe("diagnosisDate survives ISO conversion without a timezone-induced day shift", () => {
  it("keeps 01.01.2020 (German format) as 2020-01-01", () => {
    const csv = "id,diagnosisDate,survivalTime,event\n1,01.01.2020,12,1\n";
    const result = parseCSV(csv);
    expect(result.patients[0].diagnosisDate).toBe("2020-01-01");
  });

  it("keeps 2020-01-01 (ISO format) as 2020-01-01", () => {
    const csv = "id,diagnosisDate,survivalTime,event\n1,2020-01-01,12,1\n";
    const result = parseCSV(csv);
    expect(result.patients[0].diagnosisDate).toBe("2020-01-01");
  });

  it("keeps 31.12.2019 as 2019-12-31 (no forward shift either)", () => {
    const csv = "id,diagnosisDate,survivalTime,event\n1,31.12.2019,12,1\n";
    const result = parseCSV(csv);
    expect(result.patients[0].diagnosisDate).toBe("2019-12-31");
  });
});
