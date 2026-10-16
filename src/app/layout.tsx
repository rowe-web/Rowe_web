import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { DEFAULT_OG } from "@/lib/seo";
import { allowIndexing, siteUrl } from "@/lib/site";
import "./globals.css";

// Fuentes autoalojadas por next/font: no se hace ninguna petición a Google desde el navegador (RGPD).
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const description =
  "Estudio boutique de web y audiovisual para empresas y negocios que quieren verse profesionales en internet y conseguir más clientes.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ROWE — Estudio de web y audiovisual", template: "%s — ROWE" },
  description,
  applicationName: "ROWE",
  // Mientras no haya dominio definitivo: noindex. Se activa con NEXT_PUBLIC_ALLOW_INDEXING=true.
  robots: allowIndexing
    ? { index: true, follow: true }
    : { index: false, follow: false, googleBot: { index: false, follow: false } },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "ROWE",
    title: "ROWE — Estudio de web y audiovisual",
    description,
    url: "/",
    images: [DEFAULT_OG],
  },
  twitter: { card: "summary_large_image", title: "ROWE — Estudio de web y audiovisual", description, images: [DEFAULT_OG.url] },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
