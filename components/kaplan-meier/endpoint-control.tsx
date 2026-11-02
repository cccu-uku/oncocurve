"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { type Patient } from "./obds-parser-new";
import { ENDPUNKTE, endpunkteFuerZentrum, kennzeichnungFuer } from "./endpunkte/registry";
import { TTFT_DATENSATZ, pruefeVerfuegbarkeit } from "./endpunkte/verfuegbarkeit";
import {
  ZENTRUMS_TYPEN,
  type EndpunktDefinition,
  type EndpunktId,
  type ZentrumsTyp,
} from "./endpunkte/typen";

interface EndpointControlProps {
  patients: Patient[];
  endpunkt: EndpunktId;
  /** null bedeutet freie Analyse: kein Zentrumstyp, keine Pflichtliste. */
  zentrumsTyp: ZentrumsTyp | null;
  onEndpunktChange: (id: EndpunktId) => void;
  onZentrumsTypChange: (typ: ZentrumsTyp) => void;
}

export function EndpointControl({
  patients,
  endpunkt,
  zentrumsTyp,
  onEndpunktChange,
  onZentrumsTypChange,
}: EndpointControlProps) {
  const t = useTranslations("Endpoint");
  const istZertifizierung = zentrumsTyp !== null;

  // Im Zertifizierungsmodus nur die Endpunkte des Zentrumstyps, in der freien
  // Analyse alle. Die Reihenfolge folgt der Registry, damit sie stabil bleibt.
  const sichtbare = useMemo(
    () => (zentrumsTyp ? endpunkteFuerZentrum(zentrumsTyp) : ENDPUNKTE),
    [zentrumsTyp],
  );

  const zustand = useMemo(
    () => new Map(sichtbare.map((e) => [e.id, pruefeVerfuegbarkeit(e, patients)])),
    [sichtbare, patients],
  );

  const sperrgrund = (id: EndpunktId): string | undefined => {
    const geprueft = zustand.get(id);
    if (!geprueft || geprueft.verfuegbar) return undefined;
    if (geprueft.grund === "regelFehlt") return t("lockedRule");
    // Keine Feldmeldung, sondern ein eigener Satz: dem Datensatz fehlt kein
    // Feld, er ist auf einen anderen Endpunkt ausgelegt.
    if (geprueft.fehlendesFeld === TTFT_DATENSATZ) return t("lockedTtftDataset");
    return t("lockedData", { field: geprueft.fehlendesFeld ?? "" });
  };

  // Pflicht und Alternative nur im Zertifizierungsmodus: in der freien Analyse
  // gibt es keine Pflichtendpunkte, dort wäre die Marke eine erfundene
  // Anforderung.
  const kennzeichen = (definition: EndpunktDefinition): string | null => {
    const art = kennzeichnungFuer(definition, zentrumsTyp);
    if (!art) return null;
    return art === "pflicht" ? t("required") : t("alternative");
  };

  return (
    // Kartenabstand hier überschrieben, nicht nur in Kopf und Inhalt: die
    // Karte selbst bringt "gap-6 py-6" mit (siehe card.tsx), das setzt den
    // Leerraum zwischen Kopf und Inhalt sowie den Rand oben und unten. Ohne
    // diese Überschreibung bliebe dieser Abstand gross, egal wie knapp Kopf
    // und Inhalt selbst gepolstert sind.
    <Card className="shrink-0 gap-2 py-3" data-tour="endpoint">
      <CardHeader className="py-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Target className="h-4 w-4" />
          {istZertifizierung ? t("titleCertification") : t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-0 px-3 space-y-3 text-sm">
        {istZertifizierung && (
          <div className="space-y-1">
            <Label>{t("centerType")}</Label>
            <Select value={zentrumsTyp} onValueChange={(v) => onZentrumsTypChange(v as ZentrumsTyp)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZENTRUMS_TYPEN.map((typ) => (
                  <SelectItem key={typ} value={typ}>
                    {t(`centers.${typ}`)} ({typ})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("centerTypeDetected")}</p>
          </div>
        )}

        <div className="space-y-1">
          {sichtbare.map((definition) => {
            const grund = sperrgrund(definition.id);
            const gesperrt = grund !== undefined;
            const marke = kennzeichen(definition);
            return (
              <label
                key={definition.id}
                title={grund}
                className={`flex items-start gap-2 rounded px-1 py-1 ${
                  gesperrt ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="endpunkt"
                  className="mt-1"
                  value={definition.id}
                  checked={endpunkt === definition.id}
                  disabled={gesperrt}
                  onChange={() => onEndpunktChange(definition.id)}
                />
                <span className="flex-1">
                  <span className="font-medium">{t(`names.${definition.labelKey}`)}</span>
                  <span className="text-muted-foreground"> ({definition.kuerzel})</span>
                  {marke && (
                    <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[calc(10px*var(--schrift-faktor,1))] uppercase tracking-wide text-muted-foreground">
                      {marke}
                    </span>
                  )}
                  {gesperrt && <span className="block text-xs text-muted-foreground">{grund}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
