import { ladeBetreiber, type Abschnitt } from "@/lib/betreiber";
import ImpressumInhalt, { type ImpressumZustand } from "./impressum-inhalt";

// Die Impressumsangaben stammen aus config/betreiber.json der jeweiligen
// Instanz und werden bei jeder Anfrage gelesen, nicht beim Build.
export const dynamic = "force-dynamic";

export default async function ImpressumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  let abschnitte: Abschnitt[] | null = null;
  let zustand: ImpressumZustand;
  try {
    const betreiber = await ladeBetreiber();
    if (betreiber) {
      abschnitte = betreiber.impressum[locale === "en" ? "en" : "de"];
      zustand = "ok";
    } else {
      zustand = "fehlt";
    }
  } catch (fehler) {
    console.error("[oncocurve] Betreiberangaben nicht lesbar, Impressum ohne Angaben:", (fehler as Error).message);
    zustand = "fehlerhaft";
  }

  return <ImpressumInhalt abschnitte={abschnitte} zustand={zustand} />;
}
