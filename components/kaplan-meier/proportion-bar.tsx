"use client";

import { useTranslations } from "next-intl";
import { textfarbeAuf } from "./kontrast-text";

export interface ProportionDatum {
  name: string;
  value: number;
  color: string;
}

interface ProportionBarProps {
  data: ProportionDatum[];
}

/**
 * Ab diesem Anteil steht der Name im Balken, darunter rechts daneben. Die
 * Grenze liegt so, dass der Name im zweiten Fall noch drei Viertel der Spur
 * für sich hat und nicht an der Zahlenspalte anstösst.
 */
const BESCHRIFTBAR_AB = 0.25;

/**
 * Der Kohortenanteil als eine Zeile je Gruppe, jeder Balken an derselben
 * Kante beginnend.
 *
 * Vorher eine Torte, dann ein gestapelter Balken. Beim Stapel liegt jedes
 * Segment an einer anderen Stelle, sodass zwei mittelgrosse Gruppen nur über
 * ihre Breite zu vergleichen sind; ausserdem musste die Karte zwei Spalten
 * breit sein, damit die Beschriftungen hineinpassten, und stand darunter
 * halb leer. Gleiche Startkante heisst: die Länge allein trägt den Vergleich.
 */
export default function ProportionBar({ data }: ProportionBarProps) {
  const tr = useTranslations("Results");
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
        {tr("pie.noData")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      {data.map((d) => {
        const anteil = d.value / total;
        const breite = `${anteil * 100}%`;
        const prozent = `${(anteil * 100).toFixed(1)}%`;
        const innen = anteil >= BESCHRIFTBAR_AB;
        return (
          <div key={d.name} className="flex items-center gap-3" title={`${d.name}: ${tr("patientCount", { count: d.value })} (${prozent})`}>
            <div className="relative h-7 min-w-0 flex-1 rounded bg-muted">
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: breite, backgroundColor: d.color }} />
              <span
                className="absolute inset-y-0 flex items-center truncate px-2 text-xs font-medium"
                style={
                  innen
                    ? { left: 0, width: breite, color: textfarbeAuf(d.color) }
                    : { left: breite, right: 0 }
                }
              >
                {d.name}
              </span>
            </div>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {d.value} ({prozent})
            </span>
          </div>
        );
      })}
    </div>
  );
}
