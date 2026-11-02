import { Providers } from "@/components/providers";
import localFont from "next/font/local";
import "@/styles/globals.css";

// Die Schriftdatei liegt im Projekt, nicht bei einem Anbieter. Das ist keine
// Feinheit: next/font/google lädt die Datei beim Build von Google herunter,
// und ohne Netz läuft der Entwicklungsserver dabei in einen Timeout. Diese
// Anwendung muss vollständig ohne Verbindung nach aussen laufen, sowohl zur
// Laufzeit als auch beim Bauen.
//
// Inter ist für Bildschirme gezeichnet und führt tabellarische Ziffern, die
// für die spaltenweise ausgerichteten Zahlen dieser Anwendung gebraucht
// werden. Die variable Fassung deckt alle Schnitte in einer Datei ab, deshalb
// genügt ein einziger Ladevorgang für die ganze Typskala.
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
  // Ohne Schriftdatei greift diese Kette. Sie ist bewusst so gewählt, dass
  // die Zeilenhöhen nicht springen, falls die Datei einmal fehlt.
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
