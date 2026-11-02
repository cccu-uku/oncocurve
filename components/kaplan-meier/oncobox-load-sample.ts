const SAMPLES_BASE_PATH = "/oncobox-samples";

/** Lädt eine Musterlösung als Datei, damit sie denselben Weg wie ein
 *  hochgeladenes XML nimmt (siehe onFileSelected in OncoBoxTab). */
export async function loadOncoBoxSample(fileName: string): Promise<File> {
  const response = await fetch(`${SAMPLES_BASE_PATH}/${fileName}`);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "text/xml" });
}
