"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ThemeToggle() {
  // resolvedTheme statt theme: theme trägt bei der Einstellung "system" genau
  // diesen Wert, nicht hell oder dunkel. Der Vergleich träfe dann nie zu, und
  // der erste Klick berechnete das falsche Ziel, wechselte also nichts
  // sichtbar. resolvedTheme trägt immer den tatsächlich angezeigten Wert.
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("ThemeToggle");
  // resolvedTheme steht serverseitig noch nicht fest, next-themes liest den
  // Systemwert erst im Browser aus, und weicht dort schon beim allerersten
  // Client-Render vom Server ab. Bis zum Mounten einen neutralen Titel
  // zeigen, sonst meldet React eine Hydration-Abweichung am title-Attribut.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title={mounted ? (resolvedTheme === "dark" ? t("switchToLight") : t("switchToDark")) : t("toggleTheme")}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t("toggleTheme")}</span>
    </Button>
  );
}
