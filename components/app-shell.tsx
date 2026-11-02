"use client";

import Header from "@/components/header";
import { Link } from "@/i18n/navigation";
import { Locale } from "@/types/internal";
import type { Betreiber } from "@/lib/betreiber";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { loadPlotDisplay } from "@/components/kaplan-meier/plot-display-config";
import { wendeScreenshotModusAn } from "@/components/kaplan-meier/screenshot-modus";

interface AppShellProps {
  children: React.ReactNode;
  locale: Locale;
  logo: Betreiber["logo"] | null;
}

export default function AppShell({ children, locale, logo }: AppShellProps) {
  const t = useTranslations("Footer");

  // Der Screenshot-Modus wird auf der Ergebnisseite geschaltet, soll nach
  // einem Neuladen aber auch auf der Upload-Seite gelten.
  useEffect(() => {
    wendeScreenshotModusAn(loadPlotDisplay().screenshotMode);
  }, []);

  return (
  <div className="flex flex-col min-h-screen pt-14">
    <Header locale={locale} logo={logo} />

    <div className="screenshot-bereich flex-grow w-full">
      {children}
    </div>

    <footer className="border-t border-border py-3 text-center text-sm text-muted-foreground">
      <Link href="/impressum" className="underline hover:no-underline">
        {t("imprint")}
      </Link>
      <span className="mx-2">·</span>
      <Link href="/datenschutz" className="underline hover:no-underline">
        {t("privacy")}
      </Link>
    </footer>
  </div>
);
}
