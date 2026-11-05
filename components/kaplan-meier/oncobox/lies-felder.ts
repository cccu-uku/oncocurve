import { normalizeIsoDate } from "../date-utils";
import type { BoxProfile, CasePaths, TnmPath } from "./box-profile";
import { get, getAll, type XmlNode } from "./read-xml";
import type { OncoBoxAusschlussFelder, OncoBoxFollowUp, OncoBoxStaging } from "./types";
import { toVitalStatus } from "./vital-status";

const YES_VALUES = ["J", "Y", "1"];

export function toBoolean(raw: string | null): boolean | null {
  if (!raw) return null;
  return YES_VALUES.includes(raw);
}

export function toDate(raw: string | null): string | null {
  if (!raw) return null;
  return normalizeIsoDate(raw) || null;
}

export function toInteger(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

type StagingKind = "clinical" | "pathological";

const PATHOLOGICAL_DESIGNATOR = "p";
const CLINICAL_DESIGNATOR = "c";

/**
 * Einen TNM-Wert der klinischen oder der pathologischen Spalte zuordnen. Wo die
 * Box einen Kennzeichner führt, entscheidet er; sonst gilt die Voreinstellung
 * des Erhebungszeitpunkts. Ohne diese Prüfung landeten in Brust 1.0 30 von 33
 * Werten in der klinischen Spalte, obwohl die Box sie als pathologisch meldet,
 * und die Legende stellte ihnen zusätzlich ein c voran.
 */
function readTnm(
  caseNode: XmlNode,
  path: TnmPath,
  fallback: StagingKind,
): { value: string | null; kind: StagingKind } {
  const value = get(caseNode, path.value);
  const designator = path.designator ? get(caseNode, path.designator) : null;
  if (designator === PATHOLOGICAL_DESIGNATOR) return { value, kind: "pathological" };
  if (designator === CLINICAL_DESIGNATOR) return { value, kind: "clinical" };
  return { value, kind: fallback };
}

/** Prä- und postoperativen Wert einer Komponente auf beide Spalten verteilen.
 *  Fallen beide in dieselbe Spalte, gewinnt der postoperative als die spätere
 *  Erhebung. */
function splitComponent(
  caseNode: XmlNode,
  paths: CasePaths,
  component: "t" | "n" | "m",
): { clinical: string | null; pathological: string | null } {
  const pre = readTnm(caseNode, paths.preTherapy[component], "clinical");
  const post = readTnm(caseNode, paths.postOp[component], "pathological");
  const slots: { clinical: string | null; pathological: string | null } = {
    clinical: null,
    pathological: null,
  };
  if (pre.value) slots[pre.kind] = pre.value;
  if (post.value) slots[post.kind] = post.value;
  return slots;
}

export function liesStaging(caseNode: XmlNode, profile: BoxProfile): OncoBoxStaging {
  const paths = profile.case;
  const t = splitComponent(caseNode, paths, "t");
  const n = splitComponent(caseNode, paths, "n");
  const m = splitComponent(caseNode, paths, "m");
  return {
    cT: t.clinical,
    cN: n.clinical,
    cM: m.clinical,
    pT: t.pathological,
    pN: n.pathological,
    pM: m.pathological,
    grading: paths.grading ? get(caseNode, paths.grading) : null,
  };
}

export function liesVerlaeufe(caseNode: XmlNode, profile: BoxProfile): OncoBoxFollowUp[] {
  const paths = profile.followUp;
  return getAll(caseNode, profile.case.followUps)
    .map((node) => ({
      date: toDate(get(node, paths.date)),
      vitalStatus: toVitalStatus(get(node, paths.vitalStatus), profile),
      localStatus: get(node, paths.localStatus),
      nodalStatus: paths.nodalStatus ? get(node, paths.nodalStatus) : null,
      distantStatus: get(node, paths.distantStatus),
      overallStatus: paths.overallStatus ? get(node, paths.overallStatus) : null,
      secondTumor: toBoolean(get(node, paths.secondTumor)),
      secondTumorRaw: get(node, paths.secondTumor),
      quelleFollowUp: paths.quelleFollowUp ? get(node, paths.quelleFollowUp) : null,
      localRecurrenceDate: paths.localRecurrenceDate ? toDate(get(node, paths.localRecurrenceDate)) : null,
      biochemicalRecurrence: paths.biochemicalRecurrence ? get(node, paths.biochemicalRecurrence) : null,
      biochemicalRecurrenceDate: paths.biochemicalRecurrenceDate
        ? toDate(get(node, paths.biochemicalRecurrenceDate))
        : null,
      distantMetastasisDate: paths.distantMetastasisDate ? toDate(get(node, paths.distantMetastasisDate)) : null,
    }))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

export function liesAusschlussFelder(caseNode: XmlNode, profile: BoxProfile): OncoBoxAusschlussFelder {
  const paths = profile.ausschluss;
  const lies = (pfad: string | null): string | null => (pfad ? get(caseNode, pfad) : null);
  return {
    residualstatusLokal: lies(paths.residualstatusLokal),
    residualstatusGesamt: lies(paths.residualstatusGesamt),
    krebsvorerkrankung: lies(paths.krebsvorerkrankung),
    uiccStadium: lies(paths.uiccStadium),
    synchronerPrimaertumor: lies(paths.synchronerPrimaertumor),
    opDatum: toDate(lies(paths.opDatum)),
    opTyp: lies(paths.opTyp),
    bestrahlungsTyp: lies(paths.bestrahlungsTyp),
    bestrahlungsZeitpunkt: lies(paths.bestrahlungsZeitpunkt),
    bestrahlungsIntention: lies(paths.bestrahlungsIntention),
    therapieTyp: lies(paths.therapieTyp),
    zufallsbefund: lies(paths.zufallsbefund),
  };
}

export function liesFernmetastasen(
  caseNode: XmlNode,
  profile: BoxProfile,
): { date: string | null; site: string | null }[] {
  const { distantMets, distantMetDate, distantMetSite } = profile.case;
  if (!distantMets || !distantMetDate || !distantMetSite) return [];
  return getAll(caseNode, distantMets).map((node) => ({
    date: toDate(get(node, distantMetDate)),
    site: get(node, distantMetSite),
  }));
}
