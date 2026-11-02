import { describe, it, expect } from "vitest";
import type { Patient } from "../obds-parser-new";
import { LOGIC_RULES } from "../anomaly-rules";

const basePatient: Patient = {
  id: "P1",
  gender: "m",
  age: 50,
  tumorType: "C50",
  tumorCategory: null,
  tumorLocation: "C50",
  diagnosisDate: "2020-01-01",
  survivalTime: 12,
  event: false,
  vitalStatus: true,
  tumorMainCategory: "solid_other" as any,
  tumorSubCategory: null,
  isHematological: false,
  isSolid: true,
  spreadCategory: "unknown" as any,
};

const findRule = (id: string) => LOGIC_RULES.find(r => r.id === id)!;

describe("death_before_diagnosis", () => {
  const rule = findRule("death_before_diagnosis").run as (p: Patient) => any;

  it("flags dead patient with followup before diagnosis", () => {
    const p: Patient = { ...basePatient, vitalStatus: false, event: true,
      diagnosisDate: "2020-06-01", followupDate: new Date("2020-01-01") };
    const issue = rule(p);
    expect(issue?.ruleId).toBe("death_before_diagnosis");
  });

  it("does not flag alive patient even if followup precedes diagnosis", () => {
    const p: Patient = { ...basePatient, vitalStatus: true,
      diagnosisDate: "2020-06-01", followupDate: new Date("2020-01-01") };
    expect(rule(p)).toBeNull();
  });

  it("does not flag dead patient with valid timeline", () => {
    const p: Patient = { ...basePatient, vitalStatus: false, event: true,
      diagnosisDate: "2020-01-01", followupDate: new Date("2020-06-01") };
    expect(rule(p)).toBeNull();
  });

  it("handles followupDate arriving as a string (JSON round-trip) without throwing", () => {
    // After sessionStorage / mock-data API serialisation, followupDate is a string.
    const p = { ...basePatient, vitalStatus: false, event: true,
      diagnosisDate: "2020-06-01", followupDate: "2020-01-01" } as unknown as Patient;
    const issue = rule(p);
    expect(issue?.ruleId).toBe("death_before_diagnosis");
  });
});

describe("diagnosis_in_future", () => {
  const rule = findRule("diagnosis_in_future").run as (p: Patient) => any;
  it("flags future diagnosis", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(rule({ ...basePatient, diagnosisDate: future })?.ruleId).toBe("diagnosis_in_future");
  });
  it("does not flag today", () => {
    expect(rule({ ...basePatient, diagnosisDate: new Date().toISOString() })).toBeNull();
  });
});

describe("negative_survival_time", () => {
  const rule = findRule("negative_survival_time").run as (p: Patient) => any;
  it("flags negative survival", () => {
    expect(rule({ ...basePatient, survivalTime: -1 })?.ruleId).toBe("negative_survival_time");
  });
  it("does not flag zero or positive", () => {
    expect(rule({ ...basePatient, survivalTime: 0 })).toBeNull();
    expect(rule({ ...basePatient, survivalTime: 5 })).toBeNull();
  });
});

describe("age_out_of_range", () => {
  const rule = findRule("age_out_of_range").run as (p: Patient) => any;
  it("flags age 121", () => {
    expect(rule({ ...basePatient, age: 121 })?.ruleId).toBe("age_out_of_range");
  });
  it("flags age -1", () => {
    expect(rule({ ...basePatient, age: -1 })?.ruleId).toBe("age_out_of_range");
  });
  it("accepts boundary 0 and 120", () => {
    expect(rule({ ...basePatient, age: 0 })).toBeNull();
    expect(rule({ ...basePatient, age: 120 })).toBeNull();
  });
});

describe("dead_without_death_date", () => {
  const rule = findRule("dead_without_death_date").run as (p: Patient) => any;
  it("flags dead with neither a followup date nor a survival time", () => {
    expect(rule({ ...basePatient, vitalStatus: false, followupDate: null, survivalTime: 0 })?.ruleId)
      .toBe("dead_without_death_date");
  });
  it("does not flag dead when the survival time is known", () => {
    expect(rule({ ...basePatient, vitalStatus: false, followupDate: null, survivalTime: 12 })).toBeNull();
  });
  it("does not flag alive without followup", () => {
    expect(rule({ ...basePatient, vitalStatus: true, followupDate: null })).toBeNull();
  });
  it("does not flag dead with followup", () => {
    expect(rule({ ...basePatient, vitalStatus: false,
      followupDate: new Date("2021-01-01") })).toBeNull();
  });
});

describe("last_contact_before_diagnosis", () => {
  const rule = findRule("last_contact_before_diagnosis").run as (p: Patient) => any;
  it("flags alive with followup before diagnosis", () => {
    expect(rule({ ...basePatient, vitalStatus: true,
      diagnosisDate: "2020-06-01",
      followupDate: new Date("2020-01-01") })?.ruleId).toBe("last_contact_before_diagnosis");
  });
  it("does not flag dead patient (death_before_diagnosis covers it)", () => {
    expect(rule({ ...basePatient, vitalStatus: false,
      diagnosisDate: "2020-06-01",
      followupDate: new Date("2020-01-01") })).toBeNull();
  });
});

import { PLAUSIBILITY_RULES } from "../anomaly-rules";
const findPlaus = (id: string) => PLAUSIBILITY_RULES.find(r => r.id === id)!;

