import { HtmlLangSetter } from "@/components/html-lang-setter";
import { routing } from "@/i18n/routing";
import { Locale } from "@/types/internal";
import { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeString } = await params;
  const locale = localeString as Locale;
  const t = await getTranslations();

  return {
    title: t("app.title"),
    description: t("app.description"),
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ),
    alternates: {
      canonical: `/${locale}`,
      languages: routing.locales.reduce(
        (acc, lang) => ({ ...acc, [lang]: `/${lang}` }),
        {}
      ),
    },
    openGraph: {
      title: t("app.title"),
      siteName: t("app.title"),
      description: t("app.description"),
      locale,
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeString } = await params;
  const locale = localeString as Locale;

  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSetter />
      {children}
    </NextIntlClientProvider>
  );
}
