const MILLISEKUNDEN_PRO_TAG = 1000 * 60 * 60 * 24;

/**
 * Ganze Tage zwischen zwei ISO-Datumsangaben, die einzige Datumsarithmetik
 * dieses Zweigs. Die Boxspezifikationen rechnen ausschließlich in Tagen; eine
 * Umrechnung in Monate gehört erst an die Anzeige.
 *
 * null steht für "nicht berechenbar": fehlendes, unlesbares oder in der
 * Reihenfolge vertauschtes Datum. Ein Ereignis vor der Diagnose ist ein
 * Datenfehler und darf nicht als Zeit null in die Kurve laufen, wo es wie ein
 * Ereignis am Tag der Diagnose aussähe.
 */
export function tageZwischen(vonIso: string | null, bisIso: string | null): number | null {
  if (!vonIso || !bisIso) return null;
  const von = Date.parse(vonIso);
  const bis = Date.parse(bisIso);
  if (Number.isNaN(von) || Number.isNaN(bis)) return null;
  const tage = Math.round((bis - von) / MILLISEKUNDEN_PRO_TAG);
  return tage < 0 ? null : tage;
}
