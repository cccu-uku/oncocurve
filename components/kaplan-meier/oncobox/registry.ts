import type { BoxProfile } from "./box-profile";
import { FAMILY_2_PROFILE } from "./profiles/family-2";
import { BRUST_1_PROFILE } from "./profiles/brust-1";
import { DARM_1_PROFILE } from "./profiles/darm-1";
import { PROSTATA_1_PROFILE } from "./profiles/prostata-1";
import { get, getAll, parseXml, readRootName, type XmlNode } from "./read-xml";

const FAMILY_2_ROOT_PREFIX = "OncoBox";

/** Boxen, gegen deren Prüfschema das gemeinsame 2.0-Profil geprüft ist. */
const FAMILY_2_BOXES = new Set(["brust", "darm", "lunge"]);
const FAMILY_1_ROOT = "Patienten";

// Erkennungsliterale. Die Erkennung muss ins Dokument schauen, bevor sie weiß,
// welches Profil gilt, deshalb kommt sie ohne eigene Literale nicht aus.
const FAMILY_1_PATIENT = "Patient";
const PROSTATA_CASE = "Case";

// Der Zentrumstyp trennt Brust 1.0 von Darm 1.0. Beide Profile führen denselben
// Pfad, deshalb wird er aus einem abgeleitet statt ein zweites Mal notiert.
const ORGAN_PATH = `${BRUST_1_PROFILE.patient.cases}/${BRUST_1_PROFILE.markers.centerType}`;

/** Zentrumstyp im Datensatz zu Boxbezeichnung, nur Familie 1.0. */
const FAMILY_1_PROFILES_BY_ORGAN: Record<string, { profile: BoxProfile; boxType: string }> = {
  BZ: { profile: BRUST_1_PROFILE, boxType: "brust" },
  DZ: { profile: DARM_1_PROFILE, boxType: "darm" },
};

export type DetectionReason = "notYetSupported" | "diginet";

export interface SupportedDetection {
  kind: "supported";
  profile: BoxProfile;
  boxType: string;
  schemaVersion: string;
}

export interface KnownDetection {
  kind: "known";
  boxType: string;
  schemaVersion: string;
  reason: DetectionReason;
}

export type Detection = SupportedDetection | KnownDetection | null;

export function detectOncoBox(xml: string): Detection {
  let root: string | null;
  let doc: XmlNode;
  try {
    doc = parseXml(xml);
    root = readRootName(doc);
  } catch {
    return null;
  }
  if (!root) return null;

  if (root.startsWith(FAMILY_2_ROOT_PREFIX) && root.length > FAMILY_2_ROOT_PREFIX.length) {
    const boxType = root.slice(FAMILY_2_ROOT_PREFIX.length).toLowerCase();
    const patients = getAll(doc[root], FAMILY_2_PROFILE.patientsPath);
    if (patients.length === 0) return null;

    // Die DIGINET-Variante teilt sich die Wurzel mit der DKG-Zert-Variante,
    // führt aber keine Fälle und stattdessen Klarnamen.
    if (getAll(patients[0], FAMILY_2_PROFILE.patient.cases).length === 0) {
      return { kind: "known", boxType, schemaVersion: "2.0", reason: "diginet" };
    }
    // Das gemeinsame Profil ist an genau diesen drei Schemata geprüft. Eine
    // künftige Box mit derselben Wurzelform damit zu parsen hiesse raten: legt
    // sie ein Feld anders an, liefert der Vitalstatus überall null, jeder Fall
    // gilt als zensiert und die Kurve zeigt hundert Prozent, ohne Warnung.
    if (!FAMILY_2_BOXES.has(boxType)) {
      return { kind: "known", boxType, schemaVersion: "2.0", reason: "notYetSupported" };
    }
    return { kind: "supported", profile: FAMILY_2_PROFILE, boxType, schemaVersion: "2.0" };
  }

  if (root === FAMILY_1_ROOT) {
    const patients = getAll(doc[root], FAMILY_1_PATIENT);
    if (patients.length === 0) return null;

    if (getAll(patients[0], PROSTATA_CASE).length > 0) {
      return {
        kind: "supported",
        profile: PROSTATA_1_PROFILE,
        boxType: "prostata",
        schemaVersion: "1.0",
      };
    }

    const organ = get(patients[0], ORGAN_PATH);
    const match = organ ? FAMILY_1_PROFILES_BY_ORGAN[organ] : undefined;
    if (!match) return null;

    return { kind: "supported", profile: match.profile, boxType: match.boxType, schemaVersion: "1.0" };
  }

  return null;
}
