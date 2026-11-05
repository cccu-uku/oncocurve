import type { Patient } from "../obds-parser-new";

export interface DfsErgebnis {
  dfsTimeMonths: number;
  dfsEvent: 0 | 1;
  eventType: string;
  eventDate: Date | null;
}

const TAGE_PRO_MONAT = 30.4375;
const MILLISEKUNDEN_PRO_TAG = 1000 * 60 * 60 * 24;

/**
 * Berechnet Disease Free Survival (DFS) basierend auf oBDS-Daten
 *
 * DFS = Zeit von Diagnose/Therapiebeginn bis Wiederauftreten der Krankheit oder Tod
 *
 * Startpunkt:
 *   - diagnosisDate (Standard)
 *   - oder therapieBeginn (alternative)
 *
 * Endpunkt (Ereignis - Wiederauftreten/Krankheitsaktivität):
 *   - Rezidiv (rezidivDatum) - Lokalrezidiv
 *   - Metastasen (metastasenDatum) - Fernmetastasen oder regionale Metastasen
 *   - Tod (todDatum) - unabhängig von Ursache
 *   - NICHT: Zweittumor (das ist ein neuer Tumor, kein Rezidiv)
 *
 * Zensierung:
 *   - Wenn bis nachsorgeDatum/followupDate kein Ereignis eintritt, ist dfsEvent = 0
 */
export function calculateDFSFromOBDS(patient: Patient, dfsStartTime: "diagnosisDate" | "therapieBeginn" = "diagnosisDate"): DfsErgebnis {
    // Startdatum festlegen
    let startDate: Date | null = null;

    if (dfsStartTime === "therapieBeginn" && patient.therapieBeginn) {
      startDate = typeof patient.therapieBeginn === 'string'
        ? new Date(patient.therapieBeginn)
        : patient.therapieBeginn;
    } else if (patient.diagnosisDate) {
      startDate = typeof patient.diagnosisDate === 'string'
        ? new Date(patient.diagnosisDate)
        : patient.diagnosisDate;
    }

    if (!startDate || isNaN(startDate.getTime())) {
      // Kein gültiges Startdatum
      return { dfsTimeMonths: 0, dfsEvent: 0, eventType: "zensiert", eventDate: null };
    }

    // Sammle alle DFS-Enddatum-Kandidaten (Wiederauftreten oder Tod)
    // NICHT: Zweittumor (das ist ein neuer Tumor, nicht Wiederauftreten)
    const eventDates: Array<{ date: Date; type: string }> = [];

    // 1. Rezidiv (Wiederauftreten an Ursprungsort)
    if (patient.rezidivDatum) {
      const rezDate = typeof patient.rezidivDatum === 'string'
        ? new Date(patient.rezidivDatum)
        : patient.rezidivDatum;
      if (!isNaN(rezDate.getTime())) {
        eventDates.push({ date: rezDate, type: "rezidiv" });
      }
    }

    // 2. Metastasen (Wiederauftreten mit Metastasenbildung - das ist Krankheitsaktivität)
    if (patient.metastasenDatum) {
      const metDate = typeof patient.metastasenDatum === 'string'
        ? new Date(patient.metastasenDatum)
        : patient.metastasenDatum;
      if (!isNaN(metDate.getTime())) {
        eventDates.push({ date: metDate, type: "metastasen" });
      }
    }

    // 3. Tod (Endpoint für DFS - ist Wiederauftreten/Krankheitsaktivität nachgewiesen, zählt auch Tod)
    if (patient.todDatum) {
      const todDate = typeof patient.todDatum === 'string'
        ? new Date(patient.todDatum)
        : patient.todDatum;
      if (!isNaN(todDate.getTime())) {
        eventDates.push({ date: todDate, type: "tod" });
      }
    }

    // Finde das früheste Ereignis
    let earliestEvent: { date: Date; type: string } | null = null;
    if (eventDates.length > 0) {
      earliestEvent = eventDates.reduce((earliest, current) =>
        current.date < earliest.date ? current : earliest
      );
    }

  let endDate: Date;
    let dfsEvent: 0 | 1;
    let eventType: string;

    if (earliestEvent) {
      // Ereignis gefunden (Rezidiv, Metastasen oder Tod)
      endDate = earliestEvent.date;
      dfsEvent = 1;
      eventType = earliestEvent.type;
    } else {
      // Kein Ereignis, also Zensierung am Nachsorgedatum oder Follow-up
      if (patient.nachsorgeDatum) {
        endDate = typeof patient.nachsorgeDatum === 'string'
          ? new Date(patient.nachsorgeDatum)
          : patient.nachsorgeDatum;
      } else if (patient.followupDate) {
        endDate = new Date(patient.followupDate);
      } else {
        // Kein Follow-up, also Startdatum als Rückfallebene
        endDate = startDate;
      }
      dfsEvent = 0;
      eventType = "zensiert";
    }

    // Validiere, dass endDate nach oder gleich startDate liegt
    if (endDate < startDate) {
      endDate = startDate;
    }

    // Berechne DFS-Zeit in Monaten (30,4375 Tage durchschnittlich pro Monat)
    const dfsTimeDays = (endDate.getTime() - startDate.getTime()) / MILLISEKUNDEN_PRO_TAG;
    const dfsTimeMonths = dfsTimeDays / TAGE_PRO_MONAT;

    const eventDate = new Date(endDate);

    return {
      dfsTimeMonths: Math.max(0, dfsTimeMonths),
      dfsEvent,
      eventType,
      eventDate,
    };
}
