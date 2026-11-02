"use client";

import { Locale } from "@/types/internal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui";
import React from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

const FLAG_SRCS: Record<Locale, string> = {
  de: "/flags/de.svg",
  en: "/flags/en.svg",
};

export interface LocaleSwitcherProps {
  locale: Locale;
}

export default function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const t = useTranslations("LocaleSwitcher");

  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: Locale) => {
    // Remove the current locale prefix from pathname
    const pathnameWithoutLocale = pathname.replace(/^\/(de|en)/, '') || '/';
    router.replace(pathnameWithoutLocale, { locale: newLocale });
  };

  const getLanguageName = (value: Locale) => {
    return value === "de" ? t("language.de") : t("language.en");
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px] background foreground" aria-label={t("switchLanguage")}>
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FLAG_SRCS[locale ?? "de"]} alt={locale ?? "de"} width={20} className="rounded-sm h-auto" />
          <span>{getLanguageName(locale ?? "de")}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="de">
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FLAG_SRCS["de"]} alt="de" width={20} className="rounded-sm h-auto" />
            {t("language.de")}
          </span>
        </SelectItem>
        <SelectItem value="en">
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FLAG_SRCS["en"]} alt="en" width={20} className="rounded-sm h-auto" />
            {t("language.en")}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
