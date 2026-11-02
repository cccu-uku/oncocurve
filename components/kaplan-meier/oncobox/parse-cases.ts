import type { BoxProfile } from "./box-profile";
import { toBoolean, toDate, toInteger, liesAusschlussFelder, liesFernmetastasen, liesStaging, liesVerlaeufe } from "./lies-felder";
import { get, getAll, parseXml, readRootName, type XmlNode } from "./read-xml";
import type { OncoBoxCase } from "./types";

function matchesMarker(node: XmlNode, marker: { path: string; values: string[] } | null): boolean | null {
  if (!marker) return null;
  const raw = get(node, marker.path);
  if (!raw) return null;
  return marker.values.includes(raw);
}

export function parseCases(
  xml: string,
  profile: BoxProfile,
): { cases: OncoBoxCase[]; warnings: string[] } {
  const doc = parseXml(xml);
  const root = readRootName(doc);
  const cases: OncoBoxCase[] = [];
  const warnings: string[] = [];
  if (!root) return { cases, warnings };

  const patients = getAll(doc[root], profile.patientsPath);

  patients.forEach((patientNode, patientIndex) => {
    const patientId = get(patientNode, profile.patient.patientId) ?? `p${patientIndex + 1}`;
    const gender = get(patientNode, profile.patient.gender) ?? "U";
    const birthYear = profile.patient.birthYear ? toInteger(get(patientNode, profile.patient.birthYear)) : null;
    const patientDeathDate = profile.patient.deathDate ? toDate(get(patientNode, profile.patient.deathDate)) : null;
    const deathTumorRelated = profile.patient.deathTumorRelated
      ? toBoolean(get(patientNode, profile.patient.deathTumorRelated))
      : null;

    getAll(patientNode, profile.patient.cases).forEach((caseNode, caseIndex) => {
      const caseId = get(caseNode, profile.case.caseId) ?? String(caseIndex + 1);
      const diagnosisDate = toDate(get(caseNode, profile.case.diagnosisDate));
      const caseDeathDate = profile.case.deathDateInCase
        ? toDate(get(caseNode, profile.case.deathDateInCase))
        : null;
      const followUps = liesVerlaeufe(caseNode, profile);
      const explicitAge = profile.case.ageAtDiagnosis
        ? toInteger(get(caseNode, profile.case.ageAtDiagnosis))
        : null;
      const derivedAge =
        birthYear && diagnosisDate ? Number.parseInt(diagnosisDate.slice(0, 4), 10) - birthYear : null;
      // Brust 1.0 fuehrt das Alter am Patientknoten und kein Geburtsjahr.
      const patientAge = profile.patient.ageAtDiagnosis
        ? toInteger(get(patientNode, profile.patient.ageAtDiagnosis))
        : null;

      if (!diagnosisDate) warnings.push(`Fall ${patientId}-${caseId}: kein Diagnosedatum`);
      const deathDate = patientDeathDate ?? caseDeathDate;
      if (followUps.length === 0 && !deathDate) {
        warnings.push(`Fall ${patientId}-${caseId}: keine Verlaufsdaten`);
      }

      cases.push({
        patientId,
        caseId,
        isPrimary: matchesMarker(caseNode, profile.markers.primary),
        isCenterCase: matchesMarker(caseNode, profile.markers.centerCase),
        centerType: profile.markers.centerType ? get(caseNode, profile.markers.centerType) : null,
        icd10: get(caseNode, profile.case.icd10),
        icdIsTopography: profile.icdIsTopography,
        side: profile.case.side ? get(caseNode, profile.case.side) : null,
        diagnosisDate,
        ageAtDiagnosis: explicitAge ?? patientAge ?? derivedAge,
        gender,
        deathDate,
        deathTumorRelated,
        staging: liesStaging(caseNode, profile),
        followUps,
        distantMets: liesFernmetastasen(caseNode, profile),
        ausschlussFelder: liesAusschlussFelder(caseNode, profile),
      });
    });
  });

  return { cases, warnings };
}
