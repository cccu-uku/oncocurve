import type { OncoBoxCase, OncoBoxFollowUp } from "../../oncobox/types";
import type { AusschlussGrund, BoxBewertung, BoxRegel } from "./typen";
import { tageZwischen } from "./zeit";

const QUELLE_DFS =
  "eb_brust-N1.1.1_spez xml-oncobox-A1 (251203).xlsx, Blätter Kaplan-Meier (DFS)";
const QUELLE_OAS =
  "eb_brust-N1.1.1_spez xml-oncobox-A1 (251203).xlsx, Blätter Kaplan-Meier (OAS)";

/** Randstatus, die einen Residualtumor belegen. RX heißt nicht beurteilbar. */
const RAND_POSITIV = ["R1", "R2"];

/**
 * Follow-ups mit Datum, aufsteigend. Ohne Datum ist keine Zeit ableitbar.
 *
 * Bewusst nicht exportiert und in darm-1.ts noch einmal geschrieben: die
 * Boxregeln borgen nichts voneinander. Was bei Brust ein gültiges Follow-up
 * ist, entscheidet die Brust-Spezifikation, und eine geteilte Fassung würde
 * beide Boxen aneinanderbinden, sobald eine von ihnen sich ändert.
 */
function datierteFollowUps(fall: OncoBoxCase): (OncoBoxFollowUp & { date: string })[] {
  return fall.followUps.filter((eintrag): eintrag is OncoBoxFollowUp & { date: string } =>
    Boolean(eintrag.date),
  );
}

function postoperativNichtTumorfrei(fall: OncoBoxCase): boolean {
  const m = fall.staging.pM ?? "";
  const rand = fall.ausschlussFelder.residualstatusLokal ?? "";
  return m.startsWith("M1") || RAND_POSITIV.includes(rand);
}

/**
 * Zulässige Werte je Statusfeld einer gültigen Meldung, aus dem Blatt
 * Kaplan-Meier (DFS). Die Listen unterscheiden sich zwischen den Feldern: nur
 * die Fernmetastasen kennen neben Nachweis und kein Nachweis auch M.
 */
const MELDUNG_LOKAL = ["K", "R"];
const MELDUNG_LYMPHKNOTEN = ["K", "R"];
const MELDUNG_FERN = ["K", "R", "M"];
const MELDUNG_GESAMT = ["VR", "TR", "NC", "P"];
const MELDUNG_ZWEITTUMOR = ["J", "N"];

/**
 * Zulässige Herkunft der Meldung. Anders als bei den übrigen Feldern gilt X
 * hier unabhängig vom Vitalstatus, das Blatt führt es als dritten
 * gleichberechtigten Wert neben K und Z, nicht als Ausnahme für Verstorbene.
 */
const MELDUNG_QUELLE = ["K", "Z", "X"];

/** Code für "unbekannt", den die Box allein bei Verstorbenen zulässt. */
const UNBEKANNT = "X";

/**
 * Gültige Follow-up-Meldung nach dem Auswertungsblatt der Box, achtzehn
 * Zeilen mit einer Aufteilung nach Vitalstatus.
 *
 * Der Unterschied zwischen Lebenden und Verstorbenen ist Absicht: bei einem
 * Lebenden ist "unbekannt" unzulässig, bei einem Verstorbenen erlaubt. Die Box
 * verlangt für wen sie noch beobachtet vollständige Angaben und lässt bei
 * Abgeschlossenen Lücken zu, dafür muss dort ein Sterbedatum stehen.
 *
 * Fälle ohne eine solche Meldung zieht die Box von der Risikomenge ab. Ohne
 * diese Prüfung stünden in der Kurve mehr Fälle, als das Zentrum meldet.
 *
 * Die Herkunft der Meldung fehlt in keiner Musterzeile, das Blatt selbst
 * äußert sich nicht dazu, ob ein leeres oder fehlendes Feld noch gültig ist.
 * Diese Prüfung liest das wörtlich: eine fehlende Angabe ist keiner der drei
 * zulässigen Werte und macht die Meldung ungültig, wie bei jedem anderen
 * Statusfeld dieser Tabelle auch. Das ist eine Auslegung, keine Vorgabe des
 * Blatts, und eine Anfrage bei der zertifizierenden Stelle könnte sie klären.
 */
