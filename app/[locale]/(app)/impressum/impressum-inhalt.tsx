"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { Abschnitt } from "@/lib/betreiber";
import { verlinke } from "@/lib/verlinke";
import { useTranslations } from "next-intl";
import React from "react";

export type ImpressumZustand = "ok" | "fehlt" | "fehlerhaft";

interface ImpressumInhaltProps {
  abschnitte: Abschnitt[] | null;
  zustand: ImpressumZustand;
}

const renderLines = (value: string) =>
  value.split("\n").map((line, index, arr) => (
    <React.Fragment key={`${line}-${index}`}>
      {line}
      {index < arr.length - 1 ? <br /> : null}
    </React.Fragment>
  ));

// Wie renderLines, zusätzlich mit Links für Web- und E-Mail-Adressen.
const renderLinkedLines = (value: string) =>
  value.split("\n").map((line, index, arr) => (
    <React.Fragment key={`${line}-${index}`}>
      {verlinke(line).map((teil, i) =>
        teil.href === undefined ? (
          <React.Fragment key={i}>{teil.text}</React.Fragment>
        ) : (
          <a key={i} className="underline hover:no-underline" href={teil.href} target="_blank" rel="noreferrer">
            {teil.text}
          </a>
        )
      )}
      {index < arr.length - 1 ? <br /> : null}
    </React.Fragment>
  ));

export default function ImpressumInhalt({ abschnitte, zustand }: ImpressumInhaltProps) {
  const t = useTranslations("Impressum");

  const hinweis = zustand === "fehlerhaft" ? "invalidConfig" : "notConfigured";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 text-sm leading-6 text-justify">
          {/* Einführung */}
          <section className="space-y-2">
            <p className="text-muted-foreground">
              {t("intro")}
            </p>
          </section>

          {/* Angaben des Betreibers dieser Instanz */}
          {zustand === "ok" && abschnitte ? (
            <section className="space-y-6">
              {abschnitte.map((abschnitt, index) => (
                <div key={`${abschnitt.titel}-${index}`} className="space-y-2">
                  <h2 className="text-base font-semibold">{abschnitt.titel}</h2>
                  <p className="text-muted-foreground">{renderLinkedLines(abschnitt.text)}</p>
                </div>
              ))}
            </section>
          ) : (
            <section className="space-y-2" role="status">
              <h2 className="text-lg font-semibold text-foreground">{t(`${hinweis}.title`)}</h2>
              <p className="text-muted-foreground">{t(`${hinweis}.body`)}</p>
            </section>
          )}

          <div className="h-px bg-border" />

          {/* Allgemeine Hinweise zur Software */}
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-base font-semibold">{t("copyrightLaw.title")}</h2>
              <p className="text-muted-foreground">
                {renderLines(t("copyrightLaw.body"))}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold">{t("copyright.title")}</h2>
              <div className="text-muted-foreground space-y-2">
                <p>{renderLines(t("copyright.body"))}</p>
                <p>
                  {t("copyright.source")}{" "}
                  <a className="underline hover:no-underline" href="https://github.com/cccu-uku/oncocurve" target="_blank" rel="noreferrer">
                    github.com/cccu-uku/oncocurve
                  </a>
                </p>
                <p>
                  {t("copyright.thirdParty")}{" "}
                  <a className="underline hover:no-underline" href="/THIRD_PARTY_LICENSES.txt" target="_blank" rel="noreferrer">
                    THIRD_PARTY_LICENSES.txt
                  </a>
                </p>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
