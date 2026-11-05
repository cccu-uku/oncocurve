import AppShell from "@/components/app-shell";
import { routing } from "@/i18n/routing";
import { ladeBetreiber, logoVorhanden, type Betreiber } from "@/lib/betreiber";
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
    const angaben = (await ladeBetreiber())?.logo;
    // Ohne Logodatei bleibt die Kopfzeile ohne Logo; das Impressum ist davon unberührt.
    if (angaben && (await logoVorhanden(angaben.datei))) logo = angaben;
  } catch (fehler) {
    console.error("[oncocurve] Betreiberangaben oder Logo nicht lesbar, Kopfzeile ohne Logo:", (fehler as Error).message);
  }

  return <AppShell locale={locale} logo={logo}>{children}</AppShell>;
}
