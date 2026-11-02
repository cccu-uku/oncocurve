import type { OncoBoxCase, OncoBoxFollowUp } from "../../oncobox/types";
import type { AusschlussGrund, BoxBewertung, BoxRegel, SchaetzerArt } from "./typen";
import { tageZwischen } from "./zeit";

/**
 * Verlaufsfelder, die ein Ereignis belegen können. Ein Zweittumor gehört
 * bewusst nicht dazu: er ist weder ein Lokalrezidiv noch eine Fernmetastase
 * noch eine Progression der Grunderkrankung und zählt bei keinem der fünf
 * Endpunkte hier mit. Die beiden vorgeschriebenen Endpunkte je Box werten
 * ihn eigens, weil ihr Prüfschema ihn ausdrücklich nennt.
 */
export type Verlaufsfeld = "lokal" | "lymphknoten" | "fern" | "gesamt" | "biochemisch";

/**
 * Wie eine Box ihre Verlaufscodes schreibt. Jede Box beschreibt das einmal,
 * und die Fabrik baut daraus ihre fünf übrigen Endpunkte. Ohne diese Trennung
 * stünden zwanzig fast gleiche Funktionen nebeneinander, und ein Codewert
 * wäre an zwanzig Stellen zu pflegen.
 */
export interface BoxCodes {
  /** Code, der einen Nachweis in lokal, Lymphknoten oder fern belegt. */
  nachweis: string;
  /** Code der Gesamtbeurteilung für Progression. null, wo die Box keinen führt. */
  progression: string | null;
  /** Code des biochemischen Rezidivs. Nur Prostata führt eines. */
  biochemisch: string | null;
}

export interface VerlaufsMuster {
  boxId: string;
  endpunkt: string;
  quelle: string;
  codes: BoxCodes;
  /** Felder, deren Nachweis das Ereignis auslöst. */
  felder: Verlaufsfeld[];
  todAlsEreignis: boolean;
  /**
   * Die Box meldet den Tod über den Vitalstatus im Verlauf und führt kein
   * Sterbedatum am Fall. Darm 1.0 ist so gebaut; sein Prüfschema kennt weder
   * am Patienten noch am Fall ein Sterbedatum. Ohne dieses Merkmal bliebe der
   * Tod dort unsichtbar und drei Endpunkte fielen um die gesamte
   * Sterblichkeit der Kohorte zu günstig aus.
   */
  todImVerlauf?: boolean;
  schaetzer: SchaetzerArt;
  beobachtungsfensterTage: number | null;
  /** Nur Fälle mit Progression, für PPS. Startzeit ist dann die Progression. */
  startBeiProgression?: boolean;
}

function datierte(fall: OncoBoxCase): (OncoBoxFollowUp & { date: string })[] {
  return fall.followUps
    .filter((e): e is OncoBoxFollowUp & { date: string } => Boolean(e.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function trifft(eintrag: OncoBoxFollowUp, feld: Verlaufsfeld, codes: BoxCodes): boolean {
  switch (feld) {
    case "lokal":
      return eintrag.localStatus === codes.nachweis;
    case "lymphknoten":
      return eintrag.nodalStatus === codes.nachweis;
    case "fern":
      return eintrag.distantStatus === codes.nachweis;
    case "gesamt":
      return codes.progression !== null && eintrag.overallStatus === codes.progression;
    case "biochemisch":
      return codes.biochemisch !== null && eintrag.biochemicalRecurrence === codes.biochemisch;
  }
}

/** Baut die Regel eines Endpunkts aus den Codes einer Box. */
export function verlaufsRegel(muster: VerlaufsMuster): BoxRegel {
  const treffer = (eintrag: OncoBoxFollowUp): boolean =>
    muster.felder.some((feld) => trifft(eintrag, feld, muster.codes));

  // Sterbedatum des Falls, sonst die erste Meldung mit Vitalstatus verstorben.
  // Die Meldungen sind aufsteigend sortiert, die erste ist also der früheste
  // dokumentierte Todeszeitpunkt.
  const sterbeDatum = (fall: OncoBoxCase): string | null => {
    if (fall.deathDate) return fall.deathDate;
    if (!muster.todImVerlauf) return null;
    return datierte(fall).find((e) => e.vitalStatus === "dead")?.date ?? null;
  };

  const progressionsMeldung = (fall: OncoBoxCase) =>
    muster.codes.progression === null
      ? undefined
      : datierte(fall).find((e) => e.overallStatus === muster.codes.progression);

  return {
    id: `${muster.boxId}/${muster.endpunkt}`,
    quelle: muster.quelle,
    herkunft: "literatur",
    schaetzer: muster.schaetzer,
    beobachtungsfensterTage: muster.beobachtungsfensterTage,
    ausschluss(fall): AusschlussGrund | null {
      if (!fall.diagnosisDate) return "keinDiagnosedatum";
      if (datierte(fall).length === 0) return "keinFollowUp";
      // PPS wertet nur Fälle mit Progression aus. Wer keine hatte, gehört
      // nicht in die Kohorte; das ist eine andere Menge als bei allen
      // übrigen Endpunkten und muss es auch sein.
      if (muster.startBeiProgression && !progressionsMeldung(fall)) return "keineProgression";
      return null;
    },
    bewerte(fall): BoxBewertung | null {
      const meldungen = datierte(fall);
      const start = muster.startBeiProgression
        ? (progressionsMeldung(fall)?.date ?? null)
        : fall.diagnosisDate;
      if (!start) return null;

      const bis = (datum: string | null, ereignis: boolean): BoxBewertung | null => {
        if (!datum) return null;
        const zeitTage = tageZwischen(start, datum);
        if (zeitTage === null) return null;
        return { zeitTage, ereignis, datum };
      };

      const auffaellig = meldungen.find(treffer);
      if (auffaellig) return bis(auffaellig.date, true);
      const tod = sterbeDatum(fall);
      if (muster.todAlsEreignis && tod) return bis(tod, true);
      // Bei der Lokalrezidivrate ist der Tod ein konkurrierendes Ereignis:
      // der Fall endet, aber nicht durch das Ereignis von Interesse. Als
      // Zensierung gemeldet hieße er "könnte noch eines bekommen".
      if (muster.schaetzer === "kumulativeInzidenz" && tod) {
        const beendet = bis(tod, false);
        return beendet ? { ...beendet, konkurrenz: true } : null;
      }
      return bis(meldungen[meldungen.length - 1]?.date ?? null, false);
    },
  };
}
