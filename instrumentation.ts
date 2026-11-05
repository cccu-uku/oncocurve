// Prüft beim Serverstart einmal die Betreiberangaben (config/betreiber.json),
// damit eine fehlerhafte Datei sofort im Log auffällt.
//
// Der Fehler wird bewusst nicht weitergeworfen: Next.js 16.4 beendet den
// Prozess dann nicht, sondern beantwortet jede Anfrage mit 500. Ohne Weiterwerfen
// greifen die Rückfallebenen in Kopfzeile (ohne Logo) und Impressum (Hinweis).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ladeBetreiber, logoVorhanden } = await import("./lib/betreiber");
  try {
    const betreiber = await ladeBetreiber();
    console.log(
      betreiber
        ? "[oncocurve] Betreiberangaben: geladen"
        : "[oncocurve] Betreiberangaben: keine (config/betreiber.json fehlt)"
    );
    if (betreiber?.logo && !(await logoVorhanden(betreiber.logo.datei))) {
      console.warn(`[oncocurve] Logodatei fehlt oder ist nicht lesbar: ${betreiber.logo.datei} (im Ordner der betreiber.json), Kopfzeile ohne Logo`);
    }
  } catch (fehler) {
    console.error(`[oncocurve] Betreiberangaben fehlerhaft: ${(fehler as Error).message}`);
  }
}
