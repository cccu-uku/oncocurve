import { NextResponse } from "next/server";
import { pruefeFreigaben, sicherheitsHeader } from "@/lib/sicherheits-header";

// Header nur einmal je Wert von FRAME_ANCESTORS berechnen; die Warnung über
// verworfene Werte erscheint dadurch genau einmal.
let letzterWert: string | undefined;
let zwischenspeicher: Record<string, string> | undefined;

function aktuelleHeader(): Record<string, string> {
  const wert = process.env.FRAME_ANCESTORS;
  if (zwischenspeicher && wert === letzterWert) return zwischenspeicher;
  const { verworfen } = pruefeFreigaben(wert);
  if (verworfen.length > 0) {
    console.warn(`[oncocurve] FRAME_ANCESTORS: ignoriert (kein gültiger Ursprung): ${verworfen.join(" ")}`);
  }
  letzterWert = wert;
  zwischenspeicher = sicherheitsHeader({
    frameAncestors: wert,
    produktion: process.env.NODE_ENV === "production",
  });
  return zwischenspeicher;
}

export function proxy() {
  const antwort = NextResponse.next();
  for (const [name, wert] of Object.entries(aktuelleHeader())) antwort.headers.set(name, wert);
  return antwort;
}

// Alles außer den Build-Assets und dem Favicon, auch 404-Seiten mit Dateiendung.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon[.]ico).*)"],
};
