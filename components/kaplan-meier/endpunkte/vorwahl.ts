import type { Patient } from "../obds-parser-new";
import type { EndpunktId } from "./typen";
import { istTtftDatensatz } from "./verfuegbarkeit";

/**
 * Endpunkt, den eine frisch geladene Kohorte vorgewählt bekommt.
 *
 * Der CSV-Parser markiert einen Datensatz mit Behandlungsdatumsspalte als
 * "ttft". Diese Markierung wählt vor, sie erzwingt nichts: wer eine solche
 * Spalte mitliefert, soll trotzdem auf Gesamtüberleben umschalten können.
 * Genau das ging mit der alten Erkennung über isTTFT nicht.
 */
export function vorgewaehlterEndpunkt(patients: Patient[]): EndpunktId {
  return istTtftDatensatz(patients) ? "ttft" : "oas";
}
