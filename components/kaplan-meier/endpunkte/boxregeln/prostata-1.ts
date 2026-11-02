import type { OncoBoxCase, OncoBoxFollowUp } from "../../oncobox/types";
import type { BoxBewertung, BoxRegel } from "./typen";
import { falltyp, keineGrundlage, nichtTumorfrei } from "./prostata-1-falltypen";
import { tageZwischen } from "./zeit";

export { falltyp } from "./prostata-1-falltypen";

const QUELLE_DFS =
  "eb_prostata-Q1.1.1_spez xml-oncobox-A1 (251203).xlsx, Blatt Kaplan-Meier (DFS)";
const QUELLE_OAS =
  "eb_prostata-Q1.1.1_spez xml-oncobox-A1 (251203).xlsx, Blatt Kaplan-Meier (OAS)";

/** Comorbidities ist eine Codeliste; 10 ist die relevante Krebsvorerkrankung. */
const CODE_KREBSVORERKRANKUNG = "10";

/** Ereignis im Sinne der Kategorie A, biochemisches Rezidiv eingeschlossen. */
function istEreignisMeldung(eintrag: OncoBoxFollowUp): boolean {
  return (
    eintrag.localStatus === "R" ||
    eintrag.biochemicalRecurrence === "Y" ||
    eintrag.distantStatus === "R" ||
    eintrag.secondTumorRaw === "Y"
  );
}

/**
 * Ereignisdatum eines auffälligen Follow-ups. Prostata nennt es selbst, und
 * zwar je Ereignistyp getrennt; das früheste zählt. Fehlt es, bleibt das
 * Untersuchungsdatum als Näherung, so wie bei Brust und Darm immer.
 */
function ereignisDatum(eintrag: OncoBoxFollowUp): string | null {
  const eigene = [
    eintrag.localRecurrenceDate,
    eintrag.biochemicalRecurrenceDate,
    eintrag.distantMetastasisDate,
  ].filter((datum): datum is string => Boolean(datum));
  if (eigene.length === 0) return eintrag.date;
  return eigene.sort()[0];
}

function bewertung(
  fall: OncoBoxCase,
  datum: string | null,
  ereignis: boolean,
): BoxBewertung | null {
  if (!datum) return null;
  const zeitTage = tageZwischen(fall.diagnosisDate, datum);
  if (zeitTage === null) return null;
  return { zeitTage, ereignis, datum };
}

// Bewusst nicht "gueltigeMeldungen": gueltigeMeldung in
// prostata-1-falltypen.ts prüft die inhaltliche Gültigkeit einer Meldung,
// das hier sortiert nur die datierten. Zwei fast gleiche Namen für zwei
// verschiedene Fragen wären eine Falle.
function datierteMeldungen(fall: OncoBoxCase): OncoBoxFollowUp[] {
  return fall.followUps
    .filter((eintrag) => eintrag.date)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

export const PROSTATA_1_DFS: BoxRegel = {
  id: "prostata-1/dfs",
  quelle: QUELLE_DFS,
  // Wörtlich aus dem Auswertungsblatt der Box, nicht abgeleitet.
  herkunft: "spezifikation",
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
  ausschluss(fall) {
    const typ = falltyp(fall);
    // Ohne Falltyp trägt keine Zeile der Matrix: der Fall passt in keine
    // der drei Gruppen aus dem Blatt "Categories".
    if (!typ) return "unkategorisiert";
    // NI zählt ohne weitere Prüfung als nicht tumorfrei, darum kommen die
    // beiden übrigen Kriterien, die das Blatt auf IV und IF beschränkt, für
    // diesen Falltyp nie zum Zug.
    if (nichtTumorfrei(fall, typ)) return "postoperativNichtTumorfrei";
    if (fall.ausschlussFelder.krebsvorerkrankung === CODE_KREBSVORERKRANKUNG) {
      return "krebsvorerkrankung";
    }
    return keineGrundlage(fall);
  },
  bewerte(fall) {
    const meldungen = datierteMeldungen(fall);
    const auffaellig = meldungen.find(istEreignisMeldung);
    if (auffaellig) return bewertung(fall, ereignisDatum(auffaellig), true);
    if (fall.deathDate) return bewertung(fall, fall.deathDate, true);
    return bewertung(fall, meldungen[meldungen.length - 1]?.date ?? null, false);
  },
};

export const PROSTATA_1_OAS: BoxRegel = {
  id: "prostata-1/oas",
  quelle: QUELLE_OAS,
  // Wörtlich aus dem Auswertungsblatt der Box, nicht abgeleitet.
  herkunft: "spezifikation",
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
  // Wie bei Brust und Darm: das OAS-Blatt zieht allein Fälle ohne gültige
  // Meldung ab. Falltyp und Tumorfreiheit spielen keine Rolle.
  ausschluss(fall) {
    return keineGrundlage(fall);
  },
  // Zwei Kategorien: verstorben ist Ereignis, lebend ist Zensierung. Auch das
  // biochemische Rezidiv ändert daran nichts.
  bewerte(fall) {
    if (fall.deathDate) return bewertung(fall, fall.deathDate, true);
    const meldungen = datierteMeldungen(fall);
    return bewertung(fall, meldungen[meldungen.length - 1]?.date ?? null, false);
  },
};

// Die fünf übrigen Endpunkte stammen aus der Literatur, nicht aus dem
// Auswertungsblatt der Box, und stehen deshalb in einer eigenen Datei.
export {
  PROSTATA_1_LRR,
  PROSTATA_1_LRFS,
  PROSTATA_1_MFS,
  PROSTATA_1_PFS,
  PROSTATA_1_PPS,
} from "./prostata-1-endpunkte";
