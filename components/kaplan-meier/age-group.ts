// Single source of truth for age-group bucketing. Previously duplicated across
// the worker, stratification control (twice), Cox analysis and the results
// page — inconsistently: four of the five treated age 0 (the sentinel used
// throughout the parsers for "age unknown/missing", since Patient.age is a
// plain number) as "child" because "age < 18" happens to include 0, while the
// results page alone excluded it into "unknown". A cohort missing age data
// (e.g. a CSV with no age/birthDate column) therefore landed in different
// buckets depending on which analysis looked at it.
export type AgeGroup = "child" | "adult" | "senior" | "unknown";

export function getAgeGroup(age: number): AgeGroup {
  if (!Number.isFinite(age) || age <= 0) return "unknown";
  if (age < 18) return "child";
  if (age < 65) return "adult";
  return "senior";
}
