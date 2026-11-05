import { ladeBetreiber, ladeLogo } from "@/lib/betreiber";
import { LOGO_CSP } from "@/lib/sicherheits-header";

// Logo des Betreibers aus dem Ordner der Betreiberdatei (config/), bei jeder
// Anfrage neu gelesen, damit ein ausgetauschtes Logo ohne Neustart erscheint.
export const dynamic = "force-dynamic";

export async function GET() {
  let logo: Awaited<ReturnType<typeof ladeLogo>> = null;
  try {
    const datei = (await ladeBetreiber())?.logo?.datei;
    if (datei) logo = await ladeLogo(datei);
  } catch (fehler) {
    console.error("[oncocurve] Logo nicht lesbar:", (fehler as Error).message);
  }
  if (!logo) return new Response(null, { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": logo.typ,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": LOGO_CSP,
  };
  // img-Tags ignorieren das; ein direkter Aufruf lädt das SVG herunter statt es darzustellen.
  if (logo.typ === "image/svg+xml") headers["Content-Disposition"] = "attachment";
  return new Response(new Uint8Array(logo.inhalt), { headers });
}
