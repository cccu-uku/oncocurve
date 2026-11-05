import type { OncoBoxCase, OncoBoxFollowUp } from "../../oncobox/types";
import { FUENF_JAHRE_TAGE } from "./darm-1-fenster";
import type { AusschlussGrund, BoxBewertung, BoxRegel } from "./typen";
import { tageZwischen } from "./zeit";

const QUELLE_DFS =
  "eb_darm-P1.1.1_spez xml-oncobox-A1 (251203).xlsx, Blätter Kaplan-Meier DFS I und II";
const QUELLE_OAS =
  "eb_darm-P1.1.1_spez xml-oncobox-A1 (251203).xlsx, Blätter Kaplan-Meier OAS I und II";

/** Frist der 30-Tage-Mortalität nach dem Blatt KB-19. */
const POSTOPERATIVE_FRIST_TAGE = 30;

/** D13: 1 bis 4 sind Stadien, 9 heißt nicht ermittelbar. */
const UICC_VIER = "4";

/** B1 und D14: 1 heißt ja, 0 nein, 9 unbekannt. Unbekannt schließt nicht aus. */
const JA = "1";

/**
 * Follow-ups mit Datum, aufsteigend. Ohne Datum ist keine Zeit ableitbar.
 *
 * Bewusst nicht aus brust-1.ts übernommen: die Boxregeln borgen nichts
 * voneinander. Was bei Darm ein gültiges Follow-up ist, entscheidet die
 * Darm-Spezifikation, und eine geteilte Fassung würde beide Boxen
 * aneinanderbinden, sobald eine von ihnen sich ändert.
 */
function datierteFollowUps(fall: OncoBoxCase): (OncoBoxFollowUp & { date: string })[] {
  return fall.followUps.filter((eintrag): eintrag is OncoBoxFollowUp & { date: string } =>
    Boolean(eintrag.date),
  );
}

/**
 * Eine Meldung, die mehr sagt als "lebt noch". Die Spezifikation zieht Fälle
 * ab, deren Follow-up nur den Life-Status trägt: daraus lässt sich kein
 * krankheitsfreies Überleben ableiten.
 */
function traegtRezidivfelder(eintrag: OncoBoxFollowUp): boolean {
  return (
    eintrag.localStatus !== null ||
    eintrag.nodalStatus !== null ||
    eintrag.distantStatus !== null ||
    eintrag.secondTumorRaw !== null
  );
}

function keineVollremission(fall: OncoBoxCase): boolean {
  const gesamt = fall.ausschlussFelder.residualstatusGesamt;
  const m = fall.staging.pM ?? "";
  return gesamt !== "R0" || m.startsWith("M1");
}

/** Verstorben innerhalb von 30 Tagen nach der operativen Tumorentfernung. */
function postoperativVerstorben(fall: OncoBoxCase): boolean {
  const op = fall.ausschlussFelder.opDatum;
  if (!op) return false;
  return datierteFollowUps(fall).some((eintrag) => {
    if (eintrag.vitalStatus !== "dead") return false;
    const abstand = tageZwischen(op, eintrag.date);
    return abstand !== null && abstand <= POSTOPERATIVE_FRIST_TAGE;
  });
}

function keineGrundlage(fall: OncoBoxCase, brauchtRezidivfelder: boolean): AusschlussGrund | null {
  if (!fall.diagnosisDate) return "keinDiagnosedatum";
  const datiert = datierteFollowUps(fall);
  if (datiert.length === 0) return "keinFollowUp";
  if (brauchtRezidivfelder && !datiert.some(traegtRezidivfelder)) return "keinFollowUp";
  return null;
}

/** Q2 bis Q5 eines Follow-ups als Rohwerte, in der Reihenfolge der Spezifikation. */
function rezidivfelder(eintrag: OncoBoxFollowUp): (string | null)[] {
  return [eintrag.localStatus, eintrag.nodalStatus, eintrag.distantStatus, eintrag.secondTumorRaw];
}

/** Kategorie A: mindestens ein Rezidivfeld trägt 1. */
function istEreignisMeldung(eintrag: OncoBoxFollowUp): boolean {
  return rezidivfelder(eintrag).some((wert) => wert === "1");
}

/** Kategorien B und C verlangen beide, dass kein Feld 1 oder 2 trägt. */
function ohneBefund(eintrag: OncoBoxFollowUp): boolean {
  return rezidivfelder(eintrag).every((wert) => wert !== "1" && wert !== "2");
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

export const DARM_1_DFS: BoxRegel = {
  id: "darm-1/dfs",
  quelle: QUELLE_DFS,
  // Wörtlich aus dem Auswertungsblatt der Box, nicht abgeleitet.
  herkunft: "spezifikation",
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: FUENF_JAHRE_TAGE,
  ausschluss(fall) {
    const uicc = fall.ausschlussFelder.uiccStadium;
    if (!uicc || uicc === "9") return "keinUiccStadium";
    if (uicc === UICC_VIER) return "uiccVier";
    if (postoperativVerstorben(fall)) return "postoperativVerstorben";
    if (fall.ausschlussFelder.krebsvorerkrankung === JA) return "krebsvorerkrankung";
    if (fall.ausschlussFelder.synchronerPrimaertumor === JA) return "synchronerPrimaertumor";
    if (keineVollremission(fall)) return "keineVollremission";
    return keineGrundlage(fall, true);
  },
  bewerte(fall) {
    const datiert = datierteFollowUps(fall);
    const ereignis = datiert.find(istEreignisMeldung);
    if (ereignis) return bewertung(fall, ereignis.date, true);

    const letzte = datiert[datiert.length - 1];
    // Weder A noch B noch C: der Wert 2 in einem Rezidivfeld trifft keine
    // Kategorie der Spezifikation. Der Fall fällt heraus, statt einer Kategorie
    // zugeschlagen zu werden, die dort nicht steht.
    if (!letzte || !ohneBefund(letzte)) return null;
    // Kategorie C: kein Befund, aber verstorben. Der Tod steht in Q6 und wird
    // am Follow-up-Datum gerechnet; ein eigenes Sterbedatum führt die Box nicht.
    return bewertung(fall, letzte.date, letzte.vitalStatus === "dead");
  },
};

export const DARM_1_OAS: BoxRegel = {
  id: "darm-1/oas",
  quelle: QUELLE_OAS,
  // Wörtlich aus dem Auswertungsblatt der Box, nicht abgeleitet.
  herkunft: "spezifikation",
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: FUENF_JAHRE_TAGE,
  // Das OAS-Blatt kennt die Stadien- und Remissionsbedingungen nicht. Für das
  // Gesamtüberleben zählt allein, ob überhaupt eine Meldung vorliegt.
  ausschluss(fall) {
    return keineGrundlage(fall, false);
  },
  bewerte(fall) {
    const datiert = datierteFollowUps(fall);
    const tod = datiert.find((eintrag) => eintrag.vitalStatus === "dead");
    if (tod) return bewertung(fall, tod.date, true);
    const letzte = datiert[datiert.length - 1];
    return bewertung(fall, letzte?.date ?? null, false);
  },
};

// Die fünf übrigen Endpunkte stammen aus der Literatur, nicht aus dem
// Auswertungsblatt der Box, und stehen deshalb in einer eigenen Datei.
export { DARM_1_LRR, DARM_1_LRFS, DARM_1_MFS } from "./darm-1-endpunkte";
