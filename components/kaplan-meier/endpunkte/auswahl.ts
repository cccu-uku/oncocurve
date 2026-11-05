import type { Patient } from "../obds-parser-new";
import { ENDPUNKTE, endpunkteFuerZentrum } from "./registry";
import type { EndpunktDefinition, EndpunktId, ZentrumsTyp } from "./typen";
import { pruefeVerfuegbarkeit } from "./verfuegbarkeit";
import { vorgewaehlterEndpunkt } from "./vorwahl";

/**
 * Endpunkt, mit dem die Auswertung startet, geprüft gegen die Kohorte.
 *
 * Ein gespeicherter Wert stammt aus einer früheren Datei und sagt nichts
 * darüber, ob er zur jetzigen passt: die Kohorte kann das Feld nicht mehr
 * führen, der Zentrumstyp den Endpunkt nicht kennen, oder der Wert gar kein
 * Endpunktschlüssel sein. Alle drei Fälle enden sonst in einer Seite, die
 * einen Endpunkt rechnet oder beschriftet, den kein Radio anzeigt.
 *
 * Eine gültige Auswahl bleibt unangetastet; der Rückfall greift nur, wenn der
 * Wert unbrauchbar ist.
 */
export function gepruefterEndpunkt(
  gespeichert: unknown,
  patients: Patient[],
  zentrumsTyp: ZentrumsTyp | null,
): EndpunktId {
  // Im Zertifizierungsmodus zählt nur die Liste des Zentrumstyps, sonst alle.
  const waehlbare: EndpunktDefinition[] = zentrumsTyp
    ? endpunkteFuerZentrum(zentrumsTyp)
    : ENDPUNKTE;

  const brauchbar = (id: unknown): id is EndpunktId => {
    const definition = waehlbare.find((endpunkt) => endpunkt.id === id);
    return definition !== undefined && pruefeVerfuegbarkeit(definition, patients).verfuegbar;
  };

  if (brauchbar(gespeichert)) return gespeichert;

  const vorwahl = vorgewaehlterEndpunkt(patients);
  if (brauchbar(vorwahl)) return vorwahl;

  // Das Gesamtüberleben kann fast jede Kohorte, offen ist es aber nicht
  // immer: ein Datensatz mit Ersttherapiezeit sperrt es, und im
  // Zertifizierungsmodus fehlt der Ersatz TTFT in der Liste des Zentrumstyps.
  // Darum zuerst der erste wählbare Endpunkt, den diese Kohorte hergibt.
  const ersterFreier = waehlbare.find((endpunkt) => brauchbar(endpunkt.id));
  if (ersterFreier) return ersterFreier.id;

  // Gibt sie keinen einzigen her, sperrt die Oberfläche jeden Endpunkt und
  // zeigt den Grund an. Die Auswahl steht dann auf dem Gesamtüberleben, weil
  // jede andere genauso gesperrt wäre und weniger erklärt.
  return "oas";
}
