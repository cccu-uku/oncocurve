"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

interface HilfeKachelProps {
  titel: string;
  icon: React.ReactNode;
  /** Blauton der Kopfleiste, siehe .hilfe-ton-* in globals.css. */
  ton: 1 | 2 | 3;
  children: React.ReactNode;
}

/**
 * Ein Thema der Hilfeseite als eigenständige Kachel.
 *
 * Vorher lagen alle dreizehn Themen als Abschnitte in einer einzigen Karte,
 * durch Haarlinien getrennt, in einer Spalte untereinander. Wer etwas suchte,
 * musste an allem vorbeiscrollen.
 *
 * Alle Kacheln sind gleich breit und liegen in zwei Spalten, die unabhängig
 * voneinander wachsen. Dadurch stehen sie versetzt statt in starren Reihen,
 * und keine Kachel zieht sich mehr über die ganze Seite. Die eingefärbte
 * Kopfleiste trennt sie auch dann, wenn zwei Nachbarn unterschiedlich hoch
 * sind.
 */
export function HilfeKachel({ titel, icon, ton, children }: HilfeKachelProps): React.ReactElement {
  return (
    <Card className="hilfe-kachel gap-0 overflow-hidden py-0">
      <CardHeader className={`hilfe-ton-${ton} border-b px-4 py-3`}>
        <CardTitle className="km-card-title flex items-center gap-2">
          {icon}
          {titel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 py-4 text-sm leading-6">{children}</CardContent>
    </Card>
  );
}
