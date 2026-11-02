import AppShell from "@/components/app-shell";
import { routing } from "@/i18n/routing";
import { ladeBetreiber, type Betreiber } from "@/lib/betreiber";
import { Locale } from "@/types/internal";
import { notFound } from "next/navigation";

// Betreiberangaben (Logo) werden zur Laufzeit gelesen, nicht beim Build.
export const dynamic = "force-dynamic";

interface RootParams {
  locale: string; // kommt als string
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<RootParams>;
}

// Type Guard, um TS zu überzeugen
function isLocale(locale: string): locale is Locale {
  return (routing.locales as unknown as string[]).includes(locale);
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  let logo: Betreiber["logo"] | null = null;
  try {
    logo = (await ladeBetreiber())?.logo ?? null;
  } catch (fehler) {
    console.error("[oncocurve] Betreiberangaben nicht lesbar, Kopfzeile ohne Logo:", (fehler as Error).message);
  }

  return <AppShell locale={locale} logo={logo}>{children}</AppShell>;
}
