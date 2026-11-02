import type { OncoBoxCase, OncoBoxFollowUp } from "../../oncobox/types";
import type { AusschlussGrund, BoxBewertung, BoxRegel } from "./typen";
import { tageZwischen } from "./zeit";

const QUELLE =
  "oncobox-brust 2.0, oncobox-darm 2.0 und oncobox-lunge, Blatt EQ Kategorien (Klinisch), auf den Verlauf übertragen";

/**
 * Kein Nachweis in den drei Statusfeldern. In der Gesamtbeurteilung trägt
 * derselbe Buchstabe "K" eine andere Bedeutung (keine Änderung = stable
 * disease) und wird dort nicht gesondert behandelt: Da nur "V" als tumorfrei
 * zählt, fällt ein "K" in der Gesamtbeurteilung schon über istTumorfrei()
 * unter die Ereignisfälle. Beide Codes stammen unverändert aus dem OBDS.
 */
const KEIN_NACHWEIS = "K";
/** Vollremission in der Gesamtbeurteilung. */
const VOLLREMISSION = "V";
/** Codes ohne Aussagekraft: unbekannt, fehlende Angabe, fraglicher Befund. */
const OHNE_AUSSAGE = ["U", "X", "F"];
/** Rezidiv oder Nachweis in einem Statusfeld. */
const NACHWEIS = "R";
/** Werte der Gesamtbeurteilung, die selbst schon einen Befund benennen. */
const GESAMT_BEFUND = ["P", "Y"];

function datierte(fall: OncoBoxCase): (OncoBoxFollowUp & { date: string })[] {
  return fall.followUps
    .filter((eintrag): eintrag is OncoBoxFollowUp & { date: string } => Boolean(eintrag.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Tumorfrei im Sinne der EQ-Definition: Vollremission in der
 * Gesamtbeurteilung und kein Nachweis in lokal, Lymphknoten und
 * Fernmetastasen, dazu kein Zweittumor. Nur "V" zählt als tumorfrei, auch "R"
 * (Vollremission mit residualen Auffälligkeiten) nicht: der Name nennt eine
 * Vollremission, der Code selbst schliesst Auffälligkeiten aber ausdrücklich
 * ein.
 */
function istTumorfrei(eintrag: OncoBoxFollowUp): boolean {
  return (
    eintrag.overallStatus === VOLLREMISSION &&
    eintrag.localStatus === KEIN_NACHWEIS &&
    eintrag.nodalStatus === KEIN_NACHWEIS &&
    eintrag.distantStatus === KEIN_NACHWEIS &&
    eintrag.secondTumorRaw !== "J"
  );
}

/**
 * Trägt die Meldung in allen vier Feldern überhaupt eine Aussage? Codes wie
 * unbekannt, fehlende Angabe oder ein fraglicher Befund sagen nichts, weder
 * in die eine noch in die andere Richtung.
 */
function traegtAussage(eintrag: OncoBoxFollowUp): boolean {
  const felder = [
    eintrag.localStatus,
    eintrag.nodalStatus,
    eintrag.distantStatus,
    eintrag.overallStatus,
  ];
  return felder.every((wert) => wert !== null && !OHNE_AUSSAGE.includes(wert));
}

/**
 * Ein benannter Befund wie Rezidiv oder Progression ist eindeutig, auch wenn
 * ein Nachbarfeld nichts sagt. Trägt die Meldung sonst überhaupt eine
 * Aussage, ist jede Abweichung von der Tumorfreiheit ein Ereignis: so bleibt
 * keine Codeliste je Statusfeld zu pflegen, und ein Wert, den diese Regel
 * nicht ausdrücklich kennt, fällt nicht stillschweigend durch.
 */
function istEreignis(eintrag: OncoBoxFollowUp): boolean {
  const benannterBefund =
    eintrag.localStatus === NACHWEIS ||
    eintrag.nodalStatus === NACHWEIS ||
    eintrag.distantStatus === NACHWEIS ||
    GESAMT_BEFUND.includes(eintrag.overallStatus ?? "") ||
    eintrag.secondTumorRaw === "J";
  if (benannterBefund) return true;
  if (!traegtAussage(eintrag)) return false;
  return !istTumorfrei(eintrag);
}

/** Trägt die Meldung überhaupt eine Aussage, sei es als Ereignis oder als sauberer Befund? */
function istAussagekraeftig(eintrag: OncoBoxFollowUp): boolean {
  return istEreignis(eintrag) || traegtAussage(eintrag);
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

function keineGrundlage(fall: OncoBoxCase): AusschlussGrund | null {
  if (!fall.diagnosisDate) return "keinDiagnosedatum";
  if (datierte(fall).length === 0) return "keinFollowUp";
  return null;
}

export const FAMILY_2_DFS: BoxRegel = {
  id: "family-2/dfs",
  quelle: QUELLE,
  // Die 2.0-Boxen schreiben keine Kurve vor. Was hier steht, folgt aus ihrer
  // eigenen Ereignisdefinition, ist aber nicht selbst Vorschrift.
  herkunft: "abgeleitet",
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
  ausschluss(fall) {
    const grund = keineGrundlage(fall);
    if (grund) return grund;
    // Einschluss nach EQ-Definition: R0, oder irgendwann einmal tumorfrei.
    const r0 = fall.ausschlussFelder.residualstatusGesamt === "R0";
    if (r0) return null;
    return datierte(fall).some(istTumorfrei) ? null : "postoperativNichtTumorfrei";
  },
  bewerte(fall) {
    const meldungen = datierte(fall).filter(istAussagekraeftig);
    const ereignis = meldungen.find(istEreignis);
    if (ereignis) return bewertung(fall, ereignis.date, true);
    if (fall.deathDate) return bewertung(fall, fall.deathDate, true);
    return bewertung(fall, meldungen[meldungen.length - 1]?.date ?? null, false);
  },
};

export const FAMILY_2_OAS: BoxRegel = {
  id: "family-2/oas",
  quelle: QUELLE,
  herkunft: "abgeleitet",
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
  // Für das Gesamtüberleben zählt die Tumorfreiheit nicht.
  ausschluss(fall) {
    return keineGrundlage(fall);
  },
  bewerte(fall) {
    if (fall.deathDate) return bewertung(fall, fall.deathDate, true);
    const meldungen = datierte(fall);
    return bewertung(fall, meldungen[meldungen.length - 1]?.date ?? null, false);
  },
};

// Die fünf übrigen Endpunkte stammen aus der Literatur, nicht aus dem
// Auswertungsblatt der Box, und stehen deshalb in einer eigenen Datei.
export {
  FAMILY_2_LRR,
  FAMILY_2_LRFS,
  FAMILY_2_MFS,
  FAMILY_2_PFS,
  FAMILY_2_PPS,
} from "./family-2-endpunkte";
