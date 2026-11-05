"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/lib/config";
import { LOGO_PFAD } from "@/lib/sicherheits-header";
import { Locale } from "@/types/internal";
import type { Betreiber } from "@/lib/betreiber";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import LocaleSwitcher from "./locale-switcher";
import ThemeToggle from "./theme-toggle";

interface HeaderProps {
  locale: Locale;
  logo: Betreiber["logo"] | null;
}

const Header = ({ locale, logo }: HeaderProps) => {
  const tHeader = useTranslations("Header");
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-card">
      <div className="mx-auto flex h-full items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="flex min-w-0 items-center gap-2" onClick={() => router.push(ROUTES.home)}>
              <Image
                src="/oncocurve-logo.svg"
                alt={tHeader("logoAlt")}
                width={40}
                height={40}
                className="h-8 w-8 shrink-0 drop-shadow-[0_4px_20px_rgba(0,0,0,0.05)] sm:h-10 sm:w-10"
                priority
              />
              <div className="flex min-w-0 flex-col items-start">
                <span className="max-w-[40vw] truncate text-base font-semibold text-primary sm:max-w-none sm:text-lg">
                  {tHeader("brandName")}
                </span>
                <span className="hidden truncate text-xs text-muted-foreground sm:block">{tHeader("appName")}</span>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" />
            {tHeader("backToMain")}
          </TooltipContent>
        </Tooltip>

        <div className="flex shrink-0 items-center gap-4">
          {logo && <Image src={LOGO_PFAD} alt={logo.alt[locale]} width={logo.breite} height={logo.hoehe} className="shrink-0" priority unoptimized />}
          <span data-tour="theme" className="inline-flex"><ThemeToggle /></span>
          <span data-tour="lang" className="inline-flex"><LocaleSwitcher locale={locale} /></span>
          <Link href={ROUTES.help} data-tour="help-icon">
            <Button variant="outline" size="icon" title={tHeader("help")} aria-label={tHeader("help")}><CircleHelp className="h-[1.2rem] w-[1.2rem]" /></Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
