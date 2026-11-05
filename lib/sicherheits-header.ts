// CSP und X-Frame-Options, die je Betreiber verschieden sein können. Werden zur
// Laufzeit im Proxy gesetzt (proxy.ts), damit ein fertiges Image ohne Neubau
// konfigurierbar bleibt. 'unsafe-inline' bei script-src ist nötig, weil Next.js
// und next-themes Inline-Skripte setzen.

export interface SicherheitsOptionen {
  /** Durch Leerzeichen getrennte Ursprünge, die ONCOcurve einbetten dürfen. */
  frameAncestors: string | undefined;
  /** Im Entwicklungsmodus braucht Next.js eval, daher dort keine CSP. */
  produktion: boolean;
}

// http(s)-Host-Quelle, optional mit Wildcard-Subdomain und Wildcard-Port.
const URSPRUNG = /^https?:\/\/(\*\.)?[a-z0-9.-]+(:(\d+|\*))?$/i;

/** Trennt die Freigabeliste in gültige Ursprünge und verworfene Werte. */
export function pruefeFreigaben(frameAncestors: string | undefined): { gueltig: string[]; verworfen: string[] } {
  const gueltig: string[] = [];
  const verworfen: string[] = [];
  for (const wert of (frameAncestors ?? "").split(/\s+/).filter(Boolean)) {
    const ursprung = wert.replace(/\/$/, "");
    if (URSPRUNG.test(ursprung)) gueltig.push(ursprung);
    else verworfen.push(wert);
  }
  return { gueltig, verworfen };
}

export function sicherheitsHeader({ frameAncestors, produktion }: SicherheitsOptionen): Record<string, string> {
  const freigaben = pruefeFreigaben(frameAncestors).gueltig;
  const header: Record<string, string> = {};
  if (freigaben.length === 0) header["X-Frame-Options"] = "SAMEORIGIN";
  if (produktion) {
    header["Content-Security-Policy"] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      `frame-ancestors ${["'self'", ...freigaben].join(" ")}`,
    ].join("; ");
  }
  return header;
}

/** Adresse, unter der die App das Betreiber-Logo ausliefert. */
export const LOGO_PFAD = "/api/betreiber-logo";

/** Das Logo kann ein SVG sein: beim direkten Aufruf darf darin nichts laufen oder nachladen. */
export const LOGO_CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; frame-ancestors 'self'";

/** Erkennt die Logo-Adresse auch prozentkodiert oder mit Schrägstrich am Ende (Next.js routet beides dorthin). */
export function istLogoPfad(pfad: string): boolean {
  let p = pfad;
  try { p = decodeURIComponent(p); } catch { /* ungültige Kodierung: unverändert vergleichen */ }
  return p.replace(/\/+$/, "") === LOGO_PFAD;
}
