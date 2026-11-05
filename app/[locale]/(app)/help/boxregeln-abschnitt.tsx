"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Wo die hier zitierten Spezifikationen veröffentlicht werden.
 *
 * Es sind die Dateien mit "_spez xml-oncobox" im Namen, und die gibt die
 * OnkoZert GmbH auf ihrer Herstellerseite heraus, zusammen mit den
 * Prüfschemata und den Musterlösungen, aus denen auch unsere Beispieldateien
 * stammen (siehe public/oncobox-samples/SOURCE.md).
 *
 * Nicht die Übersichtsseite der DKG: dort liegen die Erhebungs- und
 * Kennzahlenbögen der Zertifizierung, ein anderer Satz Unterlagen. Die stehen
 * eigens unter "Wo die Originale liegen" in der Kachel Beispieldateien.
 *
 * Verlinkt ist die Seite, nicht die einzelne Datei: die Fassungen wechseln mit
 * dem Auditjahr, und eine selbst zusammengebaute Direktadresse wäre geraten.
 */
const SPEZIFIKATIONEN_URL = "https://www.xml-oncobox.de/de/Home/FuerHersteller";

/** Ein Block je Box: Überschrift, Fundstelle, Aufzählung. */
function Block({
  titel,
  quelle,
  punkte,
}: {
  titel: string;
  quelle: string;
  punkte: string[];
}): React.ReactElement {
  return (
    <>
      <h4 className="text-sm font-semibold">{titel}</h4>
      <p className="text-xs text-muted-foreground">
        <a
          href={SPEZIFIKATIONEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1 underline underline-offset-2 hover:no-underline"
        >
          <span>{quelle}</span>
          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
        </a>
      </p>
      <ul className="list-disc pl-5 text-muted-foreground space-y-1">
        {punkte.map((punkt) => (
          <li key={punkt}>{punkt}</li>
        ))}
      </ul>
    </>
  );
}

/**
 * Rechenregeln der OncoBoxen auf der Hilfeseite. Eigene Datei, weil die
 * Hilfeseite ohne sie schon 551 Zeilen trägt. Überschrift und Symbol trägt
 * die umgebende Kachel, sonst stünde der Titel zweimal untereinander.
 */
export function BoxregelnAbschnitt(): React.ReactElement {
  const t = useTranslations("Help");
  const p = (schluessel: string): string => t(`boxregeln.${schluessel}`);
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">{p("body")}</p>
      <p className="text-muted-foreground">{p("unitNote")}</p>
      <p className="text-muted-foreground">{p("estimator")}</p>
      <p className="text-xs text-muted-foreground">{p("quellenHinweis")}</p>

      <h4 className="text-sm font-semibold">{p("originTitle")}</h4>
      <p className="text-muted-foreground">{p("originBody")}</p>

      <Block
        titel={p("brust.title")}
        quelle={p("brust.source")}
        punkte={[p("brust.excluded"), p("brust.event"), p("brust.death")]}
      />
      <Block
        titel={p("darm.title")}
        quelle={p("darm.source")}
        punkte={[
          p("darm.excluded"),
          p("darm.event"),
          p("darm.death"),
          p("darm.window"),
          p("darm.unknown"),
        ]}
      />
      <Block
        titel={p("prostata.title")}
        quelle={p("prostata.source")}
        punkte={[
          p("prostata.excluded"),
          p("prostata.event"),
          p("prostata.dates"),
          p("prostata.validity"),
        ]}
      />
      <Block
        titel={p("familie2.title")}
        quelle={p("familie2.source")}
        punkte={[
          p("familie2.note"),
          p("familie2.event"),
          p("familie2.unknown"),
          p("familie2.notTaken"),
        ]}
      />

      <h4 className="text-sm font-semibold">{p("weitere.title")}</h4>
      <p className="text-muted-foreground">{p("weitere.body")}</p>
      <ul className="list-disc pl-5 text-muted-foreground space-y-1">
        <li>{p("weitere.rate")}</li>
        <li>{p("weitere.difference")}</li>
        <li>{p("weitere.gap")}</li>
      </ul>

      <h4 className="text-sm font-semibold">{p("differences.title")}</h4>
      <ul className="list-disc pl-5 text-muted-foreground space-y-1">
        <li>{p("differences.deathDate")}</li>
        <li>{p("differences.window")}</li>
        <li>{p("differences.codes")}</li>
        <li>{p("differences.extra")}</li>
      </ul>
    </div>
  );
}
