"use client";

import { useTranslations } from "next-intl";
import type { Kohortenaufstellung } from "./endpunkte/boxregeln/kohortenaufstellung";

interface BoxkennzahlenProps {
  /** null heisst: für diese Box gibt es kein Auswertungsblatt. */
  aufstellung: Kohortenaufstellung | null;
}

/** Anteil an den Primärfällen, eine Nachkommastelle wie im Auswertungsblatt. */
function prozent(anzahl: number, gesamt: number): string {
  if (gesamt <= 0) return "0.0%";
  return `${((anzahl / gesamt) * 100).toFixed(1)}%`;
}

/**
 * Die Aufstellung, die die Auswertungsblätter der 1.0-Boxen neben der Kurve
 * verlangen: von den Primärfällen über die Ausschlüsse je Grund zur
 * Risikomenge, dann deren Aufteilung.
 *
 * Ohne Auswertungsblatt steht hier ein Hinweis statt einer Tabelle. Die
 * 2.0-Boxen werden noch entwickelt, es liegen dort bislang keine Definitionen
 * zur Überlebensanalyse vor; irgendetwas zu rechnen und als Kennzahl der Box
 * auszugeben wäre eine Behauptung über eine Vorschrift, die es nicht gibt.
 */
export default function Boxkennzahlen({ aufstellung }: BoxkennzahlenProps) {
  const t = useTranslations("OncoBox.metrics");

  if (!aufstellung) {
    return (
      <div className="rounded-lg border-2 p-4 bg-white/50 dark:bg-neutral-800/70">
        <div className="km-card-title">{t("noSpecTitle")}</div>
        <p className="km-label mt-1">{t("noSpec")}</p>
      </div>
    );
  }

  const a = aufstellung;
  const gesamt = a.primaerfaelle;
  const kategorien: { schluessel: string; anzahl: number }[] = [
    { schluessel: "withEvent", anzahl: a.mitEreignis },
    { schluessel: "competingEvent", anzahl: a.konkurrenzereignis },
    { schluessel: "censoredAlive", anzahl: a.zensiertLebend },
    { schluessel: "censoredDeceased", anzahl: a.zensiertVerstorben },
    { schluessel: "unrated", anzahl: a.ohneBewertung },
  ].filter((zeile) => zeile.anzahl > 0);

  return (
    <div className="rounded-lg border-2 p-4 bg-white/50 dark:bg-neutral-800/70">
      <div className="km-card-title">{t("title")}</div>
      <p className="km-label mt-0.5">{t("subtitle")}</p>

      <table className="mt-3 w-full text-xs tabular-nums">
        <tbody>
          <tr className="border-b">
            <td className="py-1 font-medium">{t("primaryCases")}</td>
            <td className="py-1 text-right font-medium">{gesamt}</td>
            <td className="w-16 py-1 text-right text-muted-foreground">100.0%</td>
          </tr>
          {a.ausschluesse.map((zeile) => (
            <tr key={zeile.grund}>
              <td className="py-1 pl-4 text-muted-foreground">
                &minus; {t(`exclusion.${zeile.grund}`)}
              </td>
              <td className="py-1 text-right">{zeile.anzahl}</td>
              <td className="py-1 text-right text-muted-foreground">
                {prozent(zeile.anzahl, gesamt)}
              </td>
            </tr>
          ))}
          {a.ausschluesse.length > 1 && (
            <tr>
              <td className="py-1 pl-4 text-muted-foreground">{t("excludedTotal")}</td>
              <td className="py-1 text-right">{a.ausgeschlossen}</td>
              <td className="py-1 text-right text-muted-foreground">
                {prozent(a.ausgeschlossen, gesamt)}
              </td>
            </tr>
          )}
          <tr className="border-t border-b">
            <td className="py-1 font-medium">= {t("atRisk")}</td>
            <td className="py-1 text-right font-medium">{a.unterRisiko}</td>
            <td className="py-1 text-right text-muted-foreground">
              {prozent(a.unterRisiko, gesamt)}
            </td>
          </tr>
          {kategorien.map((zeile) => (
            <tr key={zeile.schluessel}>
              <td className="py-1 pl-4 text-muted-foreground">{t(zeile.schluessel)}</td>
              <td className="py-1 text-right">{zeile.anzahl}</td>
              <td className="py-1 text-right text-muted-foreground">
                {prozent(zeile.anzahl, gesamt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="km-label mt-2">{t("cohortNote")}</p>
    </div>
  );
}
