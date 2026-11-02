import type { BoxProfile } from "./box-profile";

export type VitalStatus = "alive" | "dead";

/**
 * Einzige Deutung eines Statuscodes in Teilprojekt A, weil Patient.event sie
 * als Pflichtfeld verlangt. Unbekannte Werte liefern null und werden nicht
 * geraten.
 */
export function toVitalStatus(raw: string | null, profile: BoxProfile): VitalStatus | null {
  if (!raw) return null;
  if (profile.aliveVitalStatusValues.includes(raw)) return "alive";
  if (profile.deadVitalStatusValues.includes(raw)) return "dead";
  return null;
}
