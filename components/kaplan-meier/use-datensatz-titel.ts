"use client";

import { useEffect, useState } from "react";
import { datensatzTitel, type DatensatzTitel } from "./datensatz-titel";

/**
 * Liest die Angaben zur Quelldatei aus der Sitzung. Erst nach dem Einhängen,
 * weil sessionStorage beim Rendern auf dem Server nicht existiert und ein
 * abweichender erster Durchgang sonst eine Hydrationswarnung auslöst.
 */
export function useDatensatzTitel(): DatensatzTitel | null {
  const [titel, setTitel] = useState<DatensatzTitel | null>(null);

  useEffect(() => {
    try {
      const roh = sessionStorage.getItem("km-file-meta");
      setTitel(datensatzTitel(roh ? JSON.parse(roh) : null));
    } catch {
      setTitel(null);
    }
  }, []);

  return titel;
}