function gueltigeMeldung(eintrag: OncoBoxFollowUp, fall: OncoBoxCase): boolean {
  if (!eintrag.date) return false;
  // Ein Code außerhalb des Prüfschemas kommt als null an. Er ist keine Angabe
  // und darf nicht stillschweigend als "lebend" durchgehen.
  if (eintrag.vitalStatus === null) return false;
  const tot = eintrag.vitalStatus === "dead";
  if (tot !== Boolean(fall.deathDate)) return false;

  const pruefe = (wert: string | null, erlaubt: string[]): boolean => {
    if (wert === null) return false;
    if (tot && wert === UNBEKANNT) return true;
    return erlaubt.includes(wert);
  };

  return (
    pruefe(eintrag.localStatus, MELDUNG_LOKAL) &&
    pruefe(eintrag.nodalStatus, MELDUNG_LYMPHKNOTEN) &&
    pruefe(eintrag.distantStatus, MELDUNG_FERN) &&
    pruefe(eintrag.overallStatus, MELDUNG_GESAMT) &&
    pruefe(eintrag.secondTumorRaw, MELDUNG_ZWEITTUMOR) &&
    pruefe(eintrag.quelleFollowUp, MELDUNG_QUELLE)
  );
}

function keineGrundlage(fall: OncoBoxCase): AusschlussGrund | null {
  if (!fall.diagnosisDate) return "keinDiagnosedatum";
  if (!datierteFollowUps(fall).some((eintrag) => gueltigeMeldung(eintrag, fall))) {
    return "keinFollowUp";
  }
  return null;
}

/** Statuscode, der ein Rezidiv belegt. K heißt kein Nachweis, X unbekannt. */
const REZIDIV = "R";

/**
 * Erstes Follow-up der Kategorie A: lokales Rezidiv, Lymphknotenrezidiv,
 * Fernmetastasen oder Zweittumor. Der Zweittumor steht ausdrücklich in der
 * Spezifikation, obwohl er nach üblicher Lesart kein Rezidiv ist.
 */
function erstesRezidiv(fall: OncoBoxCase): (OncoBoxFollowUp & { date: string }) | null {
  for (const eintrag of datierteFollowUps(fall)) {
    const rezidiv =
      eintrag.localStatus === REZIDIV ||
      eintrag.nodalStatus === REZIDIV ||
      eintrag.distantStatus === REZIDIV ||
      eintrag.secondTumor === true;
    if (rezidiv) return eintrag;
  }
  return null;
}

function letztesFollowUp(fall: OncoBoxCase): (OncoBoxFollowUp & { date: string }) | null {
  const datiert = datierteFollowUps(fall);
  return datiert.length > 0 ? datiert[datiert.length - 1] : null;
}

/** Bewertung aus Diagnosedatum und Enddatum, null wenn die Zeit nicht trägt. */
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

export const BRUST_1_DFS: BoxRegel = {
  id: "brust-1/dfs",
  quelle: QUELLE_DFS,
  // Wörtlich aus dem Auswertungsblatt der Box, nicht abgeleitet.
  herkunft: "spezifikation",
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
  ausschluss(fall) {
    if (postoperativNichtTumorfrei(fall)) return "postoperativNichtTumorfrei";
    if (fall.ausschlussFelder.krebsvorerkrankung === "J") return "krebsvorerkrankung";
    return keineGrundlage(fall);
  },
  bewerte(fall) {
    const rezidiv = erstesRezidiv(fall);
    if (rezidiv) return bewertung(fall, rezidiv.date, true);
    // Kategorie C: kein Rezidivhinweis, aber verstorben. Die Zeit läuft bis
    // zum Sterbedatum, nicht bis zum letzten Follow-up.
    if (fall.deathDate) return bewertung(fall, fall.deathDate, true);
    return bewertung(fall, letztesFollowUp(fall)?.date ?? null, false);
  },
};

export const BRUST_1_OAS: BoxRegel = {
  id: "brust-1/oas",
  quelle: QUELLE_OAS,
  // Wörtlich aus dem Auswertungsblatt der Box, nicht abgeleitet.
  herkunft: "spezifikation",
  schaetzer: "kaplanMeier",
  beobachtungsfensterTage: null,
  // Das OAS-Blatt zieht allein Fälle ohne gültige Follow-up-Meldung ab. Die
  // Bedingung "postoperativ tumorfrei" gehört zum krankheitsfreien Überleben
  // und hat hier nichts zu suchen.
  ausschluss(fall) {
    return keineGrundlage(fall);
  },
  // Zwei Kategorien statt drei: verstorben ist Ereignis, lebend ist Zensierung.
  // Ein Rezidiv ändert daran nichts.
  bewerte(fall) {
    if (fall.deathDate) return bewertung(fall, fall.deathDate, true);
    return bewertung(fall, letztesFollowUp(fall)?.date ?? null, false);
  },
};

// Die fünf übrigen Endpunkte stammen aus der Literatur, nicht aus dem
// Auswertungsblatt der Box, und stehen deshalb in einer eigenen Datei.
export { BRUST_1_LRR, BRUST_1_LRFS, BRUST_1_MFS } from "./brust-1-endpunkte";