describe("tnm_t0_with_metastasis", () => {
  const rule = findPlaus("tnm_t0_with_metastasis").run as (p: Patient) => any;
  it("flags T0 with M1", () => {
    expect(rule({ ...basePatient, staging: { tCategory: "T0", mCategory: "M1" } })?.ruleId)
      .toBe("tnm_t0_with_metastasis");
  });
  it("does not flag T0 with M0", () => {
    expect(rule({ ...basePatient, staging: { tCategory: "T0", mCategory: "M0" } })).toBeNull();
  });
  it("does not flag missing TNM", () => {
    expect(rule({ ...basePatient, staging: undefined })).toBeNull();
  });
});

describe("survival_over_25_years", () => {
  const rule = findPlaus("survival_over_25_years").run as (p: Patient) => any;
  it("flags 301 months", () => {
    expect(rule({ ...basePatient, survivalTime: 301 })?.ruleId).toBe("survival_over_25_years");
  });
  it("does not flag 300 months exactly", () => {
    expect(rule({ ...basePatient, survivalTime: 300 })).toBeNull();
  });
});

describe("very_short_followup_alive", () => {
  const rule = findPlaus("very_short_followup_alive").run as (p: Patient) => any;
  it("flags alive with 10-day follow-up", () => {
    expect(rule({ ...basePatient, vitalStatus: true,
      diagnosisDate: "2020-01-01",
      followupDate: new Date("2020-01-11") })?.ruleId).toBe("very_short_followup_alive");
  });
  it("does not flag alive with 30-day follow-up", () => {
    expect(rule({ ...basePatient, vitalStatus: true,
      diagnosisDate: "2020-01-01",
      followupDate: new Date("2020-01-31") })).toBeNull();
  });
  it("does not flag dead patient", () => {
    expect(rule({ ...basePatient, vitalStatus: false,
      diagnosisDate: "2020-01-01",
      followupDate: new Date("2020-01-11") })).toBeNull();
  });
});

describe("tnm_prefix_missing", () => {
  const rule = findPlaus("tnm_prefix_missing").run as (p: Patient) => any;
  const prostata = { ...basePatient, tumorType: "C61" };
  it("flags TNM without c/p prefix for an entity with separate clinical/pathologic grouping", () => {
    expect(rule({ ...prostata, staging: { tCategory: "T2", nCategory: "N0", mCategory: "M0" } })?.ruleId)
      .toBe("tnm_prefix_missing");
  });
  it("does not flag a T value from a dedicated pT column", () => {
    expect(rule({ ...prostata, staging: { tCategory: "T2", tPathological: "T2", nCategory: "N0", mCategory: "M0" } }))
      .toBeNull();
  });
  it("does not flag prefixed TNM", () => {
    expect(rule({ ...prostata, staging: { tCategory: "pT2", nCategory: "pN0", mCategory: "M0" } })).toBeNull();
  });
  it("does not flag entities with a single grouping", () => {
    expect(rule({ ...basePatient, tumorType: "C11", staging: { tCategory: "T2", nCategory: "N0", mCategory: "M0" } }))
      .toBeNull();
  });
  it("does not flag incomplete TNM", () => {
    expect(rule({ ...prostata, staging: { tCategory: "T2", mCategory: "M0" } })).toBeNull();
  });
});

describe("diagnosis_year_unrealistic", () => {
  const rule = findPlaus("diagnosis_year_unrealistic").run as (p: Patient) => any;
  it("flags year 1949", () => {
    expect(rule({ ...basePatient, diagnosisDate: "1949-12-31" })?.ruleId)
      .toBe("diagnosis_year_unrealistic");
  });
  it("does not flag year 1950", () => {
    expect(rule({ ...basePatient, diagnosisDate: "1950-01-01" })).toBeNull();
  });
});

import { percentile, OUTLIER_RULES } from "../anomaly-rules";

describe("percentile helper", () => {
  it("returns sorted percentile via linear interpolation", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
  });
  it("handles empty input", () => {
    expect(percentile([], 50)).toBeNaN();
  });
});

describe("outlier rules", () => {
  it("no percentile outlier rules remain (removed as circular)", () => {
    expect(OUTLIER_RULES).toHaveLength(0);
  });
});

import { DUPLICATE_MISSING_RULES } from "../anomaly-rules";
const findDup = (id: string) => DUPLICATE_MISSING_RULES.find(r => r.id === id)!;

describe("duplicate_patient_id", () => {
  const rule = findDup("duplicate_patient_id").run as (ps: Patient[]) => any[];
  it("flags every occurrence of a duplicated id", () => {
    const issues = rule([
      { ...basePatient, id: "A" },
      { ...basePatient, id: "A" },
      { ...basePatient, id: "B" },
    ]);
    expect(issues.map(i => i.patientId).sort()).toEqual(["A", "A"]);
  });
  it("returns no issues when all unique", () => {
    expect(rule([{ ...basePatient, id: "A" }, { ...basePatient, id: "B" }])).toHaveLength(0);
  });
});

describe("missing_diagnosis_date", () => {
  const rule = findDup("missing_diagnosis_date").run as (ps: Patient[]) => any[];
  it("flags patient without diagnosisDate", () => {
    const issues = rule([{ ...basePatient, id: "A", diagnosisDate: null as any }]);
    expect(issues[0]?.ruleId).toBe("missing_diagnosis_date");
  });
});

describe("missing_vital_status", () => {
  const rule = findDup("missing_vital_status").run as (ps: Patient[]) => any[];
  it("flags patient without vitalStatus", () => {
    const issues = rule([{ ...basePatient, id: "A", vitalStatus: null as any }]);
    expect(issues[0]?.ruleId).toBe("missing_vital_status");
  });
});
