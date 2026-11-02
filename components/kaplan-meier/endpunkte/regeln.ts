import type { EndpunktId, EndpunktRegel } from "./typen";

/**
 * Rechenvorschriften. Ein Endpunkt ohne Eintrag ist gesperrt, bis das Zentrum
 * die Rückfragen aus data/OncoBoxen/Endpunkte-Rueckfragen.xlsx beantwortet hat.
 * Bewusst nicht geraten: eine falsche Ereignisdefinition erzeugt eine Kurve,
 * die plausibel aussieht und falsch ist.
 */
export const ENDPUNKT_REGELN: Partial<Record<EndpunktId, EndpunktRegel>> = {
  oas: {
    start: "diagnose",
    todAlsEreignis: true,
    einschluss: "alle",
    schaetzer: "kaplanMeier",
    herkunft: "bestehend",
    quelle: "Bestehende Implementierung, Erhebungsbogen: Gesamtüberleben",
  },
  ttft: {
    start: "diagnose",
    datumsfelder: ["firstTreatmentDate"],
    todAlsEreignis: false,
    einschluss: "alle",
    schaetzer: "kaplanMeier",
    herkunft: "bestehend",
    quelle: "Bestehende Implementierung, kein Endpunkt des Erhebungsbogens",
  },
  // DFS trägt die bestehende Regel über die Datumsfelder, damit oBDS-Kohorten
  // den Endpunkt behalten. Für OncoBox-Kohorten greift sie nicht, weil dort
  // genau diese Felder fehlen; die Datenprüfung sperrt DFS dort von selbst.
  // Der Zertifizierungspfad über die Verlaufscodes kommt erst mit F11 und F12.
  dfs: {
    start: "diagnose",
    datumsfelder: ["rezidivDatum", "metastasenDatum", "todDatum"],
    todAlsEreignis: false,
    einschluss: "tumorfreiNachPrimaertherapie",
    schaetzer: "kaplanMeier",
    herkunft: "bestehend",
    quelle: "Bestehende Implementierung vor Teilprojekt B, nicht durch den Erhebungsbogen bestätigt",
  },
  // Rate, kein Überleben: wer stirbt, bekommt kein Lokalrezidiv mehr. Der Tod
  // konkurriert also, statt zu zensieren. Kaplan-Meier überschätzt die Rate
  // sonst systematisch, bei Brustkrebs im Mittel um rund 28 Prozent.
  lrr: {
    start: "diagnose",
    datumsfelder: ["rezidivDatum"],
    konkurrenzfelder: ["todDatum", "metastasenDatum"],
    todAlsEreignis: false,
    einschluss: "tumorfreiNachPrimaertherapie",
    schaetzer: "kumulativeInzidenz",
    herkunft: "literatur",
    quelle: "STEEP 2.0, kumulative Inzidenz nach Gooley et al.",
  },
  lrfs: {
    start: "diagnose",
    datumsfelder: ["rezidivDatum", "todDatum"],
    todAlsEreignis: true,
    einschluss: "tumorfreiNachPrimaertherapie",
    schaetzer: "kaplanMeier",
    herkunft: "literatur",
    quelle: "STEEP 2.0, local recurrence free survival",
  },
  mfs: {
    start: "diagnose",
    datumsfelder: ["metastasenDatum", "todDatum"],
    todAlsEreignis: true,
    einschluss: "tumorfreiNachPrimaertherapie",
    schaetzer: "kaplanMeier",
    herkunft: "literatur",
    quelle: "STEEP 2.0, distant metastasis free survival",
  },
  pfs: {
    start: "diagnose",
    datumsfelder: ["progressionDatum", "todDatum"],
    todAlsEreignis: true,
    einschluss: "alle",
    schaetzer: "kaplanMeier",
    herkunft: "literatur",
    quelle: "DATECAN, progression free survival",
  },
  // Startet erst bei der Progression. Wer keine hatte, gehört nicht in die
  // Auswertung; die Kohorte ist damit eine andere als bei allen übrigen
  // Endpunkten. Der Einschluss ergibt sich allein aus start: "progression",
  // nicht aus einem eigenen Einschlusswert. zeitAusDatumsfeldern liefert für
  // Fälle ohne Progressionsdatum KEIN_START, und kohorteFuerEndpunkt wirft
  // dessen negativen Sentinelwert heraus, siehe allgemeine-regel.ts.
  pps: {
    start: "progression",
    datumsfelder: ["todDatum"],
    todAlsEreignis: true,
    einschluss: "alle",
    schaetzer: "kaplanMeier",
    herkunft: "literatur",
    quelle: "DATECAN, post progression survival",
  },
};
